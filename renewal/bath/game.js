// 티노코코 글자 목욕 — 흙 묻은 친구를 스펀지로 씻기는 목욕 놀이 (한글 놀이터)
//  욕조 위 목욕 매트에 진흙·물감이 묻은 친구(공룡·고래·동물) 한 마리가 들어옴. 손가락으로 쓱쓱 문지르면
//  손가락 아래 스펀지와 거품이 따라오고 얼룩이 하나씩 사라짐. 깨끗해지면 반짝 + 이름 읽기 + 이름표,
//  잠시 뒤 친구가 욕조로 풍덩. 두 마리를 씻기면 샤워 → 축하 → 다음 판(다른 얼룩).
//  실패·시간제한 없음. 티노·코코·오리를 누르면 반응. 쌍둥이는 욕조 물 속에 앉아 있음 (티노 왼쪽, 코코 오른쪽).
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const HG = window.H;
const DIRT = ['mud', 'paint', 'leaf', 'sand'];
const SPOTS = [[-0.22, -0.2], [0.2, -0.22], [0, 0.02], [-0.2, 0.25], [0.22, 0.24], [0, -0.32]];
TKP.init({ id: 'bath', place: 'bath', twins: null, idlePose: 'happy',
  preload: ['bg_bath', 'o_tub', 'o_towel', 'o_sponge', 'o_mud', 'o_paint', 'o_leafpile', 'o_sand', 'o_shower', 'o_foam', 'o_duck'], music: null });
let dirtIdx = 0, phase = 'play', phaseT = 0, rounds = 0, squeakT = 0, duck = { hop: -1 };
let tub = {}, friends = [], ci = 0, cur = null, tubs = [], spots = [], rubWig = 0;

function layout() {
  const W = TK.W, H2 = TK.H, port = W < H2;
  tub.w = Math.min(W * 0.92, H2 * 1.25); tub.h = tub.w * 0.3;
  tub.x = W / 2; tub.rim = H2 * (port ? 0.72 : 0.8);
}
/* 쌍둥이 자리: 욕조 물 속 (티노 왼쪽, 코코 오른쪽) */
function twinPos(i) {
  const W = TK.W, H2 = TK.H, port = W < H2;
  const h = Math.min(H2 * 0.5, tub.w * (port ? 0.56 : 0.4)), dx = tub.w * (port ? 0.24 : 0.21);
  return { x: W / 2 + (i ? dx : -dx), yb: tub.rim + h * 0.36, h };
}
/* 지금 친구가 서는 자리: 밑변 가운데 (cx, yb), 키 h */
function geom() {
  const W = TK.W, H2 = TK.H, port = W < H2;
  return port ? { cx: W / 2, yb: H2 * 0.5, h: Math.min(W * 0.55, H2 * 0.28) } : { cx: W / 2, yb: H2 * 0.52, h: Math.min(H2 * 0.4, W * 0.26) };
}
/* 친구 그림 상자 폭: 그림 비율대로 (고래는 1.4 정도) */
function boxW(w, h) {
  const im = HG.picImg ? HG.picImg(w) : null;
  if (im) return Math.min(h * 1.5, h * im.naturalWidth / im.naturalHeight);
  return /고래/.test(w) ? h * 1.4 : h;
}
/* 슬라이드로 들어오는 동안의 가로 이동 */
function slideX(f) { return f && f.st === 'in' ? (1 - TK.ease(clamp(f.t / 0.5, 0, 1))) * f.dir * TK.W * 0.62 : 0; }
function curBox() {
  const g = geom(), w = cur ? boxW(cur.w, g.h) : g.h, cx = g.cx + slideX(cur);
  return { x: cx - w / 2, y: g.yb - g.h, w, h: g.h, cx };
}
function newFriend(w) { return { w, st: 'in', t: 0, hop: -1, dir: Math.random() < 0.5 ? -1 : 1, tx: 0, rd: 0 }; }
function makeSpots() {
  const kind = DIRT[dirtIdx];
  spots = SPOTS.map(([fx, fy]) => ({ fx: fx + rand(-0.03, 0.03), fy: fy + rand(-0.03, 0.03), d: 1, kind, c: TK.pick(TK.COLS), rot: rand(0, 6.28), grow: 0, wig: 0 }));
}
function nextFriend() {
  cur = friends[ci] ? newFriend(friends[ci]) : null;
  if (cur) { makeSpots(); sfx.rustle && sfx.rustle(); } else spots = [];
}
function newRound() {
  let ws = HG.pick(2, { pic: true, cat: ['animal'] }).map(o => o.w);
  if (ws.length < 2) ws = ['오리', '하마'];
  friends = ws; ci = 0; tubs = []; cur = null; phase = 'play'; phaseT = 0;
  nextFriend();
}
const spotXY = s => { const b = curBox(); return { x: b.cx + s.fx * b.w, y: b.y + b.h * 0.5 + s.fy * b.h, r: b.h * 0.17 }; };
const nearBox = (x, y, k) => { if (!cur) return false; const b = curBox(); return Math.abs(x - b.cx) < b.w * 0.5 * k && Math.abs(y - (b.y + b.h / 2)) < b.h * 0.5 * k; };
const spongeOn = () => { if (!cur || cur.st !== 'dirty') return null; for (const p of TK.pointers.values()) if (p.down && nearBox(p.x, p.y, 1.2)) return p; return null; };
const duckPos = () => { const ti = tubImg(); if (ti) return { x: tub.x + ti.w * 0.42 * 0.78, y: ti.y + ti.h * 0.194 - TK.hopY(duck.hop, ti.h * 0.25) + tub.h * 0.12 }; return duckPos0(); };
const duckPos0 = () => ({ x: tub.x + tub.w * 0.4, y: tub.rim - tub.h * 0.02 - TK.hopY(duck.hop, tub.h * 0.5) });
/* 물 타원 (손그림 욕조): 가운데 y, 가로·세로 반지름 */
function waterEll() {
  const ti = tubImg();
  if (ti) return { cx: tub.x, wy: ti.y + ti.h * 0.155, rx: ti.w * 0.42, ry: ti.h * 0.078 };
  return { cx: tub.x, wy: tub.rim + tub.h * 0.03, rx: tub.w * 0.46, ry: tub.h * 0.17 };
}
/* 욕조 속 친구 i (n마리 중) 의 가로 위치 */
function tubSlotX(i, n) { const e = waterEll(); return e.cx + (n < 2 ? 0 : (i ? 1 : -1) * e.rx * 0.2); }
const tubH = () => geom().h * 0.42;

function rubAt(x, y, amount) {
  if (phase !== 'play' || !cur || cur.st !== 'dirty') return false;
  let hit = false;
  spots.forEach(s => {
    if (s.d <= 0) return;
    const p = spotXY(s);
    if (TK.dist(x, y, p.x, p.y) < p.r * 1.5) {
      s.d = Math.max(0, s.d - amount); hit = true; s.wig = 0.25;
      if (s.d <= 0) { sfx.ting(TK.pick([1046.5, 1174.7, 1318.5, 1568])); TK.spark(p.x, p.y, [255, 255, 255], 6, 0.7); checkClean(); }
    }
  });
  if (hit) rubWig = 0.25;
  return hit;
}
function checkClean() {
  if (!cur || cur.st !== 'dirty' || !spots.every(s => s.d <= 0)) return;
  const b = curBox();
  cur.st = 'clean'; cur.t = 0; cur.rd = 0;
  sfx.sparkle(); HG.read(cur.w);
  TKP.found(b.cx, b.y, { side: ci % 2, pose: 'splash' });
}
const friendTag = (w, maxW, cap) => { const n = [...w].length, a = Math.min(cap, maxW / (n * 1.02 + 0.7)); return n > 4 ? a / Math.max(0.5, 4.5 / n) : a; };

TK.input({
  down(p) {
    p.lx = p.x; p.ly = p.y;
    const d = duckPos();
    if (TK.dist(p.x, p.y, d.x, d.y - tub.h * 0.12) < tub.h * 0.35) {
      duck.hop = 0;
      if (HG.likes('고래')) { sfx.splash(); for (let k = 0; k < 14; k++) TK.parts.push({ t: 'drop', x: d.x + rand(-5, 5), y: d.y - tub.h * 0.45, vx: rand(-70, 70) * TK.U, vy: -rand(220, 360) * TK.U, r: rand(3, 6) * TK.U, life: 0.9, max: 0.9, c: [140, 205, 255], g: 700, delay: k * 0.01 }); HG.read('고래'); }
      else { sfx.squeak(); TK.tone(900, 0.05, 0.12, 'square', 0.06, 1400); HG.read('오리'); }
      return;
    }
    if (TKP.tap(p.x, p.y)) return;
    if (cur && nearBox(p.x, p.y, 1.0)) {
      if (cur.st === 'dirty') { rubAt(p.x, p.y, 0.3); TK.foam(p.x, p.y, 4); sfx.squeak(); return; }
      if (cur.st === 'clean') { HG.read(cur.w); cur.hop = 0; sfx.sparkle(); TK.spark(p.x, p.y, TK.pick(TK.COLS), 8, 0.8); return; }
      TK.ring(p.x, p.y, 14 * TK.U, [255, 255, 255]); sfx.soft(); return;
    }
    TKP.tapEmpty(p.x, p.y);
  },
  move(p) {
    if (!p.down) return;
    const m = TK.dist(p.x, p.y, p.lx, p.ly);
    if (m < 2) return;
    const r = geom().h * 0.17;
    if (rubAt(p.x, p.y, m / (r * 3.2)) || (cur && cur.st === 'dirty' && nearBox(p.x, p.y, 1.0))) {   /* 한 얼룩을 두세 번 쓱쓱 하면 깨끗 */
      if (Math.random() < 0.6) TK.foam(p.x, p.y, 1);
      if (TK.T - squeakT > 0.09) { sfx.squeak(); squeakT = TK.T; }
    }
    p.lx = p.x; p.ly = p.y;
  },
  key() {
    const left = spots.filter(s => s.d > 0); if (!left.length || phase !== 'play' || !cur || cur.st !== 'dirty') return;
    const s = TK.pick(left), q = spotXY(s); TK.foam(q.x, q.y, 6); sfx.squeak(); rubAt(q.x, q.y, 0.5);
  },
});

/* 풍덩 도착: 욕조 속 친구가 되고 물방울 + 쌍둥이 첨벙 */
function landInTub() {
  const e = waterEll(), f = cur;
  sfx.splash();
  for (let k = 0; k < 14; k++) TK.parts.push({ t: 'drop', x: tubSlotX(tubs.length, tubs.length + 1) + rand(-12, 12) * TK.U, y: e.wy, vx: rand(-90, 90) * TK.U, vy: -rand(240, 380) * TK.U, r: rand(3, 6) * TK.U, life: 0.9, max: 0.9, c: [140, 205, 255], g: 700, delay: k * 0.01 });
  TKP.react('both', 'splash', 1.0);
  f.st = 'tub'; f.tx = tubSlotX(tubs.length, tubs.length + 1); f.t = 0;
  tubs.push(f); ci++; cur = null; spots = [];
  if (ci < friends.length) nextFriend();
  else { phase = 'wait'; phaseT = 0; }
}

function update(dt) {
  TKP.update(dt);
  phaseT += dt;
  if (duck.hop >= 0) { duck.hop += dt / 0.6; if (duck.hop > 1) duck.hop = -1; }
  rubWig = Math.max(0, rubWig - dt);
  spots.forEach(s => { s.grow = Math.min(1, s.grow + dt * 4); s.wig = Math.max(0, s.wig - dt); });
  tubs.forEach((f, i) => { f.t += dt; const n = tubs.length + (cur && cur.st === 'jump' ? 1 : 0); f.tx += (tubSlotX(i, n) - f.tx) * Math.min(1, dt * 6); });
  if (phase === 'play' && cur) {
    cur.t += dt;
    if (cur.hop >= 0) { cur.hop += dt / 0.5; if (cur.hop > 1) cur.hop = -1; }
    if (cur.st === 'in' && cur.t >= 0.5) { cur.st = 'dirty'; cur.t = 0; }
    else if (cur.st === 'clean') {
      const rt = [0, 0.3, 0.6];   /* 3번 반짝 링 */
      while (cur.rd < 3 && cur.t >= rt[cur.rd]) { const b = curBox(); TK.ring(b.cx, b.y + b.h * 0.5, b.h * 0.3, [255, 220, 90], 160 * TK.U); TK.spark(b.cx + rand(-0.4, 0.4) * b.w, b.y + rand(0.1, 0.9) * b.h, TK.pick(TK.COLS), 4, 0.8); cur.rd++; }
      if (cur.t >= 2.0) { cur.st = 'jump'; cur.t = 0; sfx.boing && sfx.boing(); }
    } else if (cur.st === 'jump' && cur.t >= 0.6) landInTub();
  }
  if (phase === 'wait' && phaseT > 2.2) { phase = 'shower'; phaseT = 0; }   /* 두 번째 친구가 풍덩 한 뒤 샤워 */
  if (phase === 'shower') {
    const hx = TK.W / 2;
    for (let i = 0; i < 4; i++) TK.parts.push({ t: 'drop', x: hx + rand(-tub.w * 0.38, tub.w * 0.38), y: TK.H * 0.12, vx: 0, vy: rand(300, 450) * TK.U, r: rand(3, 6) * TK.U, life: 1, max: 1, c: [150, 210, 255], g: 400 });
    if (Math.random() < dt * 6) sfx.splash();
    if (phaseT > 1.6) {
      phase = 'party'; phaseT = 0; rounds++;
      TK.parts.filter(p => p.t === 'foam').forEach(p => p.life = Math.min(p.life, 0.3));
      TKP.celebrate({ onDone: () => { dirtIdx = (dirtIdx + 1) % DIRT.length; newRound(); sfx.splash(); } });
    }
  }
}

function drawSpot(s) {
  if (s.d <= 0.01) return;
  const p = spotXY(s), r = p.r * TK.back(s.grow), a = clamp(s.d, 0, 1);
  const wg = s.wig > 0 ? Math.sin(s.wig * 40) * r * 0.15 : 0;
  ctx.save(); ctx.translate(p.x + wg, p.y); ctx.rotate(s.rot); ctx.globalAlpha = 0.35 + 0.65 * a;
  const sc = 0.6 + 0.4 * a;
  const art = { mud: 'o_mud', paint: 'o_paint', leaf: 'o_leafpile', sand: 'o_sand' }[s.kind];   /* 손그림 얼룩 */
  if (H.drawObj(ctx, art, 0, r * 0.95 * sc, r * 1.9 * sc, r * 2.5 * sc)) { ctx.restore(); return; }
  if (s.kind === 'mud') {
    ctx.fillStyle = '#8a5a33';
    ell(0, 0, r * sc, r * 0.85 * sc); ctx.fill(); ell(r * 0.6 * sc, r * 0.3 * sc, r * 0.5 * sc, r * 0.42 * sc); ctx.fill(); ell(-r * 0.55 * sc, r * 0.25 * sc, r * 0.42 * sc, r * 0.36 * sc); ctx.fill();
    ell(-r * 0.2 * sc, -r * 0.25 * sc, r * 0.25 * sc, r * 0.15 * sc); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
  } else if (s.kind === 'paint') {
    ctx.fillStyle = TK.rgba(s.c, 1);
    ell(0, 0, r * sc, r * sc); ctx.fill();
    for (let k = 0; k < 5; k++) { const ang = k * 1.26; ell(Math.cos(ang) * r * 1.05 * sc, Math.sin(ang) * r * 1.05 * sc, r * 0.24 * sc, r * 0.24 * sc); ctx.fill(); }
  } else if (s.kind === 'leaf') {
    for (let k = 0; k < 2; k++) { ctx.save(); ctx.rotate(k * 1.4); ell(0, 0, r * 1.1 * sc, r * 0.55 * sc); ctx.fillStyle = k ? '#7cc576' : '#e8a33a'; ctx.fill(); ctx.restore(); }
  } else {
    ctx.fillStyle = '#d9b26a';
    ell(0, 0, r * 0.9 * sc, r * 0.8 * sc); ctx.fill();
    ctx.fillStyle = '#c49a50'; for (let k = 0; k < 10; k++) { const ang = k * 2.4, rr = r * (0.2 + (k % 5) * 0.15) * sc; ell(Math.cos(ang) * rr, Math.sin(ang) * rr, r * 0.12, r * 0.12); ctx.fill(); }
  }
  ctx.restore();
}
function drawBg() {
  const W = TK.W, H2 = TK.H;
  if (H.drawBg(ctx, 'bg_bath', 0, 0, W, H2, 0.5, 1)) {   // 손그림 목욕탕 + 샤워기
    const sh = H.lazyImg('o_shower');
    if (sh) { const h = H2 * (W < H2 ? 0.13 : 0.2), w = h * sh.naturalWidth / sh.naturalHeight; ctx.save(); ctx.translate(W / 2 + w * 0.15, H2 * 0.02); ctx.drawImage(sh, -w / 2, 0, w, h); ctx.restore(); }
    return;
  }
  ctx.fillStyle = '#d8f1ff'; ctx.fillRect(0, 0, W, H2);
  const t = Math.max(40, W / 14);
  ctx.strokeStyle = 'rgba(120,180,220,.35)'; ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += t) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, tub.rim); ctx.stroke(); }
  for (let y = 0; y <= tub.rim; y += t) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#bfe0f2'; ctx.fillRect(0, tub.rim + tub.h * 0.4, W, H2);
  const hx = W / 2, hy = H2 * 0.1;
  ctx.strokeStyle = '#a9b8c6'; ctx.lineWidth = Math.max(6, 10 * TK.U); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(W * 0.9, 0); ctx.lineTo(W * 0.9, hy * 0.6); ctx.lineTo(hx + tub.w * 0.1, hy * 0.6); ctx.stroke();
  TK.rr(hx - tub.w * 0.12, hy * 0.6, tub.w * 0.24, hy * 0.45, hy * 0.2); ctx.fillStyle = '#c7d3de'; ctx.fill();
  for (let k = 0; k < 6; k++) { ell(hx - tub.w * 0.09 + k * tub.w * 0.036, hy * 0.98, 2.5 * TK.U, 2.5 * TK.U); ctx.fillStyle = '#7f8fa0'; ctx.fill(); }
}
// 손그림 욕조: 테두리가 tub.rim 에 오게. 아이들은 그림 앞면 뒤로 들어가 물에 앉은 것처럼
function tubImg() { const im = H.lazyImg('o_tub'); if (!im) return null; const w = tub.w * (TK.W < TK.H ? 1.04 : 0.9), h = w * im.naturalHeight / im.naturalWidth; return { im, w, h, x: tub.x - w / 2, y: tub.rim - h * 0.1 }; }
function drawTubBack() {
  if (tubImg()) return;
  ell(tub.x, tub.rim, tub.w * 0.5, tub.h * 0.22); ctx.fillStyle = '#e9f3fb'; ctx.fill();
  ell(tub.x, tub.rim + tub.h * 0.03, tub.w * 0.46, tub.h * 0.17); ctx.fillStyle = '#9fd6f5'; ctx.fill();
}
function drawTubFront() {
  const x0 = tub.x - tub.w * 0.5, y0 = tub.rim, ti = tubImg();
  if (ti) {
    ctx.drawImage(ti.im, ti.x, ti.y, ti.w, ti.h);
    for (const [fx, k] of [[0.16, 1], [0.86, 0.8]]) H.drawObj(ctx, 'o_foam', x0 + tub.w * fx, y0 + tub.h * 0.12 + Math.sin(TK.T * 2 + fx * 9) * 2, tub.h * 0.55 * k, tub.w * 0.25);
    const d = duckPos(), s2 = tub.h * 0.55;
    if (H.likes('고래')) { ctx.save(); ctx.translate(d.x, d.y + s2 * 0.1); ctx.scale(-1, 1); H.drawPic(ctx, '고래', s2); ctx.restore(); }
    else H.drawObj(ctx, 'o_duck', d.x, d.y + s2 * 0.12, s2, s2 * 1.4);
    return;
  }
  ctx.save(); ell(tub.x, tub.rim + tub.h * 0.03, tub.w * 0.46, tub.h * 0.17); ctx.clip();
  ctx.fillStyle = 'rgba(140,205,245,.85)'; ctx.fillRect(x0, y0 - tub.h * 0.05, tub.w, tub.h);
  ctx.restore();
  for (let k = 0; k < 9; k++) { const fx = x0 + tub.w * (0.1 + k * 0.1), fr = tub.h * (0.08 + (k % 3) * 0.03); ell(fx, y0 - tub.h * 0.02 + Math.sin(TK.T * 2 + k) * 2, fr, fr * 0.8); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + tub.w, y0);
  ctx.quadraticCurveTo(x0 + tub.w, y0 + tub.h, x0 + tub.w * 0.85, y0 + tub.h); ctx.lineTo(x0 + tub.w * 0.15, y0 + tub.h);
  ctx.quadraticCurveTo(x0, y0 + tub.h, x0, y0); ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#cfe2f0'; ctx.lineWidth = 3; ctx.stroke();
  TK.rr(x0 - tub.w * 0.01, y0 - tub.h * 0.06, tub.w * 1.02, tub.h * 0.12, tub.h * 0.06); ctx.fillStyle = '#f4f9fd'; ctx.fill(); ctx.stroke();
  for (const fx of [0.2, 0.8]) { ell(x0 + tub.w * fx, y0 + tub.h * 1.02, tub.w * 0.04, tub.h * 0.08); ctx.fillStyle = '#e3b04b'; ctx.fill(); }
  const d = duckPos(), s = tub.h * 0.22;
  if (H.likes('고래')) { ctx.save(); ctx.translate(d.x, d.y + s * 0.15); ctx.scale(-1, 1); H.drawPic(ctx, '고래', s * 2.4); ctx.restore(); return; }   /* 장난감 고래 (누르면 물을 뿜음) */
  ell(d.x, d.y - s * 0.5, s * 1.0, s * 0.6); ctx.fillStyle = '#ffd84a'; ctx.fill();
  ell(d.x - s * 0.5, d.y - s * 1.15, s * 0.5, s * 0.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(d.x - s * 0.95, d.y - s * 1.15); ctx.lineTo(d.x - s * 1.3, d.y - s * 1.05); ctx.lineTo(d.x - s * 0.95, d.y - s * 0.98); ctx.fillStyle = '#ff9a3c'; ctx.fill();
  ell(d.x - s * 0.6, d.y - s * 1.25, s * 0.08, s * 0.08); ctx.fillStyle = '#222'; ctx.fill();
}

/* 친구 그림 (밑변 가운데 (x,yb), 키 h) */
function drawFriend(f, x, yb, h, rot) {
  ctx.save(); ctx.translate(x, yb); if (rot) ctx.rotate(rot); HG.drawPic(ctx, f.w, h); ctx.restore();
}
/* 풍덩 도중 친구 위치·크기 */
function jumpPose(f) {
  const g = geom(), e = waterEll(), k = TK.ease(clamp(f.t / 0.6, 0, 1)), n = tubs.length + 1;
  const x1 = tubSlotX(tubs.length, n), y1 = e.wy + e.ry * 0.55, sc = 1 - 0.58 * k;
  return { x: g.cx + (x1 - g.cx) * k, y: g.yb + (y1 - g.yb) * k - Math.sin(Math.PI * k) * g.h * 0.55, h: g.h * sc };
}
/* 욕조 속 친구: 머리만 (물 타원 clip 안에서 그림) */
function drawTubFriends() {
  const e = waterEll();
  tubs.forEach((f, i) => {
    const wob = Math.sin(TK.T * 2.2 + i * 2) * e.rx * 0.012, up = f.t < 0.35 ? Math.sin(f.t / 0.35 * Math.PI) * tubH() * 0.12 : 0;
    drawFriend(f, f.tx + wob, e.wy + e.ry * 0.55 - TK.bob(i, tubH() * 0.03, 2.5) - up, tubH(), Math.sin(TK.T * 1.8 + i) * 0.03);
  });
}
function drawMat() {
  const g = geom(), tw = H_towelW(g.h);
  HG.drawObj(ctx, 'o_towel', g.cx, g.yb + tw * 0.648 * 0.3, tw * 0.648, tw);
}
const H_towelW = h => h * 1.05;
function drawCurFriend() {
  if (!cur || cur.st === 'jump' || cur.st === 'tub') return;
  const b = curBox(), hy = TK.hopY(cur.hop, b.h * 0.12), bob = cur.st === 'in' ? Math.abs(Math.sin(cur.t * 18)) * b.h * 0.04 : 0;
  const rot = rubWig > 0 ? Math.sin(TK.T * 34) * 0.035 : 0, k = cur.st === 'clean' ? 1 + 0.025 * Math.sin(cur.t * 9) : 1;
  ctx.save(); ctx.translate(b.cx, b.y + b.h - hy - bob); ctx.scale(k, k); if (rot) ctx.rotate(rot); HG.drawPic(ctx, cur.w, b.h); ctx.restore();
}
function drawTag() {
  if (!cur || cur.st !== 'clean') return;
  const b = curBox(), size = friendTag(cur.w, TK.W * 0.8, b.h * 0.17), a = clamp(cur.t / 0.2, 0, 1);
  ctx.save(); ctx.globalAlpha = a;
  HG.drawTag(ctx, cur.w, TK.W / 2, b.y + b.h - size * 0.3, size, { hi: HG.hi(cur.w) });
  ctx.restore();
}
function drawSponge() {
  const p = spongeOn(); if (!p) return;
  const im = HG.lazyImg('o_sponge'); if (!im) return;
  const h = geom().h * 0.28, w = h * im.naturalWidth / im.naturalHeight, mv = clamp(TK.dist(p.x, p.y, p.lx || p.x, p.ly || p.y) / (12 * TK.U), 0, 1);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(TK.T * 16) * 0.25 * (0.4 + mv) - 0.2);
  ctx.drawImage(im, -w / 2, -h * 0.55, w, h); ctx.restore();
}
function drawTwinsIn(clipOn) {
  [0, 1].forEach(i => { const q = twinPos(i); TKP.drawTwin(i, q.x, q.yb, q.h, phase === 'shower' ? { pose: 'splash' } : {}); });
}
// 손그림 욕조: 욕조 → 물 타원 안쪽으로만 보이는 티노·코코·욕조 속 친구 → 물빛 덧칠 → 거품·오리 (아이들이 물에 앉은 모습)
//  o_tub 그림에서 물 타원: 세로 8%~23%, 가운데 15.5%, 가로 반지름 폭의 42%
function drawTubArt() {
  const ti = tubImg(), cx = tub.x, wy = ti.y + ti.h * 0.155, rx = ti.w * 0.42, ry = ti.h * 0.078;
  ctx.drawImage(ti.im, ti.x, ti.y, ti.w, ti.h);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, TK.W, wy); ctx.ellipse(cx, wy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  drawTwinsIn();
  drawTubFriends();
  ctx.beginPath(); ctx.rect(0, wy - ry * 0.15, TK.W, TK.H); ctx.clip();   /* 물 아래로 잠긴 부분은 물빛으로 */
  ell(cx, wy, rx, ry); ctx.fillStyle = 'rgba(160,212,248,.72)'; ctx.fill();
  for (let k = 0; k < 7; k++) { const fx = cx - rx * 0.8 + k * rx * 0.27; ell(fx, wy - ry * 0.05 + Math.sin(TK.T * 2.2 + k) * ry * 0.06, rx * 0.12, ry * 0.18); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }
  ctx.restore();
  for (const [fx, k] of [[-0.62, 1], [0.66, 0.8]]) H.drawObj(ctx, 'o_foam', cx + rx * fx, wy + ry * 0.9 + Math.sin(TK.T * 2 + fx * 9) * 2, ti.h * 0.32 * k, ti.w * 0.22);
  const d = { x: cx + rx * 0.78, y: wy + ry * 0.5 - TK.hopY(duck.hop, ti.h * 0.25) }, s2 = ti.h * 0.3;
  if (H.likes('고래')) { ctx.save(); ctx.translate(d.x, d.y); ctx.scale(-1, 1); H.drawPic(ctx, '고래', s2); ctx.restore(); }
  else H.drawObj(ctx, 'o_duck', d.x, d.y, s2, s2 * 1.4);
}
function draw() {
  drawBg();
  drawMat();
  drawCurFriend();
  spots.forEach(drawSpot);
  if (tubImg()) drawTubArt();
  else {
    drawTubBack();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, TK.W, tub.rim + tub.h * 0.05); ctx.clip();
    drawTwinsIn(); drawTubFriends();
    ctx.restore();
    if (tubImg()) drawTubFront(); else TK.ink(Math.max(2, TK.U * 3.2), drawTubFront);
  }
  if (cur && cur.st === 'jump') { const q = jumpPose(cur); drawFriend(cur, q.x, q.y, q.h, Math.sin(cur.t * 14) * 0.12); }
  drawTag();
  drawSponge();
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get spots() { return spots.map(s => ({ d: s.d, ...spotXY(s) })); }, get words() { return friends.slice(); },
  get cur() { return cur ? cur.w : ''; }, get st() { return cur ? cur.st : (phase === 'play' ? 'none' : phase); }, get inTub() { return tubs.length; },
  get sponge() { return !!spongeOn(); },
  get box() { const b = curBox(); return { x: b.x, y: b.y, w: b.w, h: b.h }; },
  actions() {   /* 자동 확인용: 남은 얼룩 하나를 좌우로 문지르는 경로 */
    if (phase !== 'play' || !cur || cur.st !== 'dirty') return [];
    const s = spots.find(s => s.d > 0); if (!s) return [];
    const p = spotXY(s), pts = [];
    for (let k = 0; k <= 12; k++) pts.push({ x: p.x + Math.sin(k * 1.6) * p.r * 1.2, y: p.y + (k % 2 ? 2 : -2) });
    return [{ type: 'path', pts }];
  },
};
/* 별 시범: 가장 더러운 얼룩을 쓱쓱 */
window.__demo = () => {
  if (phase !== 'play' || !cur || cur.st !== 'dirty') return null;
  const s = spots.filter(s => s.d > 0).sort((a, b) => b.d - a.d)[0]; if (!s) return null;
  const p = spotXY(s), pts = [];
  for (let k = 0; k <= 8; k++) pts.push({ x: p.x + (k % 2 ? 1 : -1) * p.r * 1.4, y: p.y + (k - 4) * p.r * 0.08 });
  return { kind: 'path', pts, say: '쓱쓱 문질러 봐!', sayKey: 'rub' };
};
TK.start({ resize: layout, init() { layout(); newRound(); }, update, draw });
})();
