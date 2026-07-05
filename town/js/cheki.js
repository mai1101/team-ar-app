// =====================================================================
// cheki.js  ─  チェキ風カードの Canvas 描画
// =====================================================================

// ── スポット別イラスト描画関数 ──────────────────────────────────────

function drawLakeSunset(ctx, w, h, colors) {
  // 夕焼け空
  const sky = ctx.createLinearGradient(0, 0, 0, h * .58);
  sky.addColorStop(0, '#7b2d00');
  sky.addColorStop(.5, colors[0]);
  sky.addColorStop(1, colors[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * .58);

  // 太陽
  const sunGlow = ctx.createRadialGradient(w*.58, h*.28, 0, w*.58, h*.28, h*.22);
  sunGlow.addColorStop(0,   'rgba(255,240,180,1)');
  sunGlow.addColorStop(.35, 'rgba(255,180,60,.5)');
  sunGlow.addColorStop(1,   'rgba(255,120,30,0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, w, h * .6);
  ctx.fillStyle = '#fffbe6';
  ctx.beginPath();
  ctx.arc(w*.58, h*.28, h*.07, 0, Math.PI*2);
  ctx.fill();

  // 山のシルエット
  ctx.fillStyle = 'rgba(25,35,55,.55)';
  ctx.beginPath();
  ctx.moveTo(0, h*.58);
  ctx.lineTo(w*.18, h*.3);
  ctx.lineTo(w*.42, h*.48);
  ctx.lineTo(w*.68, h*.24);
  ctx.lineTo(w*.9, h*.42);
  ctx.lineTo(w, h*.38);
  ctx.lineTo(w, h*.58);
  ctx.closePath();
  ctx.fill();

  // 水面
  const water = ctx.createLinearGradient(0, h*.58, 0, h);
  water.addColorStop(0,  colors[0]+'cc');
  water.addColorStop(1, '#1a2a4a');
  ctx.fillStyle = water;
  ctx.fillRect(0, h*.58, w, h*.42);

  // 水面の反射
  ctx.strokeStyle = 'rgba(255,220,130,.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const ry = h * (.64 + i * .055);
    const rx = w * (.2 + (i%2)*.05);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(w - rx + w*.1, ry);
    ctx.stroke();
  }
}

function drawLakeSwan(ctx, w, h, colors) {
  // 空
  const sky = ctx.createLinearGradient(0, 0, 0, h*.5);
  sky.addColorStop(0, '#c8eaf8');
  sky.addColorStop(1, colors[0]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h*.5);

  // 水面
  const water = ctx.createLinearGradient(0, h*.5, 0, h);
  water.addColorStop(0, colors[1]);
  water.addColorStop(1, '#1a3a5c');
  ctx.fillStyle = water;
  ctx.fillRect(0, h*.5, w, h*.5);

  // 波紋
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1;
  [.3,.55,.72].forEach((cx, i) => {
    ctx.beginPath();
    ctx.ellipse(w*cx, h*(.65+i*.08), w*.12, h*.02, 0, 0, Math.PI*2);
    ctx.stroke();
  });

  // 白鳥①
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(w*.38, h*.63, w*.13, h*.065, -.15, 0, Math.PI*2);
  ctx.fill();
  // 首
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w*.48, h*.635);
  ctx.bezierCurveTo(w*.52, h*.54, w*.46, h*.46, w*.44, h*.43);
  ctx.stroke();
  // くちばし
  ctx.strokeStyle = '#e8a020';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(w*.44, h*.43);
  ctx.lineTo(w*.4, h*.415);
  ctx.stroke();
  ctx.restore();

  // 白鳥②（少し奥）
  ctx.save();
  ctx.globalAlpha = .8;
  ctx.fillStyle = '#f0f8ff';
  ctx.beginPath();
  ctx.ellipse(w*.65, h*.68, w*.1, h*.05, .1, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#f0f8ff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w*.73, h*.68);
  ctx.bezierCurveTo(w*.76, h*.61, w*.72, h*.57, w*.7, h*.54);
  ctx.stroke();
  ctx.restore();
}

function drawLakeDawn(ctx, w, h, colors) {
  // 夜明け前の空
  const sky = ctx.createLinearGradient(0, 0, 0, h*.55);
  sky.addColorStop(0,   '#0d0d1a');
  sky.addColorStop(.55, colors[1]);
  sky.addColorStop(1,   colors[0]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h*.55);

  // 星
  ctx.fillStyle = 'rgba(255,245,200,.85)';
  [[.1,.09],[.28,.04],[.76,.07],[.92,.19],[.52,.03],[.64,.14]].forEach(([sx,sy]) => {
    ctx.beginPath();
    ctx.arc(w*sx, h*sy, 1.2, 0, Math.PI*2);
    ctx.fill();
  });

  // 地平線グロー
  const glow = ctx.createRadialGradient(w*.5, h*.55, 0, w*.5, h*.55, w*.65);
  glow.addColorStop(0,   'rgba(255,170,60,.75)');
  glow.addColorStop(.6, 'rgba(200,80,30,.2)');
  glow.addColorStop(1,  'rgba(200,80,30,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, h*.2, w, h*.5);

  // 山シルエット
  ctx.fillStyle = 'rgba(8,12,28,.85)';
  ctx.beginPath();
  ctx.moveTo(0, h*.55);
  ctx.lineTo(w*.14, h*.28);
  ctx.lineTo(w*.38, h*.44);
  ctx.lineTo(w*.6,  h*.22);
  ctx.lineTo(w*.82, h*.38);
  ctx.lineTo(w, h*.32);
  ctx.lineTo(w, h*.55);
  ctx.closePath();
  ctx.fill();

  // 水面
  const water = ctx.createLinearGradient(0, h*.55, 0, h);
  water.addColorStop(0, 'rgba(255,140,50,.45)');
  water.addColorStop(1, '#050a14');
  ctx.fillStyle = water;
  ctx.fillRect(0, h*.55, w, h*.45);
}

function drawForest(ctx, w, h, colors) {
  // 空
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, w, h*.38);

  // 緑の背景
  const bg = ctx.createLinearGradient(0, h*.3, 0, h);
  bg.addColorStop(0, colors[1]);
  bg.addColorStop(1, colors[0]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, h*.3, w, h*.7);

  // 木漏れ日（光芒）
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const ax = w * (.08 + i*.17);
    const ang = (i - 2.5) * .12;
    ctx.save();
    ctx.translate(ax, 0);
    ctx.rotate(ang);
    const opacity = .06 + (i === 2 || i === 3 ? .07 : 0);
    ctx.fillStyle = `rgba(255,245,180,${opacity})`;
    ctx.fillRect(-10, 0, 20, h);
    ctx.restore();
  }
  ctx.restore();

  // 木（シルエット）
  const trees = [.02,.16,.3,.48,.64,.78,.94];
  trees.forEach((tx, i) => {
    const th = h * (.46 + (i%3)*.1);
    const tw = w * .11;
    const x  = w * tx;
    ctx.fillStyle = `rgba(15,35,15,${.65 + (i%2)*.2})`;
    ctx.fillRect(x - tw*.08, h - th*.18, tw*.16, th*.18);
    ctx.beginPath();
    ctx.moveTo(x, h - th);
    ctx.lineTo(x - tw/2, h - th*.18);
    ctx.lineTo(x + tw/2, h - th*.18);
    ctx.closePath();
    ctx.fill();
  });

  // 草地
  const grass = ctx.createLinearGradient(0, h*.8, 0, h);
  grass.addColorStop(0, colors[0]+'99');
  grass.addColorStop(1, colors[0]);
  ctx.fillStyle = grass;
  ctx.fillRect(0, h*.82, w, h*.18);
}

function drawForestDeep(ctx, w, h, colors) {
  // 深い森の背景
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, colors[0]);
  bg.addColorStop(1, '#040e06');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // もや
  const mist = ctx.createLinearGradient(0, h*.68, 0, h);
  mist.addColorStop(0, 'rgba(180,230,200,0)');
  mist.addColorStop(1, 'rgba(180,230,200,.28)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, h*.68, w, h*.32);

  // 木
  for (let i = 0; i < 9; i++) {
    const x  = w * (i/8);
    const th = h * (.52 + Math.sin(i*1.9)*.13);
    ctx.fillStyle = `rgba(4,18,5,${.72 + (i%2)*.18})`;
    ctx.beginPath();
    ctx.moveTo(x, h - th);
    ctx.lineTo(x - w*.09, h);
    ctx.lineTo(x + w*.09, h);
    ctx.closePath();
    ctx.fill();
  }

  // 光の柱
  ctx.save();
  ctx.globalAlpha = .12;
  ctx.fillStyle = '#b8f0c0';
  ctx.beginPath();
  ctx.moveTo(w*.44, 0);
  ctx.lineTo(w*.56, 0);
  ctx.lineTo(w*.68, h);
  ctx.lineTo(w*.32, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawShrine(ctx, w, h, colors) {
  // 夜空
  const sky = ctx.createLinearGradient(0, 0, 0, h*.62);
  sky.addColorStop(0,  '#0d0408');
  sky.addColorStop(.5, '#3a0a0a');
  sky.addColorStop(1,  colors[0]+'88');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h*.62);

  // 星
  ctx.fillStyle = 'rgba(255,240,210,.8)';
  [[.12,.08],[.72,.05],[.88,.17],[.06,.22],[.5,.02],[.38,.13]].forEach(([sx,sy]) => {
    ctx.beginPath();
    ctx.arc(w*sx, h*sy, 1.3, 0, Math.PI*2);
    ctx.fill();
  });

  // 地面
  const ground = ctx.createLinearGradient(0, h*.62, 0, h);
  ground.addColorStop(0, '#2a1008');
  ground.addColorStop(1, '#100605');
  ctx.fillStyle = ground;
  ctx.fillRect(0, h*.62, w, h*.38);

  // 参道
  ctx.fillStyle = 'rgba(160,140,120,.25)';
  ctx.fillRect(w*.42, h*.62, w*.16, h*.38);

  // 鳥居（赤）
  const toriiColor = colors[0];
  const gw  = w * .64;
  const gx  = (w - gw) / 2;
  const gy  = h * .1;
  const gh  = h * .5;
  const pw  = w * .055;

  ctx.fillStyle = toriiColor;

  // 左柱
  ctx.fillRect(gx, gy + gh*.16, pw, gh*.84);
  // 右柱
  ctx.fillRect(gx + gw - pw, gy + gh*.16, pw, gh*.84);

  // 笠木（上）― 曲線
  ctx.beginPath();
  ctx.moveTo(gx - w*.04, gy + gh*.08);
  ctx.quadraticCurveTo(w*.5, gy - gh*.04, gx + gw + w*.04, gy + gh*.08);
  ctx.lineTo(gx + gw + w*.04, gy + gh*.18);
  ctx.quadraticCurveTo(w*.5, gy + gh*.06, gx - w*.04, gy + gh*.18);
  ctx.closePath();
  ctx.fill();

  // 貫（下の横木）
  ctx.fillRect(gx + pw*.4, gy + gh*.3, gw - pw*.8, pw*.65);

  // 提灯
  ctx.fillStyle = 'rgba(255,180,60,.45)';
  [[gx + pw*.5, gy + gh*.52],[gx + gw - pw*.5, gy + gh*.52]].forEach(([lx,ly]) => {
    ctx.beginPath();
    ctx.ellipse(lx, ly, pw*.8, pw*.95, 0, 0, Math.PI*2);
    ctx.fill();
  });
}

function drawUserDefault(ctx, w, h, colors) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, colors[0]);
  bg.addColorStop(1, colors[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // カメラアイコン
  const cx = w/2, cy = h*.48;
  const bw = w*.48, bh = h*.3;
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.strokeStyle = 'rgba(255,255,255,.65)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  roundRect(ctx, cx - bw/2, cy - bh/2, bw, bh, 8);
  ctx.fill(); ctx.stroke();

  // レンズ
  ctx.beginPath();
  ctx.arc(cx, cy, h*.09, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fill(); ctx.stroke();

  // ファインダー
  ctx.beginPath();
  roundRect(ctx, cx - bw*.14, cy - bh/2 - h*.055, bw*.28, h*.07, 4);
  ctx.fill(); ctx.stroke();
}

// ctx.roundRect polyfill（iOS 15 以下対応）
function roundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r);
    ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h);
    ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r);
    ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }
}

const ICON_DRAWERS = {
  'lake-sunset':  drawLakeSunset,
  'lake-swan':    drawLakeSwan,
  'lake-dawn':    drawLakeDawn,
  'forest':       drawForest,
  'forest-deep':  drawForestDeep,
  'shrine':       drawShrine,
  'user-default': drawUserDefault,
};

// ── テキスト折り返し ──────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const chars = [...text];
  const lines = [];
  let line = '';
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

// ── AR 用チェキ Canvas（同期）─────────────────────────────────────
function createChekiCanvas(card) {
  const canvas = document.createElement('canvas');
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  _paintCheki(ctx, card, null);
  return canvas;
}

// ── AR 用チェキ Canvas（ユーザー写真あり・非同期）─────────────────
function createChekiCanvasAsync(card) {
  return new Promise(resolve => {
    if (!card.photoDataUrl) {
      resolve(createChekiCanvas(card));
      return;
    }
    const img = new Image();
    img.onload  = () => resolve(_buildUserPhotoCanvas(img, card));
    img.onerror = () => resolve(createChekiCanvas(card));
    img.src = card.photoDataUrl;
  });
}

function _buildUserPhotoCanvas(img, card) {
  const canvas = document.createElement('canvas');
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  _paintCheki(ctx, card, img);
  return canvas;
}

function _formatCardDate(timestamp) {
  if (!timestamp) return '';
  const d     = new Date(timestamp);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return '今日';
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function _paintCheki(ctx, card, photoImg) {
  const pad  = 8;
  const phW  = CANVAS_W - pad*2;

  // 白い枠
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 写真エリア（クリップ）
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad, pad, phW, PHOTO_H);
  ctx.clip();

  if (photoImg) {
    // カバーフィット
    const scale = Math.max(phW / photoImg.width, PHOTO_H / photoImg.height);
    const dx = pad + (phW - photoImg.width  * scale) / 2;
    const dy = pad + (PHOTO_H - photoImg.height * scale) / 2;
    ctx.drawImage(photoImg, dx, dy, photoImg.width * scale, photoImg.height * scale);
  } else {
    const drawer = ICON_DRAWERS[card.icon] || drawUserDefault;
    ctx.save();
    ctx.translate(pad, pad);
    drawer(ctx, phW, PHOTO_H, card.colors || ['#c8a882','#e8d5b8']);
    ctx.restore();
  }
  ctx.restore();

  // コメントテキスト（最大2行）
  ctx.fillStyle = '#3d2b1f';
  ctx.font = `11px 'Hiragino Mincho ProN', serif`;
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, card.comment, phW - 4);
  lines.slice(0, 2).forEach((ln, i) => {
    ctx.fillText(ln, pad, PHOTO_H + pad + 6 + i * 15);
  });

  // 投稿者名（左）・日付（右）
  const authorName = card.author ? card.author.split('・')[0] : '';
  const dateStr    = _formatCardDate(card.createdAt);
  ctx.fillStyle    = '#aaa';
  ctx.font         = `9px 'Hiragino Mincho ProN', serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign    = 'left';
  ctx.fillText(authorName, pad, CANVAS_H - pad);
  ctx.textAlign    = 'right';
  ctx.fillText(dateStr, CANVAS_W - pad, CANVAS_H - pad);
  ctx.textAlign    = 'left';
}

// ── モーダル用大きい Canvas（写真エリアのみ・3倍解像度）──────────
function createModalCanvas(card) {
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width  = CANVAS_W * scale;
  canvas.height = PHOTO_H  * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  const drawer = ICON_DRAWERS[card.icon];
  if (drawer) {
    drawer(ctx, CANVAS_W, PHOTO_H, card.colors || ['#c8a882','#e8d5b8']);
  } else {
    ctx.fillStyle = '#e8e0d5';
    ctx.fillRect(0, 0, CANVAS_W, PHOTO_H);
  }
  return canvas;
}

// ── テクスチャ更新（編集後のメッシュ再描画用）────────────────────
async function refreshChekiTexture(mesh, card) {
  const canvas = await createChekiCanvasAsync(card);
  if (!mesh.material || !mesh.material.map) return;
  // 既存テクスチャの canvas を差し替えて needsUpdate するのが Three.js の推奨
  mesh.material.map.image = canvas;
  mesh.material.map.needsUpdate = true;
}
