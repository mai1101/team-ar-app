// =====================================================================
// memory.js  ─  ユーザー投稿チェキの保存・フォームUI・配置モード
// =====================================================================

const STORAGE_KEY = 'ashiato_user_cards_v1';
const _cottageId  = new URLSearchParams(window.location.search).get('cottage') || '07';

// ── 写真をリサイズして Firestore に入る大きさにする ─────────────────
function _resizePhoto(dataUrl, maxW, maxH) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const ratio  = Math.min(maxW / img.width, maxH / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// ── 写真を Firestore の Bytes型 に変換する ──────────────────────────
async function photoToFirestoreBytes(dataUrl) {
  const resized  = await _resizePhoto(dataUrl, 200, 168);
  const response = await fetch(resized);
  const arrayBuf = await response.arrayBuffer();
  const uint8    = new Uint8Array(arrayBuf);
  return firebase.firestore.Blob.fromUint8Array(uint8);
}

// ── Firestore からチェキ一覧を取得（起動時に呼ぶ） ──────────────────
async function loadUserCardsFromFirestore() {
  try {
    const snapshot = await db.collection('spots')
      .where('cottageId', '==', _cottageId)
      .orderBy('createdAt', 'asc')
      .get();
    const cards = snapshot.docs.map(doc => {
      const d = doc.data();
      if (d.photoBytes) {
        d.photoDataUrl = 'data:image/jpeg;base64,' + d.photoBytes.toBase64();
        delete d.photoBytes;
      }
      return { ...d, id: doc.id };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return cards;
  } catch (err) {
    console.error('[Firestore] 読み込みエラー:', err);
    // Firestore が使えないときは localStorage にフォールバック
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
}

// ── localStorage CRUD（ローカルキャッシュとして残す） ──────────────
function getUserCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

async function saveUserCard(card) {
  // localStorage に即時反映（表示をブロックしない）
  const cards = getUserCards();
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx >= 0) cards[idx] = card; else cards.push(card);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));

  // Firestore に保存（写真はリサイズして容量を抑える）
  try {
    const data = { ...card, cottageId: _cottageId };
    if (card.photoDataUrl) {
      data.photoBytes = await photoToFirestoreBytes(card.photoDataUrl);
      delete data.photoDataUrl;   
    }
    await db.collection('spots').doc(card.id).set(data);
  } catch (err) {
    console.error('[Firestore] 保存エラー:', err);
  }
}

function deleteUserCard(id) {
  const cards = getUserCards().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  db.collection('spots').doc(id).delete()
    .catch(err => console.error('[Firestore] 削除エラー:', err));
}

function updateUserCardComment(id, newComment) {
  const cards = getUserCards();
  const idx   = cards.findIndex(c => c.id === id);
  if (idx < 0) return null;
  cards[idx].comment = newComment;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  db.collection('spots').doc(id).update({ comment: newComment })
    .catch(err => console.error('[Firestore] 更新エラー:', err));
  return cards[idx];
}

// ── 思い出フォーム ────────────────────────────────────────────────
let _pendingCard     = null;
let _onPlacementReady = null; // フォーム送信後に配置モードを開始するコールバック

function initMemoryForm(onPlacementReady) {
  _onPlacementReady = onPlacementReady;

  const photoInput   = document.getElementById('photo-input');
  const photoPreview = document.getElementById('photo-preview');
  const photoLabel   = document.getElementById('photo-label-text');

  // 写真選択
  photoInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      photoPreview.src = ev.target.result;
      photoPreview.classList.remove('hidden');
      photoLabel.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  // キャンセル
  document.getElementById('form-cancel-btn').addEventListener('click', hideMemoryForm);
  document.getElementById('form-backdrop').addEventListener('click', hideMemoryForm);

  // 送信 → 配置モードへ
  document.getElementById('form-submit-btn').addEventListener('click', () => {
    const comment = document.getElementById('comment-input').value.trim();
    if (!comment) {
      alert('一言メモを入力してください');
      return;
    }

    const photoPreviewEl = document.getElementById('photo-preview');
    const photoDataUrl   = photoPreviewEl.classList.contains('hidden')
      ? null
      : photoPreviewEl.src;

    _pendingCard = {
      id:           `user-${Date.now()}`,
      spot:         null,
      comment,
      author:       'あなた・たった今',
      photoDataUrl,
      colors:       ['#c8a882', '#e8d5b8'],
      icon:         photoDataUrl ? null : 'user-default',
      isPreset:     false,
      createdAt:    Date.now(),
      position:     null,
      rotation:     (Math.random() - 0.5) * 0.28,
    };

    hideMemoryForm();
    _onPlacementReady && _onPlacementReady(_pendingCard);
  });
}

function showMemoryForm() {
  // フォームをリセット
  document.getElementById('comment-input').value = '';
  document.getElementById('photo-input').value   = '';
  const prev = document.getElementById('photo-preview');
  prev.src = '';
  prev.classList.add('hidden');
  document.getElementById('photo-label-text').style.display = '';
  _pendingCard = null;

  document.getElementById('memory-form-modal').classList.remove('hidden');
}

function hideMemoryForm() {
  document.getElementById('memory-form-modal').classList.add('hidden');
}

// ── 編集フォーム ─────────────────────────────────────────────────
let _editingCard   = null;
let _onEditSaved   = null;

function initEditForm(onEditSaved) {
  _onEditSaved = onEditSaved;

  document.getElementById('edit-cancel-btn').addEventListener('click', hideEditForm);
  document.getElementById('edit-backdrop').addEventListener('click',   hideEditForm);

  document.getElementById('edit-submit-btn').addEventListener('click', () => {
    if (!_editingCard) return;
    const newComment = document.getElementById('edit-comment-input').value.trim();
    if (!newComment) { alert('コメントを入力してください'); return; }

    const updated = updateUserCardComment(_editingCard.id, newComment);
    if (updated) {
      _onEditSaved && _onEditSaved(updated);
    }
    hideEditForm();
  });
}

function showEditForm(card) {
  _editingCard = card;
  document.getElementById('edit-comment-input').value = card.comment;
  document.getElementById('edit-form-modal').classList.remove('hidden');
}

function hideEditForm() {
  document.getElementById('edit-form-modal').classList.add('hidden');
  _editingCard = null;
}

// ── 配置モード ────────────────────────────────────────────────────
let _isPlacementMode  = false;
let _onPlaced         = null; // (card, localPos) => void

function enterPlacementMode(card, onPlaced) {
  _isPlacementMode = true;
  _pendingCard     = card;
  _onPlaced        = onPlaced;

  // 既存チェキを非表示にして配置に集中させる
  setMeshesVisible(false);
  document.getElementById('placement-overlay').classList.remove('hidden');
}

function exitPlacementMode() {
  _isPlacementMode = false;
  _pendingCard     = null;
  _onPlaced        = null;
  setMeshesVisible(true);
  document.getElementById('placement-overlay').classList.add('hidden');
}

function isPlacementMode() { return _isPlacementMode; }
function getPendingCard()   { return _pendingCard; }

// app.js から呼ばれる：タップ位置が確定したときに実行
function confirmPlacement(localPos) {
  if (!_pendingCard) return;

  _pendingCard.position = { x: localPos.x, y: localPos.y, z: 0.015 };
  _pendingCard.spot     = '__manual__';

  const card = { ..._pendingCard };
  exitPlacementMode();
  _onPlaced && _onPlaced(card); // 即座に描画

  // localStorage + Firestore へは裏で保存
  saveUserCard(card).catch(err => console.error('[Firestore] 保存エラー:', err));
}
