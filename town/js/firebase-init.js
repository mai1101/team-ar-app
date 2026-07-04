// =====================================================================
// firebase-init.js  ─  Firebase 初期化（town/ 用）
// ここにFirebaseの設定を入れてください（main.js と同じ値でOK）
// =====================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDzs2E9PCk_1uujg0ROvMLd5GNNHYLOCqc",
  authDomain: "ar-star-message.firebaseapp.com",
  projectId: "ar-star-message",
  storageBucket: "ar-star-message.firebasestorage.app",
  messagingSenderId: "674722036030",
  appId: "1:674722036030:web:bbe18941dd3d294f13d46f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
