// =====================================================================
// modal.js  ─  チェキ詳細モーダルの表示 / 非表示
// =====================================================================

let _currentCard = null;
let _onDelete    = null;
let _onEdit      = null;
let _onLike      = null;

function initModal(onDelete, onEdit, onLike) {
  _onDelete = onDelete;
  _onEdit   = onEdit;
  _onLike   = onLike;

  document.getElementById('modal-backdrop').addEventListener('click', hideChekiModal);
  document.getElementById('modal-back-btn').addEventListener('click', hideChekiModal);

  document.getElementById('modal-delete-btn').addEventListener('click', () => {
    if (!_currentCard) return;
    _onDelete && _onDelete(_currentCard);
    hideChekiModal();
  });

  document.getElementById('modal-edit-btn').addEventListener('click', () => {
    if (!_currentCard) return;
    _onEdit && _onEdit(_currentCard);
    hideChekiModal();
  });

  document.getElementById('modal-like-btn').addEventListener('click', async () => {
    if (!_currentCard || !_onLike) return;
    await _onLike(_currentCard);
    _updateLikeUI(_currentCard);
  });
}

// ── モーダルを開く ───────────────────────────────────────────────
function showChekiModal(card) {
  _currentCard = card;

  const photoEl   = document.getElementById('modal-photo');
  const commentEl = document.getElementById('modal-comment');
  const authorEl  = document.getElementById('modal-author');
  const dateEl    = document.getElementById('modal-date');
  const editBtn   = document.getElementById('modal-edit-btn');
  const delBtn    = document.getElementById('modal-delete-btn');

  // 写真エリアをクリア
  photoEl.innerHTML = '';

  if (card.photoDataUrl) {
    // ユーザー投稿の実写真
    const img = document.createElement('img');
    img.src = card.photoDataUrl;
    img.alt = 'チェキ写真';
    photoEl.appendChild(img);
  } else {
    // イラスト（canvas）
    const canvas = createModalCanvas(card);
    photoEl.appendChild(canvas);
  }

  commentEl.textContent = card.comment;
  authorEl.textContent  = card.author || '';
  if (dateEl) dateEl.textContent = _formatModalDate(card.createdAt);

  // いいねUI
  const likeRow = document.getElementById('modal-like-row');
  if (likeRow) likeRow.classList.toggle('hidden', !!card.isPreset);
  _updateLikeUI(card);

  // 自分が投稿したカードなら編集・削除ボタンを出す
  const canEdit = !card.isPreset && _isMyCard(card);
  editBtn.classList.toggle('hidden', !canEdit);
  delBtn.classList.toggle('hidden',  !canEdit);

  document.getElementById('cheki-modal').classList.remove('hidden');
}

function hideChekiModal() {
  document.getElementById('cheki-modal').classList.add('hidden');
  _currentCard = null;
}

function _isMyCard(card) {
  var myId = localStorage.getItem('cottage_canvas_guest_id');
  return !!myId && card.guestId === myId;
}

function _updateLikeUI(card) {
  var myId  = localStorage.getItem('cottage_canvas_guest_id');
  var liked = !!(myId && card.likes && card.likes[myId]);
  var btn   = document.getElementById('modal-like-btn');
  var cnt   = document.getElementById('modal-like-count');
  if (btn) btn.innerHTML = liked
    ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="#e05c6e" stroke="#e05c6e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  if (cnt) cnt.textContent = card.likeCount || 0;
}

function _formatModalDate(timestamp) {
  if (!timestamp) return '';
  var d     = new Date(timestamp);
  var today = new Date();
  if (d.toDateString() === today.toDateString()) return '今日';
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}
