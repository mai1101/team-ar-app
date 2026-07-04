// =====================================================================
// interaction.js  ─  クリック / ドラッグ / リセットアニメーション
// =====================================================================

let _raycaster = null;
let _camera    = null;
let _anchor    = null;
let _canvasEl  = null;

let _dragState = null;
const _movedIds = new Set();

let _onCardClick        = null;
let _onMoveStateChange  = null;

const DRAG_THRESHOLD_PX = 6;
const CLICK_TIME_MS     = 280;

// ── 初期化 ───────────────────────────────────────────────────────
function initInteraction(canvasEl, camera, anchor) {
  _raycaster = new THREE.Raycaster();
  _camera    = camera;
  _anchor    = anchor;
  _canvasEl  = canvasEl;

  canvasEl.addEventListener('pointerdown',   _onPointerDown,   { passive: false });
  canvasEl.addEventListener('pointermove',   _onPointerMove,   { passive: false });
  canvasEl.addEventListener('pointerup',     _onPointerUp,     { passive: false });
  canvasEl.addEventListener('pointercancel', _onPointerCancel, { passive: false });
}

// ── ポインターダウン ──────────────────────────────────────────────
function _onPointerDown(e) {
  e.preventDefault();

  const hit = _hitTest(e);
  if (!hit) return;

  // ドラッグ用の平面を anchor の前面（法線 = anchor の Z 軸）に設定
  const worldPos = new THREE.Vector3();
  hit.getWorldPosition(worldPos);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(_anchor.group.quaternion);
  const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, worldPos);

  _dragState = {
    mesh:           hit,
    startScreen:    { x: e.clientX, y: e.clientY },
    startTime:      performance.now(),
    startLocalPos:  hit.position.clone(),
    dragPlane,
    hasMoved:       false,
  };

  // タップ中のカードを最前面に
  hit.renderOrder = 999;
}

// ── ポインタームーブ ──────────────────────────────────────────────
function _onPointerMove(e) {
  if (!_dragState) return;
  e.preventDefault();

  const dx = e.clientX - _dragState.startScreen.x;
  const dy = e.clientY - _dragState.startScreen.y;
  if (!_dragState.hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

  _dragState.hasMoved = true;

  const ptr = _normalizedPointer(e);
  _raycaster.setFromCamera(ptr, _camera);

  const hit = new THREE.Vector3();
  if (_raycaster.ray.intersectPlane(_dragState.dragPlane, hit)) {
    const local = _anchor.group.worldToLocal(hit.clone());
    _dragState.mesh.position.set(local.x, local.y, _dragState.startLocalPos.z + 0.005);

    const id = _dragState.mesh.userData.card.id;
    if (!_movedIds.has(id)) {
      _movedIds.add(id);
      _dragState.mesh.userData.hasMoved = true;
      _onMoveStateChange && _onMoveStateChange(true);
    }
  }
}

// ── ポインターアップ ──────────────────────────────────────────────
function _onPointerUp(e) {
  if (!_dragState) return;
  e.preventDefault();

  const elapsed = performance.now() - _dragState.startTime;
  const isClick = !_dragState.hasMoved && elapsed < CLICK_TIME_MS;

  if (isClick) {
    _dragState.mesh.renderOrder = 0;
    _onCardClick && _onCardClick(_dragState.mesh.userData.card);
  }

  _dragState = null;
}

function _onPointerCancel() { _dragState = null; }

// ── レイキャスト ─────────────────────────────────────────────────
function _hitTest(e) {
  const ptr = _normalizedPointer(e);
  _raycaster.setFromCamera(ptr, _camera);

  const meshes = [...getChekiMeshes().values()].filter(m => m.visible);
  const hits   = _raycaster.intersectObjects(meshes);

  // renderOrder が高い（上に乗っているカード）を優先
  if (hits.length === 0) return null;
  hits.sort((a, b) => b.object.renderOrder - a.object.renderOrder);
  return hits[0].object;
}

function _normalizedPointer(e) {
  const rect = _canvasEl.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width)  *  2 - 1,
    ((e.clientY - rect.top)  / rect.height) * -2 + 1,
  );
}

// ── 全カードを元の位置にリセット ─────────────────────────────────
function resetAllCards() {
  let delay = 0;
  getChekiMeshes().forEach(mesh => {
    if (!mesh.userData.hasMoved) return;

    const { originalPosition: op, originalRotation: or_ } = mesh.userData;
    const target = new THREE.Vector3(op.x, op.y, op.z);

    setTimeout(() => {
      _animateTo(mesh, target, or_, 420);
    }, delay);

    delay += 55;
    mesh.userData.hasMoved = false;
    mesh.renderOrder = 0;
  });

  _movedIds.clear();
  _onMoveStateChange && _onMoveStateChange(false);
}

// ── イーズアウト cubic アニメーション ────────────────────────────
function _animateTo(mesh, targetPos, targetRot, duration) {
  const startPos = mesh.position.clone();
  const startRot = mesh.rotation.z;
  const t0       = performance.now();

  function tick() {
    const t    = Math.min((performance.now() - t0) / duration, 1);
    const ease = 1 - (1 - t) ** 3;

    mesh.position.lerpVectors(startPos, targetPos, ease);
    mesh.rotation.z = startRot + (targetRot - startRot) * ease;

    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── コールバック設定 ─────────────────────────────────────────────
function setOnCardClick(fn)       { _onCardClick = fn; }
function setOnMoveStateChange(fn) { _onMoveStateChange = fn; }

// ── 配置モード用：ワールド → アンカー local 座標変換 ──────────────
function screenToAnchorLocal(e) {
  const ptr = _normalizedPointer(e);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ptr, _camera);

  // アンカーの前面に配置用平面を作る
  const anchorWorldPos = new THREE.Vector3();
  _anchor.group.getWorldPosition(anchorWorldPos);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(_anchor.group.quaternion);
  const plane  = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, anchorWorldPos);

  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  return _anchor.group.worldToLocal(hit);
}
