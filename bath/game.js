// 티노코코 글자 목욕 — 문지르기 하나로 노는 목욕 놀이 (한글 놀이터)
//  욕조 위 벽에 진흙이 묻은 타일 두 장. 손가락으로 쓱쓱 문지르면 거품이 나며 얼룩이 지워지고
//  밑에 숨어 있던 그림과 단어가 드러나 "오, 리. 오리!" 하고 읽어준다.
//  두 장 다 깨끗해지면 샤워기 물이 쏴아 → 반짝 축하 → 다음엔 다른 단어, 다른 얼룩(물감·나뭇잎·모래·진흙).
//  실패·시간제한 없음. 티노·코코·오리를 누르면 반응.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const DIRT = ['mud', 'paint', 'leaf', 'sand'];
let dirtIdx = 0, phase = 'appear', phaseT = 0, rounds = 0, squeakT = 0, duck = { hop: -1 };
let tub = {}, twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }], tiles = [], spots = [];

function layout() {
  const W = TK.W, H2 = TK.H, port = W < H2;
  tub.w = Math.min(W * 0.92, H2 * 1.25); tub.h = tub.w * 0.3;
  tub.x = W / 2; tub.rim = H2 * (port ? 0.72 : 0.8);
  const h = Math.min(H2 * 0.5, tub.w * (port ? 0.56 : 0.4)), dx = tub.w * (port ? 0.24 : 0.21);
  twins[0].x = W / 2 - dx; twins[1].x = W / 2 + dx;
  twins.forEach(t => { t.h = h; t.yb = tub.rim + h * 0.36; });
  const ts = port ? Math.min(W * 0.4, H2 * 0.2) : Math.min(W * 0.19, H2 * 0.3);
  const tdx = port ? W * 0.24 : tub.w * 0.32, ty = port ? H2 * 0.33 : H2 * 0.3;
  tiles.forEach((t, i) => { t.x = W / 2 + (i ? tdx : -tdx); t.y = ty; t.s = ts; });
}
function newRound() {
  const kind = DIRT[dirtIdx];
  tiles = H.pick(2, { pic: true }).map(o => ({ w: o.w, clean: false, done: 0 }));
  layout();
  spots = [];
  tiles.forEach((t, ti) => {
    [[-0.22, -0.2], [0.2, -0.22], [0, 0.02], [-0.2, 0.25], [0.22, 0.24], [0, -0.32]].forEach(([fx, fy]) =>
      spots.push({ ti, fx: fx + rand(-0.03, 0.03), fy: fy + rand(-0.03, 0.03), d: 1, kind, c: TK.pick(TK.COLS), rot: rand(0, 6.28), grow: 0, wig: 0 }));
  });
}
const spotXY = s => { const t = tiles[s.ti]; return { x: t.x + s.fx * t.s, y: t.y + s.fy * t.s, r: t.s * 0.2 }; };
const lift = tw => TK.hopY(tw.hop, tw.h * 0.12) + (phase === 'party' ? TK.bob(tw.kind === 'tino' ? 0 : 1.4, tw.h * 0.1, 7) : TK.bob(tw.kind === 'tino' ? 0 : 1.4, tw.h * 0.015));

function rubAt(x, y, amount) {
  if (phase !== 'play') return false;
  let hit = false;
  spots.forEach(s => {
    if (s.d <= 0) return;
    const p = spotXY(s);
    if (TK.dist(x, y, p.x, p.y) < p.r * 1.5) {
      s.d = Math.max(0, s.d - amount); hit = true;
      if (s.d <= 0) { sfx.ting(TK.pick([1046.5, 1174.7, 1318.5, 1568])); TK.spark(p.x, p.y, [255, 255, 255], 6, 0.7); checkTile(s.ti); }
    }
  });
  return hit;
}
function checkTile(ti) {
  const t = tiles[ti];
  if (!t.clean && spots.every(s => s.ti !== ti || s.d <= 0)) {
    t.clean = true; t.done = TK.T; H.read(t.w);
    const tw = t.x < TK.W / 2 ? twins[0] : twins[1]; tw.hop = 0; sfx.giggle(tw.kind, 0.1); TK.spark(t.x, t.y, TK.pick(TK.COLS), 12, 0.9);
    if (tiles.every(q => q.clean)) { phase = 'wait'; phaseT = 0; }
  }
}
const overTile = (x, y) => tiles.some(t => Math.abs(x - t.x) < t.s * 0.55 && Math.abs(y - t.y) < t.s * 0.55);
const duckPos = () => ({ x: tub.x + tub.w * 0.4, y: tub.rim - tub.h * 0.02 - TK.hopY(duck.hop, tub.h * 0.5) });

TK.input({
  down(p) {
    p.lx = p.x; p.ly = p.y;
    const d = duckPos();
    if (TK.dist(p.x, p.y, d.x, d.y - tub.h * 0.12) < tub.h * 0.3) { duck.hop = 0; sfx.squeak(); TK.tone(900, 0.05, 0.12, 'square', 0.06, 1400); H.read('오리'); return; }
    const tile = tiles.find(t => t.clean && Math.abs(p.x - t.x) < t.s * 0.55 && Math.abs(p.y - t.y) < t.s * 0.55);
    if (tile && phase === 'play' || tile && phase === 'wait') { H.read(tile.w); return; }
    if (rubAt(p.x, p.y, 0.3) || overTile(p.x, p.y)) { TK.foam(p.x, p.y, 4); sfx.squeak(); return; }
    const tw = twins.find(t => Math.abs(p.x - t.x) < t.h * 0.3 && p.y > t.yb - t.h && p.y < tub.rim);
    if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); H.read(tw.kind === 'tino' ? '티노' : '코코'); return; }
    TK.ring(p.x, p.y, 14 * TK.U, [255, 255, 255]); sfx.soft();
  },
  move(p) {
    if (!p.down) return;
    const m = TK.dist(p.x, p.y, p.lx, p.ly);
    if (m < 2) return;
    const r = tiles.length ? tiles[0].s * 0.2 : 30;
    if (rubAt(p.x, p.y, m / (r * 3.2)) || overTile(p.x, p.y)) {   // 한 얼룩을 두세 번 쓱쓱 하면 깨끗
      if (Math.random() < 0.6) TK.foam(p.x, p.y, 1);
      if (TK.T - squeakT > 0.09) { sfx.squeak(); squeakT = TK.T; }
    }
    p.lx = p.x; p.ly = p.y;
  },
  key() {
    const left = spots.filter(s => s.d > 0); if (!left.length || phase !== 'play') return;
    const s = TK.pick(left), q = spotXY(s); TK.foam(q.x, q.y, 6); sfx.squeak(); rubAt(q.x, q.y, 0.5);
  },
});

function update(dt) {
  phaseT += dt;
  twins.forEach(tw => { if (tw.hop >= 0) { tw.hop += dt / 0.5; if (tw.hop > 1) tw.hop = -1; } });
  if (duck.hop >= 0) { duck.hop += dt / 0.6; if (duck.hop > 1) duck.hop = -1; }
  spots.forEach(s => { s.grow = Math.min(1, s.grow + dt * 4); s.wig = Math.max(0, s.wig - dt); });
  if (phase === 'appear' && phaseT > 0.9) { phase = 'play'; phaseT = 0; }
  if (phase === 'wait' && phaseT > 2.2) { phase = 'shower'; phaseT = 0; }   // 두 번째 단어를 다 읽고 나서 샤워
  if (phase === 'shower') {
    const hx = TK.W / 2;
    for (let i = 0; i < 4; i++) TK.parts.push({ t: 'drop', x: hx + rand(-tub.w * 0.38, tub.w * 0.38), y: TK.H * 0.12, vx: 0, vy: rand(300, 450) * TK.U, r: rand(3, 6) * TK.U, life: 1, max: 1, c: [150, 210, 255], g: 400 });
    if (Math.random() < dt * 6) sfx.splash();
    if (phaseT > 1.6) { phase = 'party'; phaseT = 0; rounds++; sfx.fanfare(); twins.forEach(t => t.hop = 0); TK.parts.filter(p => p.t === 'foam').forEach(p => p.life = Math.min(p.life, 0.3)); }
  }
  if (phase === 'party') {
    TK.confetti(dt);
    if (phaseT > 3.2) { phase = 'appear'; phaseT = 0; dirtIdx = (dirtIdx + 1) % DIRT.length; newRound(); sfx.splash(); twins.forEach(t => t.hop = 0); }
  }
}

function drawSpot(s) {
  if (s.d <= 0.01) return;
  const p = spotXY(s), r = p.r * TK.back(s.grow), a = clamp(s.d, 0, 1);
  const wg = s.wig > 0 ? Math.sin(s.wig * 40) * r * 0.15 : 0;
  ctx.save(); ctx.translate(p.x + wg, p.y); ctx.rotate(s.rot); ctx.globalAlpha = 0.35 + 0.65 * a;
  const sc = 0.6 + 0.4 * a;
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
function drawTile(t) {
  const s = t.s, x0 = t.x - s / 2, y0 = t.y - s / 2;
  TK.rr(x0, y0, s, s, s * 0.12); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = Math.max(3, s * 0.03); ctx.strokeStyle = t.clean ? '#ffc93c' : '#bcd9ec'; ctx.stroke();
  ctx.save(); ctx.translate(t.x, y0 + s * 0.66); const k = t.clean ? 1 + 0.06 * Math.sin(TK.T * 5) : 1; ctx.scale(k, k); H.drawPic(ctx, t.w, s * 0.55); ctx.restore();
  H.drawWord(ctx, t.w, t.x, y0 + s * 0.84, s * 0.15, { hi: t.clean ? H.hi(t.w) : -1, color: '#2b3550' });
}
function drawBg() {
  const W = TK.W, H2 = TK.H;
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
function drawTubBack() {
  ell(tub.x, tub.rim, tub.w * 0.5, tub.h * 0.22); ctx.fillStyle = '#e9f3fb'; ctx.fill();
  ell(tub.x, tub.rim + tub.h * 0.03, tub.w * 0.46, tub.h * 0.17); ctx.fillStyle = '#9fd6f5'; ctx.fill();
}
function drawTubFront() {
  const x0 = tub.x - tub.w * 0.5, y0 = tub.rim;
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
  ell(d.x, d.y - s * 0.5, s * 1.0, s * 0.6); ctx.fillStyle = '#ffd84a'; ctx.fill();
  ell(d.x - s * 0.5, d.y - s * 1.15, s * 0.5, s * 0.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(d.x - s * 0.95, d.y - s * 1.15); ctx.lineTo(d.x - s * 1.3, d.y - s * 1.05); ctx.lineTo(d.x - s * 0.95, d.y - s * 0.98); ctx.fillStyle = '#ff9a3c'; ctx.fill();
  ell(d.x - s * 0.6, d.y - s * 1.25, s * 0.08, s * 0.08); ctx.fillStyle = '#222'; ctx.fill();
}
function draw() {
  drawBg();
  tiles.forEach(drawTile);
  spots.forEach(drawSpot);
  drawTubBack();
  twins.forEach(tw => {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, TK.W, tub.rim + tub.h * 0.05); ctx.clip();
    TK.twin(tw.kind, phase === 'party' || tw.hop >= 0 ? 'happy' : 'jump', tw.x, tw.yb - lift(tw), tw.h);
    ctx.restore();
  });
  drawTubFront();
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get spots() { return spots.map(s => ({ d: s.d, ...spotXY(s) })); }, get words() { return tiles.map(t => t.w); },
  actions() {   // 자동 확인용: 남은 얼룩 하나를 좌우로 문지르는 경로
    if (phase !== 'play') return [];
    const s = spots.find(s => s.d > 0); if (!s) return [];
    const p = spotXY(s), pts = [];
    for (let k = 0; k <= 12; k++) pts.push({ x: p.x + Math.sin(k * 1.6) * p.r * 1.2, y: p.y + (k % 2 ? 2 : -2) });
    return [{ type: 'path', pts }];
  },
};
// 별 시범: 가장 더러운 얼룩을 쓱쓱
window.__demo = () => {
  if (phase !== 'play') return null;
  const s = spots.filter(s => s.d > 0).sort((a, b) => b.d - a.d)[0]; if (!s) return null;
  const p = spotXY(s), pts = [];
  for (let k = 0; k <= 8; k++) pts.push({ x: p.x + (k % 2 ? 1 : -1) * p.r * 1.4, y: p.y + (k - 4) * p.r * 0.08 });
  return { kind: 'path', pts, say: '쓱쓱 문질러 봐!' };
};
TK.start({ resize: layout, init() { newRound(); }, update, draw });
})();
