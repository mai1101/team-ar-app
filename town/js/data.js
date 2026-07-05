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
const PRESET_CARDS = [];

// ── 季節フィルタ ──────────────────────────────────────────────────
// 今日の前後45日の「月日」に一致するカードのみ表示（年をまたいで比較）
function isInSeasonalWindow(createdAtMs) {
  if (!createdAtMs) return true;
  var today    = new Date();
  var refStart = new Date(today); refStart.setDate(today.getDate() - 45);
  var refEnd   = new Date(today); refEnd.setDate(today.getDate() + 45);

  // 年を揃えて月日だけで比較（基準年 2000 を使用）
  var Y = 2000;
  function toMD(d) { return new Date(Y, d.getMonth(), d.getDate()).getTime(); }

  var cardMD  = toMD(new Date(createdAtMs));
  var startMD = toMD(refStart);
  var endMD   = toMD(refEnd);

  if (startMD <= endMD) {
    return cardMD >= startMD && cardMD <= endMD;
  } else {
    // 年をまたぐ窓（例: 11月〜2月）
    return cardMD >= startMD || cardMD <= endMD;
  }
}

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
    // いいね数昇順でスタック（多いほど手前に積む）
    group.sort((a, b) => (a.likeCount || 0) - (b.likeCount || 0));
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
