// 티노코코 별자리 잇기 — 탭 하나로 노는 차분한 밤 놀이
//  크게 반짝이는 "다음 별"을 탭하면(또는 손가락으로 쓸고 지나가면) 선이 이어지고 음이 하나씩 올라간다.
//  다 이으면 고래·공룡·하트·물고기·별 별자리가 빛나며 살아 움직이고 다음 별자리로.
//  다른 별을 눌러도 반짝일 뿐. 한참 멈추면 별똥별이 다음 별을 알려준다.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const SHAPES = [
  { name: 'whale', say: '고래', col: [120, 190, 255], pts: [[.08, .55], [.22, .34], [.45, .28], [.68, .36], [.82, .5], [.93, .3], [.98, .62], [.84, .6], [.62, .72], [.32, .72]] },
  { name: 'dino', say: '공룡', col: [255, 214, 90], pts: [[.08, .78], [.22, .58], [.3, .32], [.45, .18], [.6, .26], [.55, .42], [.72, .5], [.92, .72], [.62, .78], [.36, .82]] },
  { name: 'heart', say: '하트', col: [255, 130, 170], pts: [[.5, .3], [.66, .14], [.86, .2], [.92, .42], [.72, .66], [.5, .86], [.28, .66], [.08, .42], [.14, .2], [.34, .14]] },
  { name: 'fish', say: '물고기', col: [255, 170, 90], pts: [[.06, .5], [.2, .3], [.45, .22], [.68, .32], [.82, .2], [.95, .5], [.82, .8], [.68, .68], [.45, .78], [.2, .7]] },
  { name: 'star', say: '별', col: [255, 240, 150], pts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.48; return [0.5 + Math.cos(a) * r, 0.52 + Math.sin(a) * r]; }) },
];
let shapeIdx = 0, phase = 'play', phaseT = 0, rounds = 0, done = 0, lastTap = 0, box = {}, lines = [], R = 10;
let twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }];
const bgStars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.8, s: 0.5 + Math.random() * 1.2, ph: Math.random() * 6 }));
let comet = null;

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  box = port ? { x: W * 0.06, y: H * 0.14, w: W * 0.88, h: H * 0.42 } : { x: W * 0.2, y: H * 0.06, w: W * 0.6, h: H * 0.6 };
  R = Math.min(W, H) * 0.022;
  twins.forEach((t, i) => { t.h = port ? H * 0.2 : H * 0.3; t.x = i ? W * (port ? 0.78 : 0.86) : W * (port ? 0.22 : 0.14); t.yb = H * 0.97; });
}
const P = i => { const p = SHAPES[shapeIdx].pts[i]; return { x: box.x + p[0] * box.w, y: box.y + p[1] * box.h }; };
const N = () => SHAPES[shapeIdx].pts.length;
const hitR = () => Math.max(34, R * 3.2);

function connect() {
  if (phase !== 'play' || done >= N()) return;
  const i = done, f = TK.PENTA[i % TK.PENTA.length];
  TK.tone(f * 2, 0, 0.6, 'sine', 0.22); TK.tone(f * 4, 0.02, 0.3, 'sine', 0.05);
  const p = P(i); TK.spark(p.x, p.y, [255, 245, 190], 8, 0.7);
  if (i > 0) lines.push({ a: i - 1, b: i, t: 0 });
  done++; lastTap = TK.T; comet = null;
  if (done % 3 === 0) { const tw = twins[(done / 3) % 2 | 0]; tw.hop = 0; }
  if (done === N()) { lines.push({ a: N() - 1, b: 0, t: 0 }); phase = 'complete'; phaseT = 0; }
}
function tapAt(x, y, isDown) {
  if (phase !== 'play') return;
  if (done < N()) { const p = P(done); if (TK.dist(x, y, p.x, p.y) < hitR()) { connect(); return; } }
  if (!isDown) return;
  for (let i = 0; i < N(); i++) { const p = P(i); if (TK.dist(x, y, p.x, p.y) < hitR() * 0.8) { TK.spark(p.x, p.y, [200, 220, 255], 5, 0.5); sfx.soft(); return; } }
  const tw = twins.find(t => Math.abs(x - t.x) < t.h * 0.3 && y > t.yb - t.h);
  if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); return; }
  TK.spark(x, y, [255, 255, 255], 4, 0.4); sfx.soft();
}
TK.input({ down(p) { tapAt(p.x, p.y, true); }, move(p) { if (p.down) tapAt(p.x, p.y, false); }, key() { connect(); } });

function update(dt) {
  phaseT += dt;
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  lines.forEach(l => l.t = Math.min(1, l.t + dt / 0.3));
  if (phase === 'complete' && phaseT > 0.5) { phase = 'party'; phaseT = 0; sfx.fanfare(); TK.say(SHAPES[shapeIdx].say + '!'); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') {
    if (Math.random() < dt * 25) { const p = P((Math.random() * N()) | 0); TK.spark(p.x, p.y, SHAPES[shapeIdx].col, 2, 0.5); }
    if (phaseT > 3.8) { phase = 'fade'; phaseT = 0; }
  }
  if (phase === 'fade' && phaseT > 0.8) { phase = 'play'; phaseT = 0; rounds++; shapeIdx = (shapeIdx + 1) % SHAPES.length; done = 0; lines = []; lastTap = TK.T; sfx.sparkle(); }
}

function draw() {
  const W = TK.W, H = TK.H;
  ctx.fillStyle = TK.grad(0, H, '#141c44', '#3b4b8c'); ctx.fillRect(0, 0, W, H);
  bgStars.forEach(s => { const a = 0.35 + 0.55 * Math.abs(Math.sin(TK.T * 1.3 + s.ph)); ell(s.x * W, s.y * H, s.s * TK.U * 1.5, s.s * TK.U * 1.5); ctx.fillStyle = `rgba(255,255,230,${a})`; ctx.fill(); });
  const mr = Math.min(W, H) * 0.05, mx = W * 0.9, my = H * 0.1;
  ell(mx, my, mr, mr); ctx.fillStyle = '#fff4c2'; ctx.fill(); ell(mx - mr * 0.45, my - mr * 0.2, mr * 0.88, mr * 0.88); ctx.fillStyle = '#18214f'; ctx.fill();
  // 언덕
  ctx.fillStyle = '#2f5d5a'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.88); ctx.quadraticCurveTo(W * 0.25, H * 0.8, W * 0.5, H * 0.87); ctx.quadraticCurveTo(W * 0.75, H * 0.93, W, H * 0.84); ctx.lineTo(W, H); ctx.fill();
  const sh = SHAPES[shapeIdx], alive = phase === 'party', fade = phase === 'fade' ? 1 - phaseT / 0.8 : 1;
  ctx.save(); ctx.globalAlpha = clamp(fade, 0, 1);
  if (alive || phase === 'fade') {   // 완성: 별자리 안을 은은하게 채우고 살짝 헤엄치듯
    ctx.save(); ctx.translate(Math.sin(TK.T * 1.5) * box.w * 0.03, Math.sin(TK.T * 2.2) * box.h * 0.02);
    ctx.beginPath(); for (let i = 0; i < N(); i++) { const p = P(i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.closePath();
    ctx.fillStyle = TK.rgba(sh.col, 0.25 + 0.1 * Math.sin(TK.T * 4)); ctx.fill();
    ctx.restore();
  }
  ctx.lineCap = 'round'; ctx.strokeStyle = TK.rgba(sh.col, 0.95); ctx.lineWidth = Math.max(3, R * 0.45);
  ctx.shadowColor = TK.rgba(sh.col, 0.9); ctx.shadowBlur = alive ? 18 : 8;
  lines.forEach(l => { const a = P(l.a), b = P(l.b); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(TK.lerp(a.x, b.x, l.t), TK.lerp(a.y, b.y, l.t)); ctx.stroke(); });
  ctx.shadowBlur = 0;
  for (let i = 0; i < N(); i++) {
    const p = P(i), lit = i < done, next = i === done && phase === 'play';
    if (next) { const pr = (TK.T * 1.2) % 1; ell(p.x, p.y, R * (1.5 + pr * 2.5), R * (1.5 + pr * 2.5)); ctx.strokeStyle = `rgba(255,240,170,${0.8 * (1 - pr)})`; ctx.lineWidth = 3; ctx.stroke(); }
    const r = R * (next ? 1.5 + 0.25 * Math.sin(TK.T * 6) : lit ? 1.15 : 0.8);
    ctx.shadowColor = 'rgba(255,245,180,.95)'; ctx.shadowBlur = next || lit ? 16 : 4;
    TK.star(p.x, p.y, r, lit || next ? '#fff6c8' : 'rgba(220,225,255,.6)', TK.T * (next ? 1.5 : 0.3));
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  twins.forEach((t, i) => TK.twin(t.kind, alive || t.hop >= 0 ? 'happy' : 'idle', t.x, t.yb - TK.hopY(t.hop, t.h * 0.2) - (alive ? TK.bob(i * 1.5, t.h * 0.1, 6) : TK.bob(i * 1.5, t.h * 0.02)), t.h, { face: i ? 'left' : 'right' }));
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get done() { return done; },
  actions() { if (phase !== 'play' || done >= N()) return []; const p = P(done); return [{ type: 'tap', x: p.x, y: p.y, wait: 120 }]; },
};
// 별 시범: 다음 별을 톡
window.__demo = () => {
  if (phase !== 'play' || done >= N()) return null;
  const p = P(done); return { kind: 'tap', x: p.x, y: p.y, say: '반짝이는 별을 톡!' };
};
TK.start({ resize: layout, init() { layout(); lastTap = TK.T; }, update, draw });
})();
