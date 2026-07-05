import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
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
const msgAudio = document.getElementById('msg-audio'); // 再生用プレイヤー

// 録音UI関係
const recordBtn = document.getElementById('record-btn');
const recordStatus = document.getElementById('record-status');
const previewAudio = document.getElementById('preview-audio');

let currentStarId = null; // 現在開いている星のID


// --- 録音ボタンのイベント設定 ---
// 録音処理用の変数
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let isRecording = false;
let recordingTimer = null; // ★追加：10秒制限用のタイマーを記憶する変数


// --- 録音ボタンのイベント設定 ---
// iOSはaudio/webm非対応のためmp4を優先
function _getSupportedMimeType() {
    const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
    for (const t of types) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
}

if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
        if (!isRecording) {
            audioChunks = [];
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mimeType = _getSupportedMimeType();
                mediaRecorder = mimeType
                    ? new MediaRecorder(stream, { mimeType })
                    : new MediaRecorder(stream);

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const actualType = mediaRecorder.mimeType || mimeType || 'audio/webm';
                    audioBlob = new Blob(audioChunks, { type: actualType });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    previewAudio.src = audioUrl;
                    previewAudio.style.display = 'block';
                };

                mediaRecorder.start();
                isRecording = true;
                recordBtn.innerText = "⏹ 録音を停止 (最大5秒)";
                recordBtn.style.background = "#333";
                recordStatus.style.display = "inline";

                recordingTimer = setTimeout(() => {
                    if (isRecording) {
                        stopRecordingProcess();
                        alert("5秒に達したため録音を自動停止しました。");
                    }
                }, 5000);

            } catch (err) {
                alert("マイクの許可が必要です: " + err);
            }
        } else {
            if (recordingTimer) clearTimeout(recordingTimer);
            stopRecordingProcess();
        }
    });
}

// ★追加：録音をストップしてUIを元に戻す共通の関数
function stopRecordingProcess() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    isRecording = false;
    recordBtn.innerText = "🎤 再録音する";
    recordBtn.style.background = "#ff4757";
    recordStatus.style.display = "none";
}

// --- 距離感の調整（より遠く、広く） ---
function getRandomPosition() {
    const x = (Math.random() - 0.5) * 20;
    const y = 5 + Math.random() * 5;
    const z = -10 - Math.random() * 6;
    return { x, y, z };
}

// --- 星を描画する関数 ---
function renderStar(id, data) {
    const existingStar = document.getElementById(id);
    if (existingStar) existingStar.remove();

    const hitbox = document.createElement('a-entity');
    hitbox.setAttribute('id', id);
    hitbox.setAttribute('class', 'clickable');
    hitbox.setAttribute('geometry', 'primitive: sphere; radius: 1.0');
    hitbox.setAttribute('material', 'opacity: 0; transparent: true; depthWrite: false;');
    hitbox.setAttribute('position', `${data.x} ${data.y} ${data.z}`);

    hitbox.addEventListener('click', function () {
        currentStarId = id;
        msgText.innerText = data.text || (data.audioDataUrl ? "（ボイスメッセージが届いています）" : "");
        likeCountText.innerText = data.likes || 0;

        // 🔊 音声データがあればプレイヤーにセットして再生可能にする
        if (msgAudio) {
            if (data.audioDataUrl) {
                msgAudio.src = data.audioDataUrl;
                msgAudio.style.display = 'block';
            } else {
                msgAudio.src = '';
                msgAudio.style.display = 'none';
            }
        }

        messageUi.classList.add('active');
    });

    const newStar = document.createElement('a-sphere');

    const likesCount = data.likes || 0;
    const starRadius = 0.05 + (likesCount * 0.01);
    newStar.setAttribute('radius', starRadius.toString());

    // 🌟 いいね進化（音声がある星は少し違う初期色にするなどもエモいです）
    if (likesCount >= 10) {
        newStar.setAttribute('color', '#fefe87'); // 黄金の星
        newStar.setAttribute('material', 'shader: flat; metalness: 0.8; roughness: 0.2;');
        newStar.setAttribute('animation__rotate', 'property: rotation; to: 0 360 0; loop: true; dur: 3000; easing: linear');
    } else {
        // 音声付きの星は、通常の星（白）と区別して淡いピンク色（#FFB6C1）にする演出
        newStar.setAttribute('color', data.audioDataUrl ? '#FFB6C1' : '#b7fffe');
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

// --- 背景用の反応しない細かい星を自動生成する関数 ---
function initBackgroundStars(count = 150) {
    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) return;

    for (let i = 0; i < count; i++) {
        const starEl = document.createElement('a-sphere');

        // メッセージの星（奥6〜10m）よりも、さらに遠い背景（奥10〜30m）に広く散りばめる
        const x = (Math.random() - 0.5) * 40; // 左右に広く (-20 〜 +20)
        const y = 4 + Math.random() * 12;     // 空高く (4 〜 16)
        const z = -10 - Math.random() * 20;   // はるか奥へ (-10 〜 -30)

        starEl.setAttribute('position', `${x} ${y} ${z}`);

        // 背景用の細かい星なので、サイズは極小（直径2cm〜5cm程度）にランダム設定
        const radius = 0.01 + Math.random() * 0.015;
        starEl.setAttribute('radius', radius.toString());

        // 色は白。発光して見えるように shader: flat にし、アニメーション用に透明度を有効化
        starEl.setAttribute('color', '#FFFFFF');
        starEl.setAttribute('material', 'shader: flat; transparent: true; opacity: 1.0;');

        // 🌟 星がチカチカと個別に瞬くように、ランダムな時間とズレ（delay）を入れたアニメーション
        const randomDur = 1000 + Math.random() * 2000;  // 1〜3秒で1往復
        const randomDelay = Math.random() * 2000;       // 輝き始めるタイミングをバラバラにする
        starEl.setAttribute('animation', `property: material.opacity; from: 0.2; to: 1.0; dir: alternate; dur: ${randomDur}; delay: ${randomDelay}; loop: true; easing: easeInOutSine`);

        // ★重要: class="clickable" を「あえてつけない」ことで、タップに一切反応しなくなります

        sceneEl.appendChild(starEl);
    }
}

const sceneEl = document.querySelector('a-scene');
if (sceneEl.hasLoaded) {
    initBackgroundStars(150);
} else {
    sceneEl.addEventListener('loaded', () => initBackgroundStars(150));
}

// --- 自力で距離を計算して星座（線）を描画する関数 ---
function drawConstellations(starsList) {
    const sceneEl = document.querySelector('a-scene');
    const oldLines = document.querySelectorAll('.constellation-line');
    oldLines.forEach(line => line.remove());

    // 🌟 10いいね以上の「黄金の星」だけを抽出する
    const goldenStars = starsList.filter(star => (star.likes || 0) >= 10);

    // 黄金の星が2つ未満なら終了
    if (goldenStars.length < 2) return;

    const THRESHOLD = 8.0;

    for (let i = 0; i < goldenStars.length; i++) {
        for (let j = i + 1; j < goldenStars.length; j++) {
            const starA = goldenStars[i];
            const starB = goldenStars[j];

            const dx = starA.x - starB.x;
            const dy = starA.y - starB.y;
            const dz = starA.z - starB.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < THRESHOLD) {
                // ★ バグる「線」をやめて、「円柱（シリンダー）」で実体のある光の筒を作る！
                const lineEl = document.createElement('a-cylinder');
                lineEl.setAttribute('class', 'constellation-line');

                // 太さと長さを設定 (長さに少し色をつけて星の芯まで届かせます)
                lineEl.setAttribute('radius', '0.02');
                // ★ distance に 0.5 を足して、少し長めに設定します！
                lineEl.setAttribute('height', distance.toString());

                // 色と発光感
                lineEl.setAttribute('color', '#fefe87');
                lineEl.setAttribute('material', 'shader: flat; transparent: true; opacity: 0.8');

                // 位置を星Aと星Bの「真ん中」に置く
                const midX = (starA.x + starB.x) / 2;
                const midY = (starA.y + starB.y) / 2;
                const midZ = (starA.z + starB.z) / 2;
                lineEl.setAttribute('position', `${midX} ${midY} ${midZ}`);

                // ★ A-Frameの裏側（Three.js）を使って、円柱の向きを星Aから星Bへ正確に繋ぐ魔法の計算
                lineEl.addEventListener('loaded', () => {
                    const vecB = new THREE.Vector3(starB.x, starB.y, starB.z);
                    // 円柱を星Bの方向に向ける
                    lineEl.object3D.lookAt(vecB);
                    // 円柱の向きを縦から横に寝かせる（90度回転）
                    lineEl.object3D.rotateX(Math.PI / 2);
                });

                sceneEl.appendChild(lineEl);
            }
        }
    }
}

// --- Firebaseのデータをリアルタイム監視 ---
onSnapshot(collection(db, "stars"), (snapshot) => {
    const starsList = [];
    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // 🔊 読み込み時：音声Bytes型をBase64（再生可能なURL）に復元
        if (data.audioBytes) {
            const mime = data.audioMimeType || 'audio/webm';
            data.audioDataUrl = `data:${mime};base64,` + data.audioBytes.toBase64();
            delete data.audioBytes;
        }
        starsList.push({ id: doc.id, ...data });
    });

    // すべての星を描画
    starsList.forEach(star => {
        renderStar(star.id, star);
    });

    // 自作アルゴリズムで星座の線を引く
    drawConstellations(starsList);
});

// --- 星を投稿する（Firebaseに保存） ---
document.getElementById('submit-btn').addEventListener('click', async () => {
    const text = document.getElementById('new-msg-input').value;

    // テキストも録音データもない場合は終了
    if (!text && !audioBlob) return;

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "星を生成中...";

    const pos = getRandomPosition();
    const data = {
        text: text,
        likes: 0,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        createdAt: new Date()
    };

    // 🔊 保存時：録音データ（Blob）があればBytes型に変換して乗せる
    if (audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        if (arrayBuffer.byteLength > 700000) {
            alert('音声が大きすぎます。もう少し短く録音してください。');
            submitBtn.disabled = false;
            submitBtn.innerText = "星にする";
            return;
        }
        data.audioBytes    = Bytes.fromUint8Array(new Uint8Array(arrayBuffer));
        data.audioMimeType = (audioBlob.type || 'audio/webm').split(';')[0];
    }

    // Firebaseに保存
    await addDoc(collection(db, "stars"), data);

    // UIと録音状態のリセット
    document.getElementById('post-ui').classList.remove('active');
    document.getElementById('new-msg-input').value = '';
    previewAudio.src = '';
    previewAudio.style.display = 'none';
    recordBtn.innerText = "🎤 声を録音する";
    recordBtn.style.background = "#ff4757";
    audioBlob = null;
    submitBtn.disabled = false;
    submitBtn.innerText = "星にする";
});

// --- いいねボタンを押した時 ---
document.getElementById('like-btn').addEventListener('click', async () => {
    if (!currentStarId) return;

    const storageKey = 'likes_' + currentStarId;
    let myLikes = parseInt(localStorage.getItem(storageKey) || '0', 10);

    if (myLikes >= 50) { // テスト用に50上限
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
    if (msgAudio) {
        msgAudio.pause(); // 音声を止める
        msgAudio.src = '';
        msgAudio.style.display = 'none'; // ★これを追加：プレイヤーを隠して高さをリセット！
    }
    msgText.innerText = ''; // テキストも消して完全に初期化
    currentStarId = null;
});

document.getElementById('open-post-btn').addEventListener('click', () => {
    document.getElementById('post-ui').classList.add('active');
});
document.getElementById('cancel-btn').addEventListener('click', () => {
    document.getElementById('post-ui').classList.remove('active');

    if (recordingTimer) clearTimeout(recordingTimer); // ★これを追加！
    // ...以下、既存のコードと同じ...
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
    }
    audioBlob = null;
    previewAudio.src = '';
    previewAudio.style.display = 'none';
    recordBtn.innerText = "🎤 声を録音する";
    recordBtn.style.background = "#ff4757";
    recordStatus.style.display = "none";
    isRecording = false;
});