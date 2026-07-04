// =====================================================================
// data.js  ─  チェキデータ・スポット定義・位置計算
// =====================================================================

// ── スポットの中心座標（MindAR アンカーのローカル空間）──────────────
// 画像の中心が (0, 0)。横幅 = 1 unit。
// A3 縦置き（297×420mm）の場合、縦は約 ±0.707 の範囲。
// 実際のマップ画像に合わせて各値を調整してください。
const SPOTS = {
  '鏡湖':    { x: -0.22, y:  0.25 },
  '鎮守の森': { x:  0.06, y: -0.10 },
  '八雲神社': { x:  0.28, y:  0.20 },
};

// 同スポットに複数枚積む際のずらし量（1 枚ごと）
const STACK_OFFSET = { x: 0.036, y: -0.028 };

// Three.js PlaneGeometry のサイズ（unit）
const CARD_WIDTH  = 0.14;
const CARD_HEIGHT = 0.17;

// チェキ canvas サイズ（px）
const CANVAS_W  = 200;
const CANVAS_H  = 250;
const PHOTO_H   = 168; // 写真エリアの高さ

// ── プリセットチェキデータ ────────────────────────────────────────
const PRESET_CARDS = [
  {
    id: 'preset-0',
    spot: '鏡湖',
    comment: '夕暮れの鏡湖、最高でした🌅 水面がオレンジに染まって。',
    author: 'Aさん・2泊目の夕方',
    colors: ['#ff9a3c', '#f7c59f'],
    icon: 'lake-sunset',
    isPreset: true,
  },
  {
    id: 'preset-1',
    spot: '鏡湖',
    comment: '白鳥が2羽いてびっくり！人懐っこくて癒されました🦢',
    author: 'Bさん・春の連休',
    colors: ['#a8edea', '#96c8e8'],
    icon: 'lake-swan',
    isPreset: true,
  },
  {
    id: 'preset-2',
    spot: '鏡湖',
    comment: '早起きして正解！朝焼けが幻想的で泣きそうに😭✨',
    author: 'Cさん・秋の旅行',
    colors: ['#ffd89b', '#e88c6a'],
    icon: 'lake-dawn',
    isPreset: true,
  },
  {
    id: 'preset-3',
    spot: '鎮守の森',
    comment: '木漏れ日がすごく綺麗🌿 1時間ぼーっとしてました。',
    author: 'Dさん・初夏',
    colors: ['#56ab2f', '#a8e063'],
    icon: 'forest',
    isPreset: true,
  },
  {
    id: 'preset-4',
    spot: '鎮守の森',
    comment: 'マイナスイオンたっぷり🌲 スマホ忘れて散策してた笑',
    author: 'Eさん・週末旅行',
    colors: ['#1a5c36', '#2d7a4f'],
    icon: 'forest-deep',
    isPreset: true,
  },
  {
    id: 'preset-5',
    spot: '八雲神社',
    comment: '八雲神社、荘厳な雰囲気✨ 御朱印300円でいただきました！',
    author: 'Fさん・初詣旅行',
    colors: ['#c94b4b', '#8b1a1a'],
    icon: 'shrine',
    isPreset: true,
  },
];

// ── ランダムに見えるが再現性のある傾き角を id から計算 ─────────────
function deterministicRotation(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * 0.28; // ±8° 程度
}

// ── 全カード（プリセット + ユーザー）の初期位置を計算 ───────────────
// user card で position フィールドがある場合はそちらを優先する
function computeCardPositions(cards) {
  // スポットごとにグループ化してスタック順を決める
  const spotGroups = {};
  cards.forEach(card => {
    const key = card.spot || '__manual__';
    if (!spotGroups[key]) spotGroups[key] = [];
    spotGroups[key].push(card);
  });

  const positions = {};
  Object.entries(spotGroups).forEach(([spot, group]) => {
    const base = SPOTS[spot] || { x: 0, y: 0 };
    group.forEach((card, i) => {
      if (card.position) {
        // ユーザーが手動配置した位置を使う
        positions[card.id] = {
          ...card.position,
          rotation: card.rotation !== undefined ? card.rotation : deterministicRotation(card.id),
        };
      } else {
        positions[card.id] = {
          x: base.x + STACK_OFFSET.x * i,
          y: base.y + STACK_OFFSET.y * i,
          z: i * 0.002,
          rotation: deterministicRotation(card.id),
        };
      }
    });
  });

  return positions;
}
