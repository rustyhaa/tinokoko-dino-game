// 티노코코 목욕탕 — 문지르기 하나로 노는 목욕 놀이
//  욕조 속 티노와 코코 몸에 묻은 얼룩을 손가락으로 문지르면 거품이 나며 지워진다.
//  둘 다 깨끗해지면 샤워기 물이 쏴아 → 반짝 축하 → 다음엔 다른 게(물감·나뭇잎·모래·진흙) 묻어서 온다.
//  실패·시간제한 없음. 한참 손을 안 대면 가장 더러운 얼룩이 들썩이며 알려준다.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const DIRT = ['mud', 'paint', 'leaf', 'sand'];
let dirtIdx = 0, phase = 'appear', phaseT = 0, rounds = 0, lastClean = 0, squeakT = 0, duck = { hop: -1 };
let tub = {}, twins = [], spots = [];

function layout() {
  const W = TK.W, H = TK.H;
  tub.w = Math.min(W * 0.92, H * 1.25); tub.h = tub.w * 0.3;
  const port = W < H;   // 세로 화면: 욕조를 올리고 둘을 크게
  tub.x = W / 2; tub.rim = H * (port ? 0.7 : 0.8);
  const h = Math.min(H * 0.56, tub.w * (port ? 0.56 : 0.44)), dx = tub.w * (port ? 0.24 : 0.21);
  twins = [{ kind: 'tino', x: W / 2 - dx }, { kind: 'coco', x: W / 2 + dx }].map((t, i) => Object.assign(twins[i] || { hop: -1, clean: false, cheer: 0 }, t, { h, yb: tub.rim + h * 0.36 }));
}
function makeSpots() {
  spots = [];
  const kind = DIRT[dirtIdx];
  twins.forEach((tw, ti) => {
    tw.clean = false;
    const pos = TK.shuffle([[-0.2, 0.18], [0.18, 0.2], [0, 0.32], [-0.22, 0.45], [0.2, 0.47], [0.02, 0.58], [-0.08, 0.12], [0.12, 0.6]]).slice(0, 6);
    pos.forEach(([fx, fy]) => spots.push({ ti, fx: fx + rand(-0.03, 0.03), fy: fy + rand(-0.02, 0.02), d: 1, kind, c: TK.pick(TK.COLS), rot: rand(0, 6.28), grow: 0, wig: 0 }));
  });
}
const spotXY = s => { const tw = twins[s.ti]; return { x: tw.x + s.fx * tw.h, y: tw.yb - tw.h + s.fy * tw.h - lift(tw), r: tw.h * 0.075 }; };
const lift = tw => TK.hopY(tw.hop, tw.h * 0.12) + (phase === 'party' ? TK.bob(tw.kind === 'tino' ? 0 : 1.4, tw.h * 0.1, 7) : TK.bob(tw.kind === 'tino' ? 0 : 1.4, tw.h * 0.015));

function rubAt(x, y, amount) {
  if (phase !== 'play') return false;
  let hit = false;
  spots.forEach(s => {
    if (s.d <= 0) return;
    const p = spotXY(s);
    if (TK.dist(x, y, p.x, p.y) < p.r * 1.7) {
      s.d = Math.max(0, s.d - amount); hit = true; lastClean = TK.T;
      if (s.d <= 0) { sfx.ting(TK.pick([1046.5, 1174.7, 1318.5, 1568])); TK.spark(p.x, p.y, [255, 255, 255], 8, 0.8); checkTwin(s.ti); }
    }
  });
  return hit;
}
function checkTwin(ti) {
  const tw = twins[ti];
  if (!tw.clean && spots.every(s => s.ti !== ti || s.d <= 0)) {
    tw.clean = true; tw.hop = 0; sfx.giggle(tw.kind, 0.1); TK.hearts(tw.x, tw.yb - tw.h * 1.05);
    if (twins.every(t => t.clean)) { phase = 'shower'; phaseT = 0; }
  }
}
const overTwin = (x, y) => twins.some(tw => Math.abs(x - tw.x) < tw.h * 0.32 && y > tw.yb - tw.h && y < tub.rim);
const duckPos = () => ({ x: tub.x + tub.w * 0.4, y: tub.rim - tub.h * 0.02 - TK.hopY(duck.hop, tub.h * 0.5) });

TK.input({
  down(p) {
    p.lx = p.x; p.ly = p.y;
    const d = duckPos();
    if (TK.dist(p.x, p.y, d.x, d.y - tub.h * 0.12) < tub.h * 0.3) { duck.hop = 0; sfx.squeak(); TK.tone(900, 0.05, 0.12, 'square', 0.06, 1400); return; }
    if (rubAt(p.x, p.y, 0.3) || overTwin(p.x, p.y)) { TK.foam(p.x, p.y, 4); sfx.squeak(); }
    else { TK.ring(p.x, p.y, 14 * TK.U, [255, 255, 255]); sfx.soft(); }
  },
  move(p) {
    if (!p.down) return;
    const m = TK.dist(p.x, p.y, p.lx, p.ly);
    if (m < 2) return;
    // 문지른 거리만큼 지워짐 (한 얼룩을 두세 번 쓱쓱 하면 깨끗)
    const r = twins[0].h * 0.075;
    const hit = rubAt(p.x, p.y, m / (r * 3.2));
    if (hit || overTwin(p.x, p.y)) {
      if (Math.random() < 0.6) TK.foam(p.x, p.y, 1);
      if (TK.T - squeakT > 0.09) { sfx.squeak(); squeakT = TK.T; }
    }
    p.lx = p.x; p.ly = p.y;
  },
  key() {   // 키보드: 아직 더러운 얼룩 하나를 쓱 문질러 줌
    const left = spots.filter(s => s.d > 0); if (!left.length || phase !== 'play') return;
    const s = TK.pick(left), q = spotXY(s); TK.foam(q.x, q.y, 6); sfx.squeak(); rubAt(q.x, q.y, 0.5);
  },
});

function update(dt) {
  phaseT += dt;
  twins.forEach(tw => { if (tw.hop >= 0) { tw.hop += dt / 0.5; if (tw.hop > 1) tw.hop = -1; } });
  if (duck.hop >= 0) { duck.hop += dt / 0.6; if (duck.hop > 1) duck.hop = -1; }
  spots.forEach(s => { s.grow = Math.min(1, s.grow + dt * 4); s.wig = Math.max(0, s.wig - dt); });
  if (phase === 'appear' && phaseT > 0.9) { phase = 'play'; phaseT = 0; lastClean = TK.T; }
  if (phase === 'shower') {
    const hx = TK.W / 2;
    for (let i = 0; i < 4; i++) TK.parts.push({ t: 'drop', x: hx + rand(-tub.w * 0.38, tub.w * 0.38), y: TK.H * 0.12, vx: 0, vy: rand(300, 450) * TK.U, r: rand(3, 6) * TK.U, life: 1, max: 1, c: [150, 210, 255], g: 400 });
    if (Math.random() < dt * 6) sfx.splash();
    if (phaseT > 1.8) { phase = 'party'; phaseT = 0; rounds++; sfx.fanfare(); TK.say('반짝반짝!'); twins.forEach(t => t.hop = 0); TK.parts.filter(p => p.t === 'foam').forEach(p => p.life = Math.min(p.life, 0.3)); }
  }
  if (phase === 'party') {
    TK.confetti(dt);
    if (phaseT > 3.2) { phase = 'appear'; phaseT = 0; dirtIdx = (dirtIdx + 1) % DIRT.length; makeSpots(); sfx.splash(); twins.forEach(t => t.hop = 0); }
  }
}

function drawSpot(s) {
  if (s.d <= 0.01) return;
  const p = spotXY(s), r = p.r * TK.back(s.grow), a = clamp(s.d, 0, 1);
  const wg = s.wig > 0 ? Math.sin(s.wig * 40) * r * 0.15 : 0;
  ctx.save(); ctx.translate(p.x + wg, p.y); ctx.rotate(s.rot); ctx.globalAlpha = 0.25 + 0.75 * a;
  const sc = 0.55 + 0.45 * a;
  if (s.kind === 'mud') {
    ctx.fillStyle = '#8a5a33';
    ell(0, 0, r * sc, r * 0.8 * sc); ctx.fill(); ell(r * 0.6 * sc, r * 0.3 * sc, r * 0.45 * sc, r * 0.38 * sc); ctx.fill(); ell(-r * 0.55 * sc, r * 0.25 * sc, r * 0.35 * sc, r * 0.3 * sc); ctx.fill();
    ell(-r * 0.2 * sc, -r * 0.25 * sc, r * 0.25 * sc, r * 0.15 * sc); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
  } else if (s.kind === 'paint') {
    ctx.fillStyle = TK.rgba(s.c, 1);
    ell(0, 0, r * sc, r * sc); ctx.fill();
    for (let k = 0; k < 5; k++) { const ang = k * 1.26; ell(Math.cos(ang) * r * 1.05 * sc, Math.sin(ang) * r * 1.05 * sc, r * 0.22 * sc, r * 0.22 * sc); ctx.fill(); }
  } else if (s.kind === 'leaf') {
    for (let k = 0; k < 2; k++) {
      ctx.save(); ctx.rotate(k * 1.4);
      ell(0, 0, r * 1.05 * sc, r * 0.5 * sc); ctx.fillStyle = k ? '#7cc576' : '#e8a33a'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * sc, 0); ctx.lineTo(r * sc, 0); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
  } else {
    ctx.fillStyle = '#d9b26a';
    for (let k = 0; k < 14; k++) { const ang = k * 2.4, rr = r * (0.2 + (k % 5) * 0.18) * sc; ell(Math.cos(ang) * rr, Math.sin(ang) * rr, r * 0.16, r * 0.16); ctx.fill(); }
  }
  ctx.restore();
}
function drawBg() {
  const W = TK.W, H = TK.H;
  ctx.fillStyle = '#d8f1ff'; ctx.fillRect(0, 0, W, H);
  const t = Math.max(40, W / 14);   // 타일
  ctx.strokeStyle = 'rgba(120,180,220,.35)'; ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += t) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, tub.rim); ctx.stroke(); }
  for (let y = 0; y <= tub.rim; y += t) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#bfe0f2'; ctx.fillRect(0, tub.rim + tub.h * 0.4, W, H);   // 바닥
  // 샤워기
  const hx = W / 2, hy = H * 0.1;
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
  // 물 표면 + 거품
  ctx.save(); ell(tub.x, tub.rim + tub.h * 0.03, tub.w * 0.46, tub.h * 0.17); ctx.clip();
  ctx.fillStyle = 'rgba(140,205,245,.85)'; ctx.fillRect(x0, y0 - tub.h * 0.05, tub.w, tub.h);
  ctx.restore();
  for (let k = 0; k < 9; k++) { const fx = x0 + tub.w * (0.1 + k * 0.1), fr = tub.h * (0.08 + (k % 3) * 0.03); ell(fx, y0 - tub.h * 0.02 + Math.sin(TK.T * 2 + k) * 2, fr, fr * 0.8); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill(); }
  // 욕조 몸통
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + tub.w, y0);
  ctx.quadraticCurveTo(x0 + tub.w, y0 + tub.h, x0 + tub.w * 0.85, y0 + tub.h); ctx.lineTo(x0 + tub.w * 0.15, y0 + tub.h);
  ctx.quadraticCurveTo(x0, y0 + tub.h, x0, y0); ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#cfe2f0'; ctx.lineWidth = 3; ctx.stroke();
  TK.rr(x0 - tub.w * 0.01, y0 - tub.h * 0.06, tub.w * 1.02, tub.h * 0.12, tub.h * 0.06); ctx.fillStyle = '#f4f9fd'; ctx.fill(); ctx.stroke();
  for (const fx of [0.2, 0.8]) { ell(x0 + tub.w * fx, y0 + tub.h * 1.02, tub.w * 0.04, tub.h * 0.08); ctx.fillStyle = '#e3b04b'; ctx.fill(); }
  // 고무 오리
  const d = duckPos(), s = tub.h * 0.22;
  ell(d.x, d.y - s * 0.5, s * 1.0, s * 0.6); ctx.fillStyle = '#ffd84a'; ctx.fill();
  ell(d.x - s * 0.5, d.y - s * 1.15, s * 0.5, s * 0.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(d.x - s * 0.95, d.y - s * 1.15); ctx.lineTo(d.x - s * 1.3, d.y - s * 1.05); ctx.lineTo(d.x - s * 0.95, d.y - s * 0.98); ctx.fillStyle = '#ff9a3c'; ctx.fill();
  ell(d.x - s * 0.6, d.y - s * 1.25, s * 0.08, s * 0.08); ctx.fillStyle = '#222'; ctx.fill();
}
function draw() {
  drawBg(); drawTubBack();
  twins.forEach(tw => {
    const pose = (tw.clean && phase !== 'play') || phase === 'party' ? 'happy' : (tw.clean ? 'happy' : 'jump');
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, TK.W, tub.rim + tub.h * 0.05); ctx.clip();
    TK.twin(tw.kind, pose, tw.x, tw.yb - lift(tw), tw.h);
    spots.filter(s => s.ti === twins.indexOf(tw)).forEach(drawSpot);
    if (tw.clean && phase !== 'appear') for (let k = 0; k < 3; k++) TK.star(tw.x + Math.cos(TK.T * 2 + k * 2.1) * tw.h * 0.3, tw.yb - tw.h * 0.75 + Math.sin(TK.T * 2 + k * 2.1) * tw.h * 0.2 - lift(tw), 6 * TK.U * (1 + 0.3 * Math.sin(TK.T * 6 + k)), 'rgba(255,255,255,.9)', TK.T);
    ctx.restore();
  });
  drawTubFront();
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get spots() { return spots.map(s => ({ d: s.d, ...spotXY(s) })); },
  actions() {   // 자동 확인용: 남은 얼룩 하나를 좌우로 세 번 문지르는 경로
    if (phase !== 'play') return [];
    const s = spots.find(s => s.d > 0); if (!s) return [];
    const p = spotXY(s), pts = [];
    for (let k = 0; k <= 12; k++) pts.push({ x: p.x + Math.sin(k * 1.6) * p.r * 1.4, y: p.y + (k % 2 ? 2 : -2) });
    return [{ type: 'path', pts }];
  },
};
// 별 시범: 가장 더러운 얼룩을 쓱쓱 (frame.js 가 처음과 한참 손 안 댈 때 보여줌)
window.__demo = () => {
  if (phase !== 'play') return null;
  const s = spots.filter(s => s.d > 0).sort((a, b) => b.d - a.d)[0]; if (!s) return null;
  const p = spotXY(s), pts = [];
  for (let k = 0; k <= 8; k++) pts.push({ x: p.x + (k % 2 ? 1 : -1) * p.r * 1.6, y: p.y + (k - 4) * p.r * 0.08 });
  return { kind: 'path', pts, say: '쓱쓱 문질러 봐!' };
};
TK.start({ resize: layout, init() { layout(); makeSpots(); }, update, draw });
})();
