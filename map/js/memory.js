// =====================================================================
// memory.js  ─  ユーザー投稿チェキの保存・フォームUI・配置モード
// =====================================================================

const STORAGE_KEY = 'ashiato_user_cards_v1';

// ── localStorage CRUD ──────────────────────────────────────────────
function getUserCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveUserCard(card) {
  const cards = getUserCards();
  const existing = cards.findIndex(c => c.id === card.id);
  if (existing >= 0) {
    cards[existing] = card;
  } else {
    cards.push(card);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function deleteUserCard(id) {
  const cards = getUserCards().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function updateUserCardComment(id, newComment) {
  const cards = getUserCards();
  const idx   = cards.findIndex(c => c.id === id);
  if (idx < 0) return null;
  cards[idx].comment = newComment;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
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
  saveUserCard(_pendingCard);

  const card = { ..._pendingCard };
  exitPlacementMode();
  _onPlaced && _onPlaced(card);
}
