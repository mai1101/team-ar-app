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

// ---- チェックアウト ----
async function handleCheckout() {
  const text = document.getElementById("message-text").value.trim();
  if (!text) return;

  const btn = document.getElementById("checkout-btn");
  const errorEl = document.getElementById("checkout-error");
  const authorName = document.getElementById("author-name").value.trim() || "旅人";

  btn.disabled = true;
  btn.textContent = "送信中...";
  errorEl.textContent = "";

  try {
    // メッセージ追加
    await addDoc(collection(db, "messages"), {
      cottageId,
      authorName,
      guestId: getOrCreateGuestId(),
      text,
      createdAt: serverTimestamp(),
    });

    // visitのcheckedOutAtを更新
    const visitId = localStorage.getItem(VISIT_ID_KEY);
    if (visitId) {
      await updateDoc(doc(db, "visits", visitId), {
        checkedOutAt: serverTimestamp(),
      });
      localStorage.removeItem(VISIT_ID_KEY);
    }

    showScreen("screen-done");
  } catch (err) {
    console.error("チェックアウトエラー:", err);
    errorEl.textContent = "投稿に失敗しました。もう一度お試しください。";
    btn.disabled = false;
    btn.textContent = "思い出を残す";
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

document.getElementById("checkin-btn").addEventListener("click", handleCheckin);

document.getElementById("go-history-btn").addEventListener("click", () => {
  loadMyMessages();
  showScreen("screen-history");
});

document.getElementById("back-from-history-btn").addEventListener("click", () => {
  showScreen("screen-checkin");
});

document.getElementById("go-checkout-btn").addEventListener("click", () => {
  showScreen("screen-checkout");
});

document.getElementById("message-text").addEventListener("input", (e) => {
  document.getElementById("char-count-num").textContent = e.target.value.length;
});

document.getElementById("checkout-btn").addEventListener("click", handleCheckout);

document.getElementById("restart-btn").addEventListener("click", () => {
  // フォームをリセット
  document.getElementById("guest-name").value = "";
  document.getElementById("author-name").value = "";
  document.getElementById("message-text").value = "";
  document.getElementById("char-count-num").textContent = "0";
  document.getElementById("checkin-form").hidden = false;
  document.getElementById("after-checkin").hidden = true;
  showScreen("screen-checkin");
  loadMessages();
});
