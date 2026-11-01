// 티노코코 그림자 짝꿍 — 끌어다 놓기 하나로 노는 모양 맞추기
//  아래 쟁반의 색깔 모양을 끌어 위쪽의 같은 모양 그림자에 가져가면 자석처럼 딱 붙고 이름을 말해준다("사과!").
//  다른 그림자에 놓으면 쟁반으로 스르륵 돌아갈 뿐. 넷 다 채우면 그림들이 살아 움직이고 다음 모양 묶음으로.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const SETS = [['apple', 'fish', 'star', 'heart'], ['moon', 'flower', 'house', 'cloud'], ['sun', 'tree', 'car', 'boat']];
const NAME = { apple: '사과', fish: '물고기', star: '별', heart: '하트', moon: '달', flower: '꽃', house: '집', cloud: '구름', sun: '해', tree: '나무', car: '자동차', boat: '배' };
let setIdx = 0, phase = 'play', phaseT = 0, rounds = 0, lastSnap = 0, S = 50;
let slots = [], pieces = [], twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }];

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  S = port ? Math.min(W * 0.14, H * 0.08) : Math.min(W * 0.06, H * 0.12);
  const sp = port ? [[0.3, 0.2], [0.7, 0.2], [0.3, 0.37], [0.7, 0.37]] : [[0.24, 0.3], [0.42, 0.3], [0.6, 0.3], [0.78, 0.3]];
  const pp = port ? [[0.3, 0.7], [0.7, 0.7], [0.3, 0.87], [0.7, 0.87]] : [[0.26, 0.76], [0.42, 0.76], [0.58, 0.76], [0.74, 0.76]];
  slots.forEach((s, i) => { s.x = sp[i][0] * W; s.y = sp[i][1] * H; });
  pieces.forEach(p => { p.hx = pp[p.home][0] * W; p.hy = pp[p.home][1] * H; if (p.st === 'home') { p.x = p.hx; p.y = p.hy; } if (p.st === 'placed') { p.x = slots[p.slot].x; p.y = slots[p.slot].y; } });
  twins[0].x = port ? W * 0.13 : W * 0.08; twins[1].x = port ? W * 0.87 : W * 0.92;
  twins.forEach(t => { t.h = port ? H * 0.17 : H * 0.42; t.yb = port ? H * 0.58 : H * 0.98; });
}
function newSet() {
  const kinds = SETS[setIdx];
  slots = TK.shuffle(kinds).map(kind => ({ kind, x: 0, y: 0 }));
  const homes = TK.shuffle([0, 1, 2, 3]);
  pieces = kinds.map((kind, i) => ({ kind, home: homes[i], slot: slots.findIndex(s => s.kind === kind), st: 'appear', t: 0, x: 0, y: 0, ptr: null, wig: 0, pulse: 0 }));
  layout();
  pieces.forEach(p => { p.x = p.hx; p.y = p.hy; });
}
function snap(p) {
  p.st = 'fly'; p.t = 0; p.fx = p.x; p.fy = p.y; p.ptr = null; lastSnap = TK.T;
  sfx.ting(TK.pick([1046.5, 1174.7, 1318.5, 1568])); TK.say(NAME[p.kind] + '!');
  const tw = slots[p.slot].x < TK.W / 2 ? twins[0] : twins[1]; tw.hop = 0; sfx.giggle(tw.kind, 0.15);
}
const pieceAt = (x, y) => pieces.filter(p => p.st === 'home' && TK.dist(x, y, p.x, p.y) < S * 1.25).sort((a, b) => TK.dist(x, y, a.x, a.y) - TK.dist(x, y, b.x, b.y))[0];
const nearOwn = (p, k) => TK.dist(p.x, p.y, slots[p.slot].x, slots[p.slot].y) < S * k;

TK.input({
  down(p) {
    if (phase !== 'play') return;
    const q = pieceAt(p.x, p.y);
    if (q) { q.st = 'drag'; q.ptr = p.id; q.ox = q.x - p.x; q.oy = q.y - p.y; sfx.rustle(); return; }
    const placed = pieces.find(q => q.st === 'placed' && TK.dist(p.x, p.y, q.x, q.y) < S * 1.2);
    if (placed) { placed.pulse = 1; TK.say(NAME[placed.kind]); return; }
    const tw = twins.find(t => Math.abs(p.x - t.x) < t.h * 0.3 && p.y > t.yb - t.h && p.y < t.yb);
    if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); return; }
    TK.ring(p.x, p.y, 14 * TK.U, [255, 200, 120]); sfx.soft();
  },
  move(p) {
    const q = pieces.find(q => q.st === 'drag' && q.ptr === p.id); if (!q) return;
    q.x = p.x + q.ox; q.y = p.y + q.oy;
    if (nearOwn(q, 1.0)) snap(q);   // 제 그림자 가까이 오면 자석처럼 딱
  },
  up(p) {
    const q = pieces.find(q => q.st === 'drag' && q.ptr === p.id); if (!q) return;
    if (nearOwn(q, 1.7)) snap(q); else { q.st = 'back'; q.t = 0; q.fx = q.x; q.fy = q.y; q.ptr = null; sfx.down(); }
  },
  key() { const q = pieces.find(q => q.st === 'home'); if (q && phase === 'play') snap(q); },
});

function update(dt) {
  phaseT += dt;
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  pieces.forEach(p => {
    p.wig = Math.max(0, p.wig - dt); p.pulse = Math.max(0, p.pulse - dt * 2);
    if (p.st === 'appear') { p.t += dt / 0.4; if (p.t >= 1) p.st = 'home'; }
    if (p.st === 'fly' || p.st === 'back') {
      p.t += dt / (p.st === 'fly' ? 0.25 : 0.4);
      const to = p.st === 'fly' ? slots[p.slot] : { x: p.hx, y: p.hy }, e = TK.ease(p.t);
      p.x = TK.lerp(p.fx, to.x, e); p.y = TK.lerp(p.fy, to.y, e);
      if (p.t >= 1) { if (p.st === 'fly') { p.st = 'placed'; p.pulse = 1; TK.spark(p.x, p.y, TK.pick(TK.COLS), 10, 0.8); } else p.st = 'home'; }
    }
  });
  if (phase === 'play' && pieces.every(p => p.st === 'placed')) { phase = 'party'; phaseT = 0; sfx.fanfare(); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') {
    TK.confetti(dt);
    if (phaseT > 3.4) { phase = 'play'; phaseT = 0; rounds++; setIdx = (setIdx + 1) % SETS.length; newSet(); sfx.sparkle(); lastSnap = TK.T; }
  }
}

// 모양 그리기 (가운데 (x,y), 크기 s). sil=true 면 그림자(한 색, 눈 없음)
function shape(kind, x, y, s, sil, alive) {
  const dark = 'rgba(70,55,85,.45)';
  const C = (c) => sil ? dark : c;
  const t = TK.T;
  ctx.save(); ctx.translate(x, y);
  if (alive) { ctx.rotate(Math.sin(t * 6 + x) * 0.12); const b = 1 + 0.08 * Math.sin(t * 8 + y); ctx.scale(b, b); }
  const eyes = (ex, ey, r) => { if (sil) return; for (const sd of [-1, 1]) { ell(ex + sd * r * 2.2, ey, r, r); ctx.fillStyle = '#fff'; ctx.fill(); ell(ex + sd * r * 2.2, ey + r * 0.15, r * 0.55, r * 0.55); ctx.fillStyle = '#222'; ctx.fill(); } };
  if (kind === 'apple') {
    ctx.fillStyle = C('#8a5a33'); ctx.fillRect(-s * 0.06, -s * 0.95, s * 0.12, s * 0.35);
    ell(s * 0.25, -s * 0.85, s * 0.25, s * 0.12, -0.5); ctx.fillStyle = C('#5fbf5a'); ctx.fill();
    ell(-s * 0.35, s * 0.05, s * 0.6, s * 0.72); ctx.fillStyle = C('#ff5a5f'); ctx.fill(); ell(s * 0.35, s * 0.05, s * 0.6, s * 0.72); ctx.fill();
    eyes(0, -s * 0.05, s * 0.1);
  } else if (kind === 'fish') {
    ctx.beginPath(); ctx.moveTo(s * 0.55, 0); ctx.lineTo(s * 1.05, -s * 0.5); ctx.lineTo(s * 1.05, s * 0.5); ctx.closePath(); ctx.fillStyle = C('#ff8c42'); ctx.fill();
    ell(-s * 0.1, 0, s * 0.8, s * 0.55); ctx.fillStyle = C('#ffa552'); ctx.fill();
    if (!sil) { ell(-s * 0.45, -s * 0.1, s * 0.12, s * 0.12); ctx.fillStyle = '#fff'; ctx.fill(); ell(-s * 0.47, -s * 0.08, s * 0.06, s * 0.06); ctx.fillStyle = '#222'; ctx.fill(); }
  } else if (kind === 'star') {
    TK.star(0, s * 0.05, s * 1.05, C('#ffd84a')); eyes(0, 0, s * 0.08);
  } else if (kind === 'heart') {
    TK.heart(0, s * 0.1, s * 0.95, C('#ff7aa8')); eyes(0, -s * 0.05, s * 0.09);
  } else if (kind === 'moon') {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.9, Math.PI * 0.3, Math.PI * 1.7); ctx.arc(s * 0.45, 0, s * 0.7, Math.PI * 1.55, Math.PI * 0.45, true); ctx.closePath();
    ctx.fillStyle = C('#ffe680'); ctx.fill();
    if (!sil) { ell(-s * 0.45, -s * 0.15, s * 0.07, s * 0.07); ctx.fillStyle = '#222'; ctx.fill(); }
  } else if (kind === 'flower') {
    for (let k = 0; k < 5; k++) { const a = k * TK.TAU / 5 - Math.PI / 2; ell(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.4, s * 0.4); ctx.fillStyle = C('#c38cff'); ctx.fill(); }
    ell(0, 0, s * 0.38, s * 0.38); ctx.fillStyle = C('#ffd84a'); ctx.fill(); eyes(0, -s * 0.03, s * 0.07);
  } else if (kind === 'house') {
    ctx.beginPath(); ctx.moveTo(-s * 0.95, -s * 0.1); ctx.lineTo(0, -s * 0.95); ctx.lineTo(s * 0.95, -s * 0.1); ctx.closePath(); ctx.fillStyle = C('#ff6b5e'); ctx.fill();
    ctx.fillStyle = C('#7fb8ff'); ctx.fillRect(-s * 0.7, -s * 0.12, s * 1.4, s * 0.95);
    if (!sil) { ctx.fillStyle = '#b98a5e'; ctx.fillRect(-s * 0.18, s * 0.3, s * 0.36, s * 0.53); ctx.fillStyle = '#fff6c2'; ctx.fillRect(s * 0.3, s * 0.05, s * 0.28, s * 0.25); }
  } else if (kind === 'cloud') {
    ctx.fillStyle = C('#e8f4ff');
    ell(0, -s * 0.2, s * 0.55, s * 0.5); ctx.fill(); ell(-s * 0.55, s * 0.1, s * 0.45, s * 0.38); ctx.fill(); ell(s * 0.55, s * 0.1, s * 0.45, s * 0.38); ctx.fill();
    ctx.fillRect(-s * 0.95, s * 0.05, s * 1.9, s * 0.43);
    if (!sil) { ctx.strokeStyle = '#b8d4ee'; ctx.lineWidth = 2; ell(0, -s * 0.2, s * 0.55, s * 0.5); ctx.stroke(); } eyes(0, 0, s * 0.08);
  } else if (kind === 'sun') {
    for (let k = 0; k < 8; k++) { const a = k * TK.TAU / 8 + (alive ? t : 0); ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.16); ctx.lineTo(s * 1.0, 0); ctx.lineTo(s * 0.6, s * 0.16); ctx.closePath(); ctx.fillStyle = C('#ff9f43'); ctx.fill(); ctx.restore(); }
    ell(0, 0, s * 0.62, s * 0.62); ctx.fillStyle = C('#ffd84a'); ctx.fill(); eyes(0, -s * 0.05, s * 0.08);
  } else if (kind === 'tree') {
    ctx.fillStyle = C('#9c6b42'); ctx.fillRect(-s * 0.15, s * 0.2, s * 0.3, s * 0.75);
    ell(0, -s * 0.25, s * 0.75, s * 0.7); ctx.fillStyle = C('#4fae55'); ctx.fill();
    if (!sil) for (const [dx, dy] of [[-0.3, -0.4], [0.3, -0.15], [0, -0.6]]) { ell(dx * s, dy * s, s * 0.09, s * 0.09); ctx.fillStyle = '#ff5a5f'; ctx.fill(); }
  } else if (kind === 'car') {
    TK.rr(-s * 0.55, -s * 0.6, s * 1.0, s * 0.5, s * 0.15); ctx.fillStyle = C('#3aa7ff'); ctx.fill();
    TK.rr(-s * 0.95, -s * 0.2, s * 1.9, s * 0.55, s * 0.2); ctx.fill();
    for (const sd of [-1, 1]) { ell(sd * s * 0.55, s * 0.38, s * 0.24, s * 0.24); ctx.fillStyle = C('#333'); ctx.fill(); }
    if (!sil) { ctx.fillStyle = '#d8f1ff'; ctx.fillRect(-s * 0.45, -s * 0.52, s * 0.35, s * 0.3); ctx.fillRect(-s * 0.02, -s * 0.52, s * 0.35, s * 0.3); }
  } else if (kind === 'boat') {
    ctx.fillStyle = C('#8a5a3a'); ctx.fillRect(-s * 0.04, -s * 0.95, s * 0.08, s * 0.85);
    ctx.beginPath(); ctx.moveTo(s * 0.06, -s * 0.9); ctx.lineTo(s * 0.7, -s * 0.15); ctx.lineTo(s * 0.06, -s * 0.15); ctx.closePath(); ctx.fillStyle = C('#ffffff'); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.95, -s * 0.05); ctx.lineTo(s * 0.95, -s * 0.05); ctx.lineTo(s * 0.65, s * 0.5); ctx.lineTo(-s * 0.65, s * 0.5); ctx.closePath(); ctx.fillStyle = C('#e9644f'); ctx.fill();
  }
  ctx.restore();
}
function drawBg() {
  const W = TK.W, H = TK.H, port = W < H;
  ctx.fillStyle = '#fff3d6'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(214,170,110,.18)'; ctx.lineWidth = 3;
  for (let y = 20; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 8, W * 0.6, y - 8, W, y + 4); ctx.stroke(); }
  // 그림판(위)과 쟁반(아래)
  const b = port ? { x: W * 0.08, y: H * 0.1, w: W * 0.84, h: H * 0.38 } : { x: W * 0.15, y: H * 0.1, w: W * 0.7, h: H * 0.4 };
  TK.rr(b.x, b.y, b.w, b.h, 22 * TK.U); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#f0c879'; ctx.lineWidth = 8 * TK.U; ctx.stroke();
  const t = port ? { x: W * 0.08, y: H * 0.61, w: W * 0.84, h: H * 0.35 } : { x: W * 0.18, y: H * 0.6, w: W * 0.64, h: H * 0.32 };
  TK.rr(t.x, t.y, t.w, t.h, 26 * TK.U); ctx.fillStyle = '#c99060'; ctx.fill();
  TK.rr(t.x + 10 * TK.U, t.y + 10 * TK.U, t.w - 20 * TK.U, t.h - 20 * TK.U, 20 * TK.U); ctx.fillStyle = '#e2b07c'; ctx.fill();
}
function draw() {
  drawBg();
  const alive = phase === 'party';
  slots.forEach(s => { if (!pieces.some(p => p.slot === slots.indexOf(s) && p.st === 'placed')) shape(s.kind, s.x, s.y, S, true); });
  pieces.filter(p => p.st === 'placed').forEach(p => shape(p.kind, p.x, p.y, S * (1 + p.pulse * 0.2), false, alive));
  twins.forEach((t, i) => TK.twin(t.kind, phase === 'party' || t.hop >= 0 ? 'happy' : 'idle', t.x, t.yb - TK.hopY(t.hop, t.h * 0.2) - (phase === 'party' ? TK.bob(i * 1.5, t.h * 0.1, 7) : TK.bob(i * 1.5, t.h * 0.02)), t.h, { face: i ? 'left' : 'right' }));
  pieces.filter(p => p.st !== 'placed').forEach(p => {
    const sc = p.st === 'appear' ? TK.back(p.t) : p.st === 'drag' ? 1.15 : 1, wg = p.wig > 0 ? Math.sin(p.wig * 40) * 0.15 : 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wg); ctx.scale(sc, sc);
    if (p.st === 'drag') { ell(S * 0.1, S * 1.05, S * 0.8, S * 0.2); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); }
    shape(p.kind, 0, 0, S, false); ctx.restore();
  });
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; },
  actions() {
    if (phase !== 'play') return [];
    const p = pieces.find(p => p.st === 'home'); if (!p) return [];
    const s = slots[p.slot], pts = [];
    for (let k = 0; k <= 14; k++) pts.push({ x: TK.lerp(p.x, s.x, k / 14), y: TK.lerp(p.y, s.y, k / 14) });
    return [{ type: 'path', pts, wait: 350 }];
  },
};
// 별 시범: 조각 하나를 제 그림자까지 끌고 가기
window.__demo = () => {
  if (phase !== 'play') return null;
  const p = pieces.find(p => p.st === 'home'); if (!p) return null;
  const s = slots[p.slot];
  return { kind: 'path', pts: [{ x: p.x, y: p.y }, { x: s.x, y: s.y }], say: '같은 모양에 쏙!' };
};
TK.start({ resize: layout, init() { newSet(); }, update, draw });
})();
