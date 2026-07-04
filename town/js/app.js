// =====================================================================
// app.js  ─  メインエントリ・全モジュールのワイヤリング
// =====================================================================

const TARGET_SRC = 'assets/targets.mind';
const APP_VERSION = 'v8';
const BUILD_NUM   = 4; // プッシュごとに +1 する

let _targetFound    = false;
let _pendingLocalPos = null; // 配置ピンの AR 座標

// ── 配置ピン表示 / リセット ───────────────────────────────────────
function _showPlacementPin(screenX, screenY, localPos) {
  _pendingLocalPos = localPos;
  showArPin(localPos); // AR空間にピンを追加（地図と一緒に動く）
  document.getElementById('placement-confirm-btn').classList.remove('hidden');
  document.getElementById('placement-guide-text').textContent = 'タップで場所を変更できます';
}

function _resetPlacementPin() {
  _pendingLocalPos = null;
  hideArPin();
  document.getElementById('placement-confirm-btn').classList.add('hidden');
  document.getElementById('placement-guide-text').textContent = '地図をタップして場所を選んでください';
}

async function main() {
  const container = document.getElementById('ar-container');

  // ── ライブラリ・スクリプト読み込み確認 ───────────────────────
  var checks = [
    ['THREE',    typeof THREE    !== 'undefined'],
    ['MINDAR',   typeof window.MINDAR !== 'undefined' && !!window.MINDAR.IMAGE],
    ['initAR',   typeof initAR   === 'function'],
    ['addChekiMesh', typeof addChekiMesh === 'function'],
    ['getUserCards', typeof getUserCards === 'function'],
  ];
  var failed = checks.filter(function(c){ return !c[1]; });
  if (failed.length > 0) {
    var names = failed.map(function(c){ return c[0]; }).join(', ');
    _showFallback('スクリプト読み込みエラー ' + APP_VERSION,
      '未定義: ' + names + '\n\nページを完全に再読み込みしてください\n（Safari: アドレスバーを引っ張って更新）');
    return;
  }

  // ── AR 初期化 ─────────────────────────────────────────────────
  try {
    await initAR(container, TARGET_SRC, _onTargetFound, _onTargetLost);
  } catch (err) {
    console.error('[AR] init failed:', err);
    _showFallback('カメラの初期化に失敗しました ' + APP_VERSION, '【エラー詳細】\n' + String(err));
    return;
  }

  // ── プリセット + ユーザーカードを読み込んでメッシュ生成 ────────
  const userCards = await loadUserCardsFromFirestore();
  const allCards  = [...PRESET_CARDS, ...userCards];
  const positions = computeCardPositions(allCards);

  // プリセットは同期追加（キャンバスが確定しているため）
  for (const card of PRESET_CARDS) {
    const pos = positions[card.id];
    if (pos) addChekiMesh(card, pos);
  }

  // ユーザーカードは非同期（写真読み込みがある可能性）
  for (const card of userCards) {
    const pos = positions[card.id];
    if (pos) await addChekiMeshAsync(card, pos);
  }

  // ── インタラクション初期化 ─────────────────────────────────────
  // MindAR が生成した canvas にイベントをアタッチ
  const arCanvas = container.querySelector('canvas');
  initInteraction(arCanvas, getCamera(), getAnchor());

  setOnCardClick(card => showChekiModal(card));

  setOnMoveStateChange(hasMoved => {
    document.getElementById('reset-btn').classList.toggle('hidden', !hasMoved);
  });

  // ── モーダル初期化 ────────────────────────────────────────────
  initModal(
    // onDelete
    card => {
      deleteUserCard(card.id);
      removeChekiMesh(card.id);
    },
    // onEdit
    card => showEditForm(card),
  );

  // ── 編集フォーム ─────────────────────────────────────────────
  initEditForm(updatedCard => {
    // テクスチャを再描画して Three.js メッシュに反映
    const mesh = getChekiMeshes().get(updatedCard.id);
    if (mesh) {
      mesh.userData.card = updatedCard;
      refreshChekiTexture(mesh, updatedCard);
    }
  });

  // ── 思い出フォーム ────────────────────────────────────────────
  initMemoryForm(pendingCard => {
    // フォーム送信後 → 配置モードへ（前回ピンをリセット）
    _resetPlacementPin();
    enterPlacementMode(pendingCard, async placedCard => {
      // 配置確定後にメッシュを追加
      const pos = {
        x:        placedCard.position.x,
        y:        placedCard.position.y,
        z:        placedCard.position.z,
        rotation: placedCard.rotation,
      };
      await addChekiMeshAsync(placedCard, pos);
    });
  });

  // ── ボタン ───────────────────────────────────────────────────
  document.getElementById('reset-btn').addEventListener('click', resetAllCards);

  document.getElementById('add-memory-btn').addEventListener('click', () => {
    if (!_targetFound) {
      alert('まず地図にカメラをかざしてください');
      return;
    }
    showMemoryForm();
  });

  document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = '../';
  });

  // キャンセル（pointerdown で確実に反応、overlay への伝播を止める）
  document.getElementById('placement-cancel-btn').addEventListener('pointerdown', e => {
    e.stopPropagation();
    exitPlacementMode();
    _resetPlacementPin();
  });

  // ここにする！（pointerdown で確実に反応、overlay への伝播を止める）
  document.getElementById('placement-confirm-btn').addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (!_pendingLocalPos) return;
    confirmPlacement(_pendingLocalPos);
    _resetPlacementPin();
  });

  // 配置モード中のタップ → ピンを表示
  // click は iOS 透明要素で発火しない場合があるため pointerdown を使う
  document.getElementById('placement-overlay').addEventListener('pointerdown', e => {
    if (!isPlacementMode()) return;
    if (e.target.closest('button')) return; // ボタン類はそちらに任せる

    if (!_targetFound) {
      const guide = document.getElementById('placement-guide-text');
      guide.textContent = '⚠️ 地図にカメラをかざしてください';
      setTimeout(() => { guide.textContent = '地図をタップして場所を選んでください'; }, 2000);
      return;
    }

    const localPos = screenToAnchorLocal(e);
    if (!localPos) return;
    _showPlacementPin(e.clientX, e.clientY, localPos);
  });

  // ── AR 開始 ──────────────────────────────────────────────────
  try {
    await startAR();
  } catch (err) {
    console.error('[AR] start failed:', err);
    _showFallback('カメラを起動できませんでした', '【エラー詳細】\n' + String(err));
  }
}

// ── ターゲット検出 / 消失コールバック ─────────────────────────────
function _onTargetFound() {
  _targetFound = true;
  document.getElementById('scan-guide').classList.add('hidden');
}

function _onTargetLost() {
  _targetFound = false;
  document.getElementById('scan-guide').classList.remove('hidden');
}

// ── フォールバック表示 ───────────────────────────────────────────
function _showFallback(title, hint) {
  const guide = document.getElementById('scan-guide');
  guide.classList.remove('hidden');
  guide.querySelector('#scan-icon').textContent = '⚠️';
  guide.querySelector('p').textContent          = title;
  guide.querySelector('.hint').textContent      = hint;
}

// ── 起動 ─────────────────────────────────────────────────────────
// スプラッシュのボタンタップ（ユーザージェスチャー）後に AR を開始する
// モバイルブラウザはユーザー操作なしのカメラ起動を拒否するため
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('splash-sub').textContent = 'AR MAP · No.' + BUILD_NUM;

  document.getElementById('splash-btn').addEventListener('click', async () => {
    document.getElementById('splash').classList.add('hidden');
    await main();
  });
});
