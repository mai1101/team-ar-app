import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// データベース（Firestore）を操作するための機能をインポート
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, increment, query, where }
    from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Gemini API をブラウザで直接動かすためのライブラリを読み込む
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// さっき取得したAPIキーを設定 あとで必ず破棄
const API_KEY = "AQ.Ab8RN6L0b1fOgHZuK3rJ3prUteNNBLQ343Z3WTH6bMqU5cnxwQ"; // ★ここに自分のAPIキーを貼り付ける
const ai = new GoogleGenerativeAI(API_KEY);

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

    // --- ★いいねの数に応じて星を巨大化 ---
    // 基本の大きさ 0.05 に、いいね1つにつき 0.01 追加
    const starRadius = 0.05 + ((data.likes || 0) * 0.01);
    newStar.setAttribute('radius', starRadius.toString());

    newStar.setAttribute('color', data.color || '#FFFFFF');
    newStar.setAttribute('material', 'shader: flat;');

    const randomDur = 800 + Math.random() * 500;
    newStar.setAttribute('animation', `property: scale; dir: alternate; dur: ${randomDur}; to: 1.5 1.5 1.5; loop: true`);

    hitbox.appendChild(newStar);
    scene.appendChild(hitbox);

    // もしUIが開いたまま「いいね」が更新されたら数字を書き換える
    if (currentStarId === id) {
        likeCountText.innerText = data.likes;
    }
}

// 星の配列を受け取って、AIに星座を作ってもらう関数
async function askAItoMakeConstellations(starsList) {
    // 1. AIモデルの準備（速くて無料枠が大きい gemini-1.5-flash を使います）
    // generationConfig で「必ずJSON形式で返してね」と制限をかけるのが最大のコツです
    const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    // 2. AIに渡すための星のリスト（IDとメッセージだけ）を綺麗に整理する
    const simplifiedStars = starsList.map(star => ({
        id: star.id,
        message: star.message
    }));

    // 3. AIへの指示文（プロンプト）を組み立てる
    const prompt = `
  あなたは夜空の星々を繋ぐロマンチックな天文学者（AI）です。
  以下の旅人たちのメッセージ（IDと内容のリスト）を読み、文脈や感情、テーマが似ているもの同士（2〜4個の星）をグループ化して、それぞれ1つの「星座」にしてください。
  
  【メッセージリスト】
  ${JSON.stringify(simplifiedStars)}
  
  【指示】
  ・似た想い（例：食事の感動、自然への癒やし、旅の終わりへの切なさなど）を持つ星同士を結んでください。
  ・それぞれの星座には、センスのある「星座の名前（日本語）」をつけてください。
  ・その星座の簡単な説明文（日本語）も作ってください。
  ・すべての星を無理に繋ぐ必要はありません。
  
  【出力フォーマット】
  必ず以下の構造のJSONオブジェクトのみを返却してください。
  {
    "constellations": [
      {
        "name": "美食と宴の星座",
        "description": "コテージでの美味しい食事やBBQの思い出を共有した旅人たちの星が結ばれた星座。",
        "links": [
          {"from": "star_id_1", "to": "star_id_2"},
          {"from": "star_id_2", "to": "star_id_5"}
        ]
      }
    ]
  }
  `;

    try {
        // 4. AIに送信して結果を待つ
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 返ってきた文字列を、プログラムで扱えるJSONオブジェクトに変換
        const constellationData = JSON.parse(responseText);
        return constellationData;
    } catch (error) {
        console.error("AI星座の生成に失敗:", error);
        return null;
    }
}

// AIが作った星座データを元に、AR空間に線を引く関数
function drawConstellationLines(constellationData, starsList) {
    const sceneEl = document.querySelector('a-scene');

    // すでに古い線があれば一度消す（部屋のアップデート対策）
    const oldLines = document.querySelectorAll('.constellation-line');
    oldLines.forEach(line => line.remove());

    if (!constellationData || !constellationData.constellations) return;

    // 星座の数だけループ
    constellationData.constellations.forEach(constellation => {
        console.log(`星座誕生: ${constellation.name} - ${constellation.description}`);
        // 画面の2D UIに「〇〇座が夜空に現れました」とテキスト表示するのもアリです！

        // 星座の中の「線（リンク）」の数だけループ
        constellation.links.forEach(link => {
            // 繋ぐ元（from）と繋ぐ先（to）の星のデータを、座標が入った元のリストから探す
            const starFrom = starsList.find(s => s.id === link.from);
            const starTo = starsList.find(s => s.id === link.to);

            // 両方の星が空間に存在する場合だけ線を引く
            if (starFrom && starTo) {
                const lineEl = document.createElement('a-line');
                lineEl.setAttribute('class', 'constellation-line');

                // 線のスタート位置とゴール位置（星の3D座標）を設定
                lineEl.setAttribute('start', `${starFrom.x} ${starFrom.y} ${starFrom.z}`);
                lineEl.setAttribute('end', `${starTo.x} ${starTo.y} ${starTo.z}`);

                // 線の見た目（エモい光の線にするために色や透明度を設定）
                lineEl.setAttribute('color', '#87CEFA'); // きれいな水色
                lineEl.setAttribute('opacity', '0.6');
                lineEl.setAttribute('material', 'shader: flat; transparent: true');

                // AR空間（a-scene）に追加！
                sceneEl.appendChild(lineEl);
            }
        });
    });
}
// --- URLからコテージIDを取得し、絞り込み条件（q）を作る ---
const urlParams = new URLSearchParams(window.location.search);
const currentCottage = urlParams.get('cottage') || 'default';

const q = query(
    collection(db, "stars"),
    where("cottageId", "==", currentCottage)
);

// --- Firebaseのデータをリアルタイム監視（魔法の部分） ---
onSnapshot(q, async (snapshot) => {
    const starsList = [];

    // データベースから届いた最新の星を配列にまとめる
    snapshot.forEach(doc => {
        starsList.push({ id: doc.id, ...doc.data() });
    });

    // 処理A：星を空間に出す（1個ずつ renderStar を呼び出して描画する）
    starsList.forEach(star => {
        renderStar(star.id, star); // 隠れバグ修正：一つずつ描画関数に渡す
    });

    // 処理B：星が3つ以上あればAIを呼んで星座の線を引く！（新機能）
    if (starsList.length >= 3) {
        const aiData = await askAItoMakeConstellations(starsList);
        drawConstellationLines(aiData, starsList);
    }
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


