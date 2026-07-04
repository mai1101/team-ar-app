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

// interaction.js と変数名が衝突しないよう _ar プレフィックスを使用
var _arMindar    = null;
var _arAnchor    = null;
var _arRenderer  = null;
var _arScene     = null;
var _arCamera    = null;
var _arRunning   = false;
var _arMeshMap   = new Map(); // card.id → THREE.Mesh
var _arContainer = null;      // コンテナ参照（startAR でリサイズに使用）

// ── 初期化 ───────────────────────────────────────────────────────
async function initAR(containerEl, targetSrc, onFound, onLost) {
  _arContainer = containerEl;
  _arMindar = new window.MINDAR.IMAGE.MindARThree({
    container:       containerEl,
    imageTargetSrc:  targetSrc,
    maxTrack:        1,
    filterMinCF:     0.001,
    filterBeta:      1000,
    missTolerance:   25,
  });

  _arRenderer = _arMindar.renderer;
  _arScene    = _arMindar.scene;
  _arCamera   = _arMindar.camera;

  _arAnchor = _arMindar.addAnchor(0);
  _arAnchor.onTargetFound = function() { onFound && onFound(); };
  _arAnchor.onTargetLost  = function() { onLost  && onLost();  };
}

// ── AR 開始 ───────────────────────────────────────────────────────
async function startAR() {
  if (_arRunning) return;
  await _arMindar.start();
  _arRunning = true;

  // MindAR は start() 後にレンダラーサイズを内部で固定するため、
  // コンテナの実サイズで上書きして黒帯を防ぐ
  var w = _arContainer.clientWidth  || window.innerWidth;
  var h = _arContainer.clientHeight || window.innerHeight;
  _arRenderer.setSize(w, h);

  _arRenderer.setAnimationLoop(function() { _arRenderer.render(_arScene, _arCamera); });
}

// ── AR 停止 ───────────────────────────────────────────────────────
function stopAR() {
  if (!_arRunning) return;
  _arMindar.stop();
  _arRenderer.setAnimationLoop(null);
  _arRunning = false;
}

// ── チェキメッシュの追加（同期・プリセット用）────────────────────
function addChekiMesh(card, pos) {
  var canvas  = createChekiCanvas(card);
  var texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  var mesh = _arMakeMesh(texture, pos);
  mesh.userData = {
    card: card,
    originalPosition: { x: pos.x, y: pos.y, z: pos.z },
    originalRotation: pos.rotation,
    hasMoved: false,
  };

  _arAnchor.group.add(mesh);
  _arMeshMap.set(card.id, mesh);
  return mesh;
}

// ── チェキメッシュの追加（非同期・ユーザー写真対応）─────────────
async function addChekiMeshAsync(card, pos) {
  var canvas  = await createChekiCanvasAsync(card);
  var texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  var mesh = _arMakeMesh(texture, pos);
  mesh.userData = {
    card: card,
    originalPosition: { x: pos.x, y: pos.y, z: pos.z },
    originalRotation: pos.rotation,
    hasMoved: false,
  };

  _arAnchor.group.add(mesh);
  _arMeshMap.set(card.id, mesh);
  return mesh;
}

function _arMakeMesh(texture, pos) {
  var geo  = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
  var mat  = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos.x, pos.y, pos.z !== undefined ? pos.z : 0);
  mesh.rotation.z = pos.rotation !== undefined ? pos.rotation : 0;
  return mesh;
}

// ── チェキメッシュの削除 ─────────────────────────────────────────
function removeChekiMesh(cardId) {
  var mesh = _arMeshMap.get(cardId);
  if (!mesh) return;
  _arAnchor.group.remove(mesh);
  mesh.geometry.dispose();
  if (mesh.material.map) mesh.material.map.dispose();
  mesh.material.dispose();
  _arMeshMap.delete(cardId);
}

// ── 全メッシュの表示 / 非表示 ────────────────────────────────────
function setMeshesVisible(visible) {
  _arMeshMap.forEach(function(m) { m.visible = visible; });
}

// ── アクセサ ─────────────────────────────────────────────────────
function getChekiMeshes() { return _arMeshMap; }
function getAnchor()      { return _arAnchor;  }
function getCamera()      { return _arCamera;  }
function getRenderer()    { return _arRenderer; }
