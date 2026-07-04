// =====================================================================
// ar.js  ─  MindAR + Three.js シーン管理
// =====================================================================
//
// ■ targets.mind の生成手順
// ─────────────────────────────────────────────────────────────────
// 1. https://hiukim.github.io/mind-ar-js-doc/tools/compile にアクセス
// 2. 観光イラストマップ画像（JPG/PNG, 推奨 1000px 以上）をアップロード
// 3. [Start] ボタンをクリックして処理が完了するまで待つ
//    ※ 特徴点が少ない（空白が多い）画像は認識精度が低下します
// 4. [Export] → targets.mind をダウンロード
// 5. このプロジェクトの assets/ フォルダに配置
//
// ■ 動作確認は HTTPS or localhost 上で行ってください
//    iOS Safari は HTTP だとカメラアクセスを拒否します
// ─────────────────────────────────────────────────────────────────

let _mindarThree  = null;
let _anchor       = null;
let _renderer     = null;
let _scene        = null;
let _camera       = null;
let _isRunning    = false;

const _meshMap = new Map(); // card.id → THREE.Mesh

// ── 初期化 ───────────────────────────────────────────────────────
async function initAR(containerEl, targetSrc, onFound, onLost) {
  _mindarThree = new window.MINDAR.IMAGE.MindARThree({
    container:       containerEl,
    imageTargetSrc:  targetSrc,
    maxTrack:        1,
    filterMinCF:     0.001,   // 追跡フィルタ（低すぎると遅延増）
    filterBeta:      1000,    // スムージング強度
    missTolerance:   8,       // 見失いを何フレーム許容するか
  });

  ({ renderer: _renderer, scene: _scene, camera: _camera } = _mindarThree);

  // アンカー（ターゲット 0 番 ＝ 地図の画像）
  _anchor = _mindarThree.addAnchor(0);
  _anchor.onTargetFound = () => { onFound && onFound(); };
  _anchor.onTargetLost  = () => { onLost  && onLost();  };

  return {
    renderer: _renderer,
    scene:    _scene,
    camera:   _camera,
    anchor:   _anchor,
  };
}

// ── AR 開始 ───────────────────────────────────────────────────────
async function startAR() {
  if (_isRunning) return;
  await _mindarThree.start();
  _isRunning = true;
  _renderer.setAnimationLoop(() => _renderer.render(_scene, _camera));
}

// ── AR 停止 ───────────────────────────────────────────────────────
function stopAR() {
  if (!_isRunning) return;
  _mindarThree.stop();
  _renderer.setAnimationLoop(null);
  _isRunning = false;
}

// ── チェキメッシュの追加（同期・プリセット用）────────────────────
function addChekiMesh(card, pos) {
  const canvas  = createChekiCanvas(card);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const mesh = _makeMesh(texture, pos);
  mesh.userData = {
    card,
    originalPosition: { x: pos.x, y: pos.y, z: pos.z },
    originalRotation: pos.rotation,
    hasMoved: false,
  };

  _anchor.group.add(mesh);
  _meshMap.set(card.id, mesh);
  return mesh;
}

// ── チェキメッシュの追加（非同期・ユーザー写真対応）─────────────
async function addChekiMeshAsync(card, pos) {
  const canvas  = await createChekiCanvasAsync(card);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const mesh = _makeMesh(texture, pos);
  mesh.userData = {
    card,
    originalPosition: { x: pos.x, y: pos.y, z: pos.z },
    originalRotation: pos.rotation,
    hasMoved: false,
  };

  _anchor.group.add(mesh);
  _meshMap.set(card.id, mesh);
  return mesh;
}

function _makeMesh(texture, pos) {
  const geo  = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
  const mat  = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos.x, pos.y, pos.z ?? 0);
  mesh.rotation.z = pos.rotation ?? 0;
  return mesh;
}

// ── チェキメッシュの削除 ─────────────────────────────────────────
function removeChekiMesh(cardId) {
  const mesh = _meshMap.get(cardId);
  if (!mesh) return;
  _anchor.group.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.map?.dispose();
  mesh.material.dispose();
  _meshMap.delete(cardId);
}

// ── 全メッシュの表示 / 非表示 ────────────────────────────────────
function setMeshesVisible(visible) {
  _meshMap.forEach(m => { m.visible = visible; });
}

// ── アクセサ ─────────────────────────────────────────────────────
function getChekiMeshes() { return _meshMap; }
function getAnchor()      { return _anchor;  }
function getCamera()      { return _camera;  }
function getRenderer()    { return _renderer; }
