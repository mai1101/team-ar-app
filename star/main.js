import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// ★ 1. Bytes をインポートに追加
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, increment, Bytes }
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
// ★ HTMLに写真表示用のimgタグがある前提（後述します）
const msgPhoto = document.getElementById('msg-photo');
let currentStarId = null; // 現在開いている星のID

// --- 距離感の調整（より遠く、広く） ---
function getRandomPosition() {
    const x = (Math.random() - 0.5) * 20;
    const y = 5 + Math.random() * 5;
    const z = -4 - Math.random() * 6;
    return { x, y, z };
}

// ★ 2. 写真をリサイズして Firestore の Bytes型 に変換する関数
async function photoToFirestoreBytes(dataUrl, maxW = 200, maxH = 200) {
    // リサイズ
    const resized = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataUrl;
    });
    // dataURL → Bytes型
    const res = await fetch(resized);
    const buf = await res.arrayBuffer();
    return Bytes.fromUint8Array(new Uint8Array(buf));
}

// --- 星を描画する関数 ---
function renderStar(id, data) {
    const existingStar = document.getElementById(id);
    if (existingStar) existingStar.remove();

    const hitbox = document.createElement('a-entity');
    hitbox.setAttribute('id', id);
    hitbox.setAttribute('class', 'clickable');
    hitbox.setAttribute('geometry', 'primitive: sphere; radius: 1.5');
    hitbox.setAttribute('material', 'opacity: 0; transparent: true');
    hitbox.setAttribute('position', `${data.x} ${data.y} ${data.z}`);

    hitbox.addEventListener('click', function () {
        currentStarId = id;
        msgText.innerText = data.text;
        likeCountText.innerText = data.likes || 0;

        // ★ 写真データがあれば表示、なければ非表示にする処理
        if (msgPhoto) {
            if (data.photoDataUrl) {
                msgPhoto.src = data.photoDataUrl;
                msgPhoto.style.display = 'block';
            } else {
                msgPhoto.src = '';
                msgPhoto.style.display = 'none';
            }
        }

        messageUi.classList.add('active');
    });

    const newStar = document.createElement('a-sphere');

    const likesCount = data.likes || 0;
    const starRadius = 0.05 + (likesCount * 0.01);
    newStar.setAttribute('radius', starRadius.toString());

    if (likesCount >= 10) {
        newStar.setAttribute('color', '#fefe87');
        newStar.setAttribute('material', 'shader: flat; metalness: 0.8; roughness: 0.2;');
        newStar.setAttribute('animation__rotate', 'property: rotation; to: 0 360 0; loop: true; dur: 3000; easing: linear');
    } else {
        newStar.setAttribute('color', data.color || '#FFFFFF');
        newStar.setAttribute('material', 'shader: flat;');
    }

    const randomDur = 800 + Math.random() * 500;
    newStar.setAttribute('animation', `property: scale; dir: alternate; dur: ${randomDur}; to: 1.5 1.5 1.5; loop: true`);

    hitbox.appendChild(newStar);
    scene.appendChild(hitbox);

    if (currentStarId === id) {
        likeCountText.innerText = data.likes;
    }
}

// --- Firebaseのデータをリアルタイム監視 ---
onSnapshot(collection(db, "stars"), (snapshot) => {
    snapshot.docs.forEach((doc) => {
        // ★ 4. 読み込み時：Bytes型をBase64（画像URL）に戻す
        const data = doc.data();
        if (data.photoBytes) {
            data.photoDataUrl = 'data:image/jpeg;base64,' + data.photoBytes.toBase64();
            delete data.photoBytes; // メモリ節約
        }
        renderStar(doc.id, data);
    });
});

// --- 星を投稿する（Firebaseに保存） ---
document.getElementById('submit-btn').addEventListener('click', async () => {
    const text = document.getElementById('new-msg-input').value;
    // ★ HTMLに写真選択用のinputタグがある前提
    const photoInput = document.getElementById('photo-input');

    // テキストも写真もない場合は何もしない
    if (!text && (!photoInput || photoInput.files.length === 0)) return;

    // 送信ボタンを連打できないように一時的に無効化（ローディング中）
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "送信中...";

    const pos = getRandomPosition();
    const data = {
        text: text || "", // テキストが空でも写真だけ投稿できるように対応
        likes: 0,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        color: '#E0FFFF',
        createdAt: new Date()
    };

    // ★ 3. 保存時：写真が選ばれていたら変換して追加する
    if (photoInput && photoInput.files.length > 0) {
        const file = photoInput.files[0];
        // ファイルをData URL（文字列）として読み込む
        const photoDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        // 圧縮してBytes型にする
        data.photoBytes = await photoToFirestoreBytes(photoDataUrl);
    }

    // Firebaseに保存
    await addDoc(collection(db, "stars"), data);

    // UIを元に戻す
    document.getElementById('post-ui').classList.remove('active');
    document.getElementById('new-msg-input').value = '';
    if (photoInput) photoInput.value = ''; // 写真の選択もリセット
    submitBtn.disabled = false;
    submitBtn.innerText = "星を飛ばす"; // 元のボタン名に合わせてください
});

// --- いいねボタンを押した時 ---
document.getElementById('like-btn').addEventListener('click', async () => {
    if (!currentStarId) return;

    const storageKey = 'likes_' + currentStarId;
    let myLikes = parseInt(localStorage.getItem(storageKey) || '0', 10);

    if (myLikes >= 50) { // テスト用に50にしています
        const btn = document.getElementById('like-btn');
        const originalBg = btn.style.background;
        btn.style.background = '#e0e0e0';
        setTimeout(() => { btn.style.background = originalBg; }, 300);
        return;
    }

    myLikes += 1;
    localStorage.setItem(storageKey, myLikes.toString());

    const starRef = doc(db, "stars", currentStarId);
    await updateDoc(starRef, {
        likes: increment(1)
    });

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