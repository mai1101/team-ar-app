// =====================================================================
// modal.js  ─  チェキ詳細モーダルの表示 / 非表示
// =====================================================================

let _currentCard = null;
let _onDelete    = null;
let _onEdit      = null;

function initModal(onDelete, onEdit) {
  _onDelete = onDelete;
  _onEdit   = onEdit;

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
}

// ── モーダルを開く ───────────────────────────────────────────────
function showChekiModal(card) {
  _currentCard = card;

  const photoEl   = document.getElementById('modal-photo');
  const commentEl = document.getElementById('modal-comment');
  const authorEl  = document.getElementById('modal-author');
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
  authorEl.textContent  = card.author;

  // 8 時間以内のユーザーカードなら編集・削除ボタンを出す
  const canEdit = !card.isPreset && _isWithin8Hours(card);
  editBtn.classList.toggle('hidden', !canEdit);
  delBtn.classList.toggle('hidden',  !canEdit);

  document.getElementById('cheki-modal').classList.remove('hidden');
}

function hideChekiModal() {
  document.getElementById('cheki-modal').classList.add('hidden');
  _currentCard = null;
}

function _isWithin8Hours(card) {
  if (!card.createdAt) return false;
  return Date.now() - card.createdAt < 8 * 60 * 60 * 1000;
}
