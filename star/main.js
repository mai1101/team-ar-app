import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// データベース（Firestore）を操作するための機能をインポート
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, increment }
    from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// firebase
const firebaseConfig = {
    apiKey: "AIzaSyDzs2E9PCk_1uujg0ROvMLd5GNNHYLOCqc",
    authDomain: "ar-star-message.firebaseapp.com",
    projectId: "ar-star-message",
    storageBucket: "ar-star-message.firebasestorage.app",
    messagingSenderId: "674722036030",
    appId: "1:674722036030:web:bbe18941dd3d294f13d46f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- UIの取得 ---
const scene = document.querySelector('a-scene');
const messageUi = document.getElementById('message-ui');
const msgText = document.getElementById('msg-text');
const likeCountText = document.getElementById('like-count');
let currentStarId = null; // 現在開いている星のID

// --- 距離感の調整（より遠く、広く） ---
function getRandomPosition() {
    const x = (Math.random() - 0.5) * 16; // 左右に広く（-8 〜 +8）
    const y = 3 + Math.random() * 5;      // 高く（3 〜 8）
    const z = -4 - Math.random() * 8;     // より奥へ（-4 〜 -12）
    return { x, y, z };
}

// --- 星を描画する関数 ---
function renderStar(id, data) {
    // すでに同じ星が描画されていたら更新のために一度消す
    const existingStar = document.getElementById(id);
    if (existingStar) existingStar.remove();

    const hitbox = document.createElement('a-entity');
    hitbox.setAttribute('id', id);
    hitbox.setAttribute('class', 'clickable');

    // 当たり判定も距離に合わせて少し大きくする
    hitbox.setAttribute('geometry', 'primitive: sphere; radius: 1.5');
    hitbox.setAttribute('material', 'opacity: 0; transparent: true');
    hitbox.setAttribute('position', `${data.x} ${data.y} ${data.z}`);

    hitbox.addEventListener('click', function () {
        currentStarId = id; // どの星をタップしたか記憶
        msgText.innerText = data.text;
        likeCountText.innerText = data.likes || 0;
        messageUi.classList.add('active');
    });

    const newStar = document.createElement('a-sphere');

    // --- ★いいねの数に応じて星を巨大化＆進化 ---
    const likesCount = data.likes || 0;
    // 基本の大きさ 0.05 に、いいね1つにつき 0.01 追加
    const starRadius = 0.05 + (likesCount * 0.01);
    newStar.setAttribute('radius', starRadius.toString());

    // 🌟 3いいね以上なら「黄金の星」に進化！
    if (likesCount >= 3) {
        newStar.setAttribute('color', '#FFD700'); // まばゆいゴールド
        newStar.setAttribute('material', 'shader: flat; metalness: 0.8; roughness: 0.2;'); // 少しリッチな質感
        // 特別感を出すために、ゆっくり回転するアニメーションを追加
        newStar.setAttribute('animation__rotate', 'property: rotation; to: 0 360 0; loop: true; dur: 3000; easing: linear');
    } else {
        // 通常の星
        newStar.setAttribute('color', data.color || '#FFFFFF');
        newStar.setAttribute('material', 'shader: flat;');
    }

    // フワフワと大きさが変わる呼吸アニメーション（全共通）
    const randomDur = 800 + Math.random() * 500;
    newStar.setAttribute('animation', `property: scale; dir: alternate; dur: ${randomDur}; to: 1.5 1.5 1.5; loop: true`);

    hitbox.appendChild(newStar);
    scene.appendChild(hitbox);

    // もしUIが開いたまま「いいね」が更新されたら数字を書き換える
    if (currentStarId === id) {
        likeCountText.innerText = data.likes;
    }
}


// --- Firebaseのデータをリアルタイム監視（魔法の部分） ---
onSnapshot(collection(db, "stars"), (snapshot) => {
    snapshot.docs.forEach((doc) => {
        renderStar(doc.id, doc.data());
    });
});

// --- 星を投稿する（Firebaseに保存） ---
document.getElementById('submit-btn').addEventListener('click', async () => {
    const text = document.getElementById('new-msg-input').value;
    if (!text) return;

    const pos = getRandomPosition();

    // Firebaseにデータを保存（保存されると上のonSnapshotが自動で検知して星を描画します）
    await addDoc(collection(db, "stars"), {
        text: text,
        likes: 0,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        color: '#E0FFFF', // 自分で投稿した星は青白く
        createdAt: new Date()
    });

    document.getElementById('post-ui').classList.remove('active');
    document.getElementById('new-msg-input').value = '';
});

// --- いいねボタンを押した時（Firebaseの数字を増やす） ---
document.getElementById('like-btn').addEventListener('click', async () => {
    if (!currentStarId) return;

    // 1. スマホの記憶（ローカルストレージ）から、自分がこの星に何回いいねしたか取得
    const storageKey = 'likes_' + currentStarId;
    let myLikes = parseInt(localStorage.getItem(storageKey) || '0', 10);

    // 2. もしすでに5回いいねしていたら、ストップ！
    if (myLikes >= 5) {
        // 上限であることを視覚的に伝える（ボタンを一瞬グレーにする）
        const btn = document.getElementById('like-btn');
        const originalBg = btn.style.background;
        btn.style.background = '#e0e0e0';
        setTimeout(() => { btn.style.background = originalBg; }, 300);
        return; // ここで処理を終了し、Firebaseには送らない
    }

    // 3. 自分のいいね数をカウントアップして、スマホに保存
    myLikes += 1;
    localStorage.setItem(storageKey, myLikes.toString());

    // 4. Firebaseのデータベースを更新（今まで通り）
    const starRef = doc(db, "stars", currentStarId);
    await updateDoc(starRef, {
        likes: increment(1)
    });

    // 5. アニメーション
    likeCountText.style.transform = "scale(1.5)";
    setTimeout(() => { likeCountText.style.transform = "scale(1)"; }, 150);
});

// UIを閉じる処理など
document.getElementById('close-btn').addEventListener('click', () => {
    messageUi.classList.remove('active');
    currentStarId = null;
});
document.getElementById('open-post-btn').addEventListener('click', () => {
    document.getElementById('post-ui').classList.add('active');
});
document.getElementById('cancel-btn').addEventListener('click', () => {
    document.getElementById('post-ui').classList.remove('active');
});