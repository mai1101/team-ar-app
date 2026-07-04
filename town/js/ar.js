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

  var w = window.innerWidth;
  var h = window.innerHeight;

  // MindAR 内部の背景メッシュ（VideoTexture）を非表示にし、
  // DOM の <video> 要素を object-fit:cover で全画面に直接表示する。
  // これにより横長カメラ映像の左寄り問題を回避する。
  _arScene.traverse(function(obj) {
    if (obj.isMesh && obj.material && obj.material.map) {
      var img = obj.material.map.image;
      if (img && img.nodeName === 'VIDEO') {
        obj.visible = false;
      }
    }
  });

  // Three.js キャンバスを透過（ARオブジェクトのみ描画）
  _arRenderer.setClearColor(0x000000, 0);
  _arRenderer.setSize(w, h);

  // DOM video を全画面カバーとして配置
  var video = _arContainer.querySelector('video');
  if (video) {
    video.style.position   = 'absolute';
    video.style.top        = '0';
    video.style.left       = '0';
    video.style.width      = '100%';
    video.style.height     = '100%';
    video.style.objectFit  = 'cover';
    video.style.zIndex     = '0';
  }
  // Three.js canvas を video の上に重ねる
  _arRenderer.domElement.style.position = 'absolute';
  _arRenderer.domElement.style.top      = '0';
  _arRenderer.domElement.style.left     = '0';
  _arRenderer.domElement.style.width    = w + 'px';
  _arRenderer.domElement.style.height   = h + 'px';
  _arRenderer.domElement.style.zIndex   = '1';

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

// ── 配置ピン（AR空間）────────────────────────────────────────────
var _arPinMesh = null;

function showArPin(localPos) {
  hideArPin();

  var canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  var ctx = canvas.getContext('2d');
  // 外枠の円
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#f5ead0';
  ctx.fill();
  ctx.strokeStyle = '#3d2b1f';
  ctx.lineWidth = 5;
  ctx.stroke();
  // 中心の十字（チェキの真ん中を示す）
  ctx.beginPath();
  ctx.moveTo(32, 14); ctx.lineTo(32, 50);
  ctx.moveTo(14, 32); ctx.lineTo(50, 32);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#3d2b1f';
  ctx.stroke();

  var texture = new THREE.CanvasTexture(canvas);
  var geo = new THREE.PlaneGeometry(0.07, 0.07);
  var mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
  _arPinMesh = new THREE.Mesh(geo, mat);
  _arPinMesh.position.set(localPos.x, localPos.y, 0.016);
  _arPinMesh.renderOrder = 999;
  _arAnchor.group.add(_arPinMesh);
}

function hideArPin() {
  if (!_arPinMesh) return;
  _arAnchor.group.remove(_arPinMesh);
  _arPinMesh.geometry.dispose();
  if (_arPinMesh.material.map) _arPinMesh.material.map.dispose();
  _arPinMesh.material.dispose();
  _arPinMesh = null;
}

// ── アクセサ ─────────────────────────────────────────────────────
function getChekiMeshes() { return _arMeshMap; }
function getAnchor()      { return _arAnchor;  }
function getCamera()      { return _arCamera;  }
function getRenderer()    { return _arRenderer; }
