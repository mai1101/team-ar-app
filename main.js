import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  limit,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ============================================================
// ここにFirebaseの設定を入れてください（star/main.js と同じ値でOK）
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDzs2E9PCk_1uujg0ROvMLd5GNNHYLOCqc",
  authDomain: "ar-star-message.firebaseapp.com",
  projectId: "ar-star-message",
  storageBucket: "ar-star-message.firebasestorage.app",
  messagingSenderId: "674722036030",
  appId: "1:674722036030:web:bbe18941dd3d294f13d46f"
};

// ダミーデータ（Firestoreに接続できないとき用。下の「// 」を外して使う）
/*
const DUMMY_MESSAGES = [
  { id: "dummy1", authorName: "旅人A", text: "夕暮れの景色が最高でした。近くの食堂もおすすめです！", createdAt: new Date("2025-06-01") },
  { id: "dummy2", authorName: "旅人B", text: "星がとてもきれいに見えました。のんびりできる場所です。", createdAt: new Date("2025-05-28") },
];
*/

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URLパラメータ ?cottage=XX から cottageId を取得（なければ "07"）
const params = new URLSearchParams(window.location.search);
const cottageId = params.get("cottage") || "07";

const VISIT_ID_KEY = "cottage_canvas_visit_id";
const GUEST_ID_KEY = "cottage_canvas_guest_id";

// ---- guestId の生成・取得 ----
function getOrCreateGuestId() {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

// ---- 来訪回数を取得してあいさつ表示 ----
async function loadVisitCount() {
  const guestId = getOrCreateGuestId();
  try {
    const snapshot = await getDocs(
      query(collection(db, "visits"), where("guestId", "==", guestId))
    );
    const count = snapshot.size; // 今回のチェックイン前の来訪数
    const el = document.getElementById("visit-greeting");
    if (count === 0) {
      el.textContent = "はじめまして！素敵な旅を。";
    } else {
      el.textContent = `おかえりなさい！${count + 1}回目のご来訪ですね。`;
    }
  } catch (err) {
    console.error("来訪回数取得エラー:", err);
  }
}

// ---- 自分の過去の投稿を読み込み ----
async function loadMyMessages() {
  const list = document.getElementById("my-message-list");
  list.innerHTML = '<p class="loading-text">読み込み中...</p>';

  const guestId = getOrCreateGuestId();
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "messages"),
        where("guestId", "==", guestId),
        orderBy("createdAt", "desc")
      )
    );

    if (snapshot.empty) {
      list.innerHTML = '<p class="empty-text">まだ投稿がありません。</p>';
      return;
    }

    list.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const dateStr = d.createdAt?.toDate ? formatDate(d.createdAt.toDate()) : "";
      list.innerHTML += `
        <div class="message-card">
          <div class="message-card__header">
            <span class="message-card__author">${escapeHtml(d.authorName || "旅人")}</span>
            ${dateStr ? `<span class="message-card__date">${dateStr}</span>` : ""}
          </div>
          ${d.cottageId ? `<span class="message-card__cottage">コテージ No.${escapeHtml(d.cottageId)}</span>` : ""}
          <p class="message-card__text">${escapeHtml(d.text)}</p>
        </div>`;
    });
  } catch (err) {
    console.error("過去の投稿取得エラー:", err);
    list.innerHTML = '<p class="error-text">取得に失敗しました。</p>';
  }
}

// ---- 画面切替 ----
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => (el.hidden = true));
  document.getElementById(id).hidden = false;
}

// ---- 日付フォーマット ----
function formatDate(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// ---- XSS対策 ----
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- メッセージ読み込み ----
async function loadMessages() {
  const list = document.getElementById("message-list");
  list.innerHTML = '<p class="loading-text">読み込み中...</p>';

  try {
    const q = query(
      collection(db, "messages"),
      where("cottageId", "==", cottageId),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      list.innerHTML =
        '<p class="empty-text">あなたがこのコテージへの最初の宿泊者です。素敵な旅を！</p>';
      return;
    }

    list.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const dateStr = d.createdAt?.toDate ? formatDate(d.createdAt.toDate()) : "";
      list.innerHTML += `
        <div class="message-card">
          <div class="message-card__header">
            <span class="message-card__author">${escapeHtml(d.authorName || "旅人")}</span>
            ${dateStr ? `<span class="message-card__date">${dateStr}</span>` : ""}
          </div>
          <p class="message-card__text">${escapeHtml(d.text)}</p>
        </div>`;
    });
  } catch (err) {
    console.error("メッセージ取得エラー:", err);
    list.innerHTML = '<p class="error-text">メッセージの取得に失敗しました。</p>';
  }
}

// ---- チェックイン ----
async function handleCheckin() {
  const btn = document.getElementById("checkin-btn");
  const errorEl = document.getElementById("checkin-error");
  const guestName = document.getElementById("guest-name").value.trim() || "旅人";

  btn.disabled = true;
  btn.textContent = "処理中...";
  errorEl.textContent = "";

  try {
    const ref = await addDoc(collection(db, "visits"), {
      cottageId,
      guestName,
      guestId: getOrCreateGuestId(),
      checkedInAt: serverTimestamp(),
      checkedOutAt: null,
    });
    localStorage.setItem(VISIT_ID_KEY, ref.id);

    document.getElementById("checkin-form").hidden = true;
    document.getElementById("after-checkin").hidden = false;
  } catch (err) {
    console.error("チェックインエラー:", err);
    errorEl.textContent = "チェックインに失敗しました。もう一度お試しください。";
    btn.disabled = false;
    btn.textContent = "チェックインする";
  }
}

// ---- チェックアウト共通処理 ----
async function _doCheckout() {
  const visitId = localStorage.getItem(VISIT_ID_KEY);
  if (visitId) {
    await updateDoc(doc(db, "visits", visitId), {
      checkedOutAt: serverTimestamp(),
    });
    localStorage.removeItem(VISIT_ID_KEY);
  }
}

// ---- 初期化 ----
document.querySelectorAll(".cottage-id").forEach((el) => (el.textContent = cottageId));

// ページロード時にチェックイン中かどうか Firestore で確認して状態を復元
async function restoreCheckinState() {
  const visitId = localStorage.getItem(VISIT_ID_KEY);
  if (!visitId) return;

  try {
    const visitDoc = await getDoc(doc(db, "visits", visitId));
    if (visitDoc.exists() && visitDoc.data().checkedOutAt === null) {
      // まだチェックアウトしていない → チェックイン後の表示に戻す
      document.getElementById("checkin-form").hidden = true;
      document.getElementById("after-checkin").hidden = false;
    } else {
      // チェックアウト済み or ドキュメントが存在しない → リセット
      localStorage.removeItem(VISIT_ID_KEY);
    }
  } catch (err) {
    console.error("チェックイン状態の復元エラー:", err);
    localStorage.removeItem(VISIT_ID_KEY);
  }
}

restoreCheckinState();

loadMessages();
loadVisitCount();
loadDrawingsBg();

document.getElementById("checkin-btn").addEventListener("click", handleCheckin);

document.getElementById("go-history-btn").addEventListener("click", () => {
  loadMyMessages();
  showScreen("screen-history");
});

document.getElementById("back-from-history-btn").addEventListener("click", () => {
  showScreen("screen-checkin");
});

document.getElementById("go-checkout-btn").addEventListener("click", () => {
  _clearCanvas();
  showScreen("screen-checkout");
  loadDrawings();
});

document.getElementById("restart-btn").addEventListener("click", () => {
  document.getElementById("guest-name").value = "";
  document.getElementById("author-name").value = "";
  document.getElementById("checkin-form").hidden = false;
  document.getElementById("after-checkin").hidden = true;
  showScreen("screen-checkin");
  loadMessages();
});

// ---- 描画キャンバス ----
const _canvas = document.getElementById("drawing-canvas");
const _ctx    = _canvas.getContext("2d");
const CANVAS_W = 320;
const CANVAS_H = 200;
_canvas.width  = CANVAS_W;
_canvas.height = CANVAS_H;

let _isDrawing    = false;
let _currentColor = "#222222";

function _clearCanvas() {
  _ctx.fillStyle = "#ffffff";
  _ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}
_clearCanvas();

function _getCanvasPos(e) {
  const rect   = _canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  const src    = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top)  * scaleY,
  };
}

function _startDraw(e) {
  e.preventDefault();
  _isDrawing = true;
  const { x, y } = _getCanvasPos(e);
  _ctx.beginPath();
  _ctx.moveTo(x, y);
}

function _continueDraw(e) {
  if (!_isDrawing) return;
  e.preventDefault();
  const { x, y } = _getCanvasPos(e);
  _ctx.lineTo(x, y);
  _ctx.strokeStyle = _currentColor;
  _ctx.lineWidth   = 4;
  _ctx.lineCap     = "round";
  _ctx.lineJoin    = "round";
  _ctx.stroke();
}

function _endDraw() { _isDrawing = false; }

_canvas.addEventListener("mousedown",  _startDraw);
_canvas.addEventListener("mousemove",  _continueDraw);
_canvas.addEventListener("mouseup",    _endDraw);
_canvas.addEventListener("mouseleave", _endDraw);
_canvas.addEventListener("touchstart", _startDraw,    { passive: false });
_canvas.addEventListener("touchmove",  _continueDraw, { passive: false });
_canvas.addEventListener("touchend",   _endDraw);

document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    _currentColor = btn.dataset.color;
  });
});

document.getElementById("canvas-clear-btn").addEventListener("click", _clearCanvas);

// ---- 絵を投稿してチェックアウト ----
async function saveDrawing() {
  const btn        = document.getElementById("drawing-post-btn");
  const errorEl    = document.getElementById("drawing-error");
  const authorName = document.getElementById("author-name").value.trim() || "旅人";

  btn.disabled    = true;
  btn.textContent = "送信中...";
  errorEl.textContent = "";

  try {
    const imageData = _canvas.toDataURL("image/jpeg", 0.8);
    await addDoc(collection(db, "drawings"), {
      cottageId,
      authorName,
      imageData,
      createdAt: serverTimestamp(),
    });
    await _doCheckout();
    showScreen("screen-done");
  } catch (err) {
    console.error("絵の投稿エラー:", err);
    errorEl.textContent = "投稿に失敗しました。もう一度お試しください。";
    btn.disabled    = false;
    btn.textContent = "この絵を残してチェックアウト";
  }
}

// ---- 絵のギャラリー読み込み ----
async function loadDrawings() {
  const gallery = document.getElementById("drawing-gallery");
  gallery.innerHTML = '<p class="loading-text">読み込み中...</p>';

  try {
    const q = query(
      collection(db, "drawings"),
      where("cottageId", "==", cottageId),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      gallery.innerHTML = '<p class="empty-text">まだ絵がありません。最初に描いてみましょう！</p>';
      return;
    }

    gallery.innerHTML = '<div class="drawing-gallery-grid"></div>';
    const grid = gallery.querySelector(".drawing-gallery-grid");
    snapshot.forEach((docSnap) => {
      const d     = docSnap.data();
      const div   = document.createElement("div");
      div.className = "drawing-thumb";
      const img   = document.createElement("img");
      img.src     = d.imageData;
      img.alt     = escapeHtml(d.authorName || "旅人") + "の絵";
      const label = document.createElement("div");
      label.className = "drawing-thumb__label";
      label.textContent = d.authorName || "旅人";
      div.appendChild(img);
      div.appendChild(label);
      grid.appendChild(div);
    });
  } catch (err) {
    console.error("絵の読み込みエラー:", err);
    gallery.innerHTML = '<p class="error-text">読み込みに失敗しました。</p>';
  }
}

// ---- 背景に絵を散りばめる ----
async function loadDrawingsBg() {
  try {
    const q = query(
      collection(db, "drawings"),
      where("cottageId", "==", cottageId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const images = snapshot.docs.map((d) => d.data().imageData).filter(Boolean);

    ["drawing-bg-checkin", "drawing-bg-checkout"].forEach((bgId) => {
      const bg = document.getElementById(bgId);
      if (!bg) return;
      images.forEach((imageData) => {
        const img = document.createElement("img");
        img.src = imageData;
        img.className = "drawing-bg-item";
        img.style.left      = Math.random() * 80 + "%";
        img.style.top       = Math.random() * 80 + "%";
        img.style.transform = `rotate(${(Math.random() - 0.5) * 50}deg)`;
        bg.appendChild(img);
      });
    });
  } catch (err) {
    console.error("背景絵の読み込みエラー:", err);
  }
}

document.getElementById("drawing-post-btn").addEventListener("click", saveDrawing);

document.getElementById("skip-drawing-btn").addEventListener("click", async () => {
  const btn = document.getElementById("skip-drawing-btn");
  btn.disabled = true;
  btn.textContent = "処理中...";
  try {
    await _doCheckout();
    showScreen("screen-done");
  } catch (err) {
    console.error("チェックアウトエラー:", err);
    btn.disabled = false;
    btn.textContent = "絵なしでチェックアウト";
  }
});
