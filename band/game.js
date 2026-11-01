// 티노코코 쿵짝 악단 — 탭 하나로 노는 자유 연주
//  북·실로폰·나팔·탬버린을 두드리면 소리가 나고 무대 위 티노와 코코가 박자에 맞춰 춤춘다.
//  실로폰은 손가락으로 쓸면 또로롱. 12번 칠 때마다 동물 친구가 한 명씩 합류하고, 셋이 모이면 피날레!
//  정답·목표 없음. 아무렇게나 쳐도 늘 어울리는 음(펜타토닉)만 나온다.
(() => {
const { ctx, ell, rand, clamp, sfx, tone, noise } = TK;
const FRIEND_POOL = ['bunny', 'frog', 'chick', 'owl', 'crab', 'starfish', 'butterfly', 'jelly'];
let phase = 'play', phaseT = 0, rounds = 0, hits = 0, beat = 0, friendIdx = 0, lastHit = 0;
let inst = [], band = [], twins = [{ kind: 'tino', hop: -1, move: 0 }, { kind: 'coco', hop: -1, move: 0 }], notes = [], bars = [];

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  const s = port ? Math.min(W * 0.15, H * 0.09) : Math.min(W * 0.1, H * 0.17);
  const pos = port ? [[0.2, 0.69], [0.5, 0.86], [0.8, 0.69], [0.5, 0.69]] : [[0.13, 0.8], [0.42, 0.84], [0.68, 0.8], [0.88, 0.8]];
  inst = ['drum', 'xylo', 'horn', 'tamb'].map((k, i) => Object.assign(inst[i] || { hit: 0 }, { kind: k, x: pos[i][0] * W, y: pos[i][1] * H, s: k === 'xylo' ? s * (port ? 1.5 : 1.3) : s }));
  if (port) inst[3].s = s * 0.8;
  const xy = inst[1];
  bars = [0, 1, 2, 3, 4, 5].map(i => ({ i, x: xy.x - xy.s * 1.25 + i * xy.s * 0.5, y: xy.y, w: xy.s * 0.42, h: xy.s * (1.3 - i * 0.1), bump: (bars[i] || {}).bump || 0 }));
  twins.forEach((t, i) => { t.h = port ? H * 0.22 : H * 0.4; t.x = W * (i ? (port ? 0.73 : 0.62) : (port ? 0.27 : 0.38)); t.yb = port ? H * 0.55 : H * 0.66; });
  band.forEach((f, i) => { f.hx = W * [0.18, 0.82, 0.5][i]; f.y = port ? H * 0.3 : H * 0.42; });
}
const xyloNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
function playInst(k, barI) {
  if (k === 'drum') { tone(150, 0, 0.35, 'sine', 0.5, 50); noise(0.12, 300, 0.25); }
  else if (k === 'xylo') { const f = xyloNotes[barI]; tone(f, 0, 0.6, 'triangle', 0.25); tone(f * 4, 0, 0.08, 'sine', 0.05); }
  else if (k === 'horn') { const f = TK.pick([392, 440, 523.25]); tone(f, 0, 0.18, 'sawtooth', 0.09); tone(f * 1.26, 0.18, 0.3, 'sawtooth', 0.09); tone(f, 0, 0.45, 'square', 0.03); }
  else { for (let i = 0; i < 4; i++) noise(0.08, 7000, 0.12, i * 0.05, 0, 3); tone(1800, 0, 0.1, 'triangle', 0.04); }
}
function hit(k, barI = 0) {
  if (phase === 'leave') return;
  playInst(k, barI);
  const it = inst.find(i => i.kind === k); it.hit = 1;
  if (k === 'xylo') bars[barI].bump = 1;
  notes.push({ x: it.x + rand(-it.s * 0.3, it.s * 0.3), y: it.y - it.s, vx: rand(-30, 30) * TK.U, t: 0, c: TK.pick(TK.COLS) });
  hits++; beat++; lastHit = TK.T;
  twins.forEach((t, i) => { if (beat % 2 === i || k === 'drum') t.hop = 0; t.move = (t.move + 1) % 4; });
  band.forEach(f => f.hop = 0);
  if (phase === 'play' && hits >= 12) {   // 친구 합류
    hits = 0;
    if (band.length < 3) { band.push({ kind: FRIEND_POOL[friendIdx++ % FRIEND_POOL.length], x: 0, hx: 0, y: 0, t: 0, hop: -1, side: band.length % 2 ? 1 : -1 }); layout(); sfx.sparkle(); }
    if (band.length === 3) { phase = 'party'; phaseT = 0; setTimeout(sfx.fanfare, 200); }
  }
}
function barAt(x, y) { return bars.find(b => Math.abs(x - b.x) < b.w * 0.55 && Math.abs(y - b.y) < b.h * 0.55); }
function instAt(x, y) { return inst.find(i => i.kind !== 'xylo' && TK.dist(x, y, i.x, i.y - i.s * 0.3) < i.s * 1.0); }

TK.input({
  down(p) {
    const b = barAt(p.x, p.y); if (b) { hit('xylo', b.i); p.bar = b.i; return; }
    const it = instAt(p.x, p.y); if (it) { hit(it.kind); return; }
    const tw = twins.find(t => Math.abs(p.x - t.x) < t.h * 0.3 && p.y > t.yb - t.h && p.y < t.yb);
    if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); return; }
    TK.ring(p.x, p.y, 14 * TK.U, [255, 230, 150]); sfx.soft();
  },
  move(p) { if (!p.down) return; const b = barAt(p.x, p.y); if (b && b.i !== p.bar) { hit('xylo', b.i); p.bar = b.i; } },   // 쓸면 또로롱
  key() { const k = TK.pick(['drum', 'xylo', 'horn', 'tamb']); hit(k, (Math.random() * 6) | 0); },
});

function update(dt) {
  phaseT += dt;
  inst.forEach(i => i.hit = Math.max(0, i.hit - dt * 4));
  bars.forEach(b => b.bump = Math.max(0, b.bump - dt * 5));
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.4; if (t.hop > 1) t.hop = -1; } });
  band.forEach(f => { f.t = Math.min(1, f.t + dt / 0.8); f.x = TK.lerp(f.side < 0 ? -80 : TK.W + 80, f.hx, TK.ease(f.t)); if (f.hop >= 0) { f.hop += dt / 0.4; if (f.hop > 1) f.hop = -1; } });
  notes.forEach(n => { n.t += dt; n.x += n.vx * dt + Math.sin(n.t * 5) * 0.6; n.y -= 70 * TK.U * dt; });
  notes = notes.filter(n => n.t < 1.6);
  if (phase === 'party') {
    TK.confetti(dt);
    if (Math.random() < dt * 3) { twins.forEach(t => t.hop = 0); band.forEach(f => f.hop = 0); }
    if (phaseT > 4) { phase = 'leave'; phaseT = 0; band.forEach(f => { f.leaving = true; }); }
  }
  if (phase === 'leave') {
    band.forEach(f => { f.x += f.side * 500 * TK.U * dt; });
    if (phaseT > 1.2) { band = []; phase = 'play'; phaseT = 0; rounds++; hits = 0; }
  }
}

function drawNote(x, y, s, c) {
  ctx.fillStyle = c; ell(x, y, s * 0.55, s * 0.4, -0.4); ctx.fill();
  ctx.fillRect(x + s * 0.42, y - s * 1.6, s * 0.14, s * 1.6);
  ctx.beginPath(); ctx.moveTo(x + s * 0.56, y - s * 1.6); ctx.quadraticCurveTo(x + s * 1.1, y - s * 1.3, x + s * 0.9, y - s * 0.8); ctx.lineWidth = s * 0.14; ctx.strokeStyle = c; ctx.stroke();
}
function drawInst(it) {
  const s = it.s, sh = it.hit;
  ctx.save(); ctx.translate(it.x, it.y);
  if (it.kind === 'drum') {
    ctx.scale(1 + sh * 0.05, 1 - sh * 0.05);
    ctx.fillStyle = '#e9504f'; ctx.fillRect(-s * 0.9, -s * 0.55, s * 1.8, s * 0.9);
    ell(0, s * 0.35, s * 0.9, s * 0.25); ctx.fill();
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = s * 0.06; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.9 + k * s * 0.45, -s * 0.5); ctx.lineTo(-s * 0.68 + k * s * 0.45, s * 0.3); ctx.stroke(); }
    ell(0, -s * 0.55, s * 0.9, s * 0.25); ctx.fillStyle = '#fff4e2'; ctx.fill(); ctx.strokeStyle = '#d9b98a'; ctx.lineWidth = 3; ctx.stroke();
    if (sh > 0) { ell(0, -s * 0.55, s * 0.9 * (1 - sh * 0.5), s * 0.25 * (1 - sh * 0.5)); ctx.strokeStyle = `rgba(200,150,90,${sh})`; ctx.stroke(); }
  } else if (it.kind === 'xylo') {
    ctx.restore();
    ctx.fillStyle = '#8a5a3a'; TK.rr(it.x - s * 1.55, it.y - s * 0.15, s * 3.1, s * 0.3, s * 0.1); ctx.fill();
    bars.forEach(b => { const c = TK.COLS[b.i]; TK.rr(b.x - b.w / 2, b.y - b.h / 2 - b.bump * s * 0.08, b.w, b.h, b.w * 0.25); ctx.fillStyle = TK.rgba(c, 1); ctx.fill(); ell(b.x, b.y - b.h * 0.35 - b.bump * s * 0.08, b.w * 0.12, b.w * 0.12); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); });
    return;
  } else if (it.kind === 'horn') {
    ctx.rotate(-0.25 - sh * 0.15);
    ctx.fillStyle = '#ffc93c';
    ctx.fillRect(-s * 0.9, -s * 0.12, s * 1.3, s * 0.24);
    ctx.beginPath(); ctx.moveTo(s * 0.35, -s * 0.15); ctx.lineTo(s * 0.95, -s * 0.55); ctx.lineTo(s * 0.95, s * 0.55); ctx.lineTo(s * 0.35, s * 0.15); ctx.closePath(); ctx.fill();
    ell(s * 0.95, 0, s * 0.14, s * 0.55); ctx.fillStyle = '#e8a91a'; ctx.fill();
    for (let k = 0; k < 3; k++) { ctx.fillStyle = '#e8a91a'; ctx.fillRect(-s * 0.35 + k * s * 0.18, -s * 0.38, s * 0.1, s * 0.26); }
    ell(-s * 0.95, 0, s * 0.1, s * 0.16); ctx.fillStyle = '#e8a91a'; ctx.fill();
  } else {
    ctx.rotate(Math.sin(TK.T * 30) * 0.25 * sh);
    ell(0, 0, s * 0.75, s * 0.75); ctx.fillStyle = '#d9a35a'; ctx.fill();
    ell(0, 0, s * 0.6, s * 0.6); ctx.fillStyle = '#fff1d6'; ctx.fill();
    for (let k = 0; k < 6; k++) { const a = k * TK.TAU / 6; ell(Math.cos(a) * s * 0.68, Math.sin(a) * s * 0.68, s * 0.13, s * 0.13); ctx.fillStyle = '#d8dde4'; ctx.fill(); ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  ctx.restore();
}
function draw() {
  const W = TK.W, H = TK.H, port = W < H, floor = port ? H * 0.58 : H * 0.68;
  ctx.fillStyle = TK.grad(0, floor, '#3a1d52', '#6b3384'); ctx.fillRect(0, 0, W, floor);
  // 조명
  for (let k = 0; k < 3; k++) {
    const x = W * (0.25 + k * 0.25) + Math.sin(TK.T * 0.8 + k * 2 + beat * 0.3) * W * 0.08;
    ctx.fillStyle = TK.rgba(TK.COLS[(k * 2 + beat) % 7], phase === 'party' ? 0.28 : 0.13);
    ctx.beginPath(); ctx.moveTo(W * (0.2 + k * 0.3), 0); ctx.lineTo(x - W * 0.12, floor); ctx.lineTo(x + W * 0.12, floor); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = TK.grad(floor, H, '#b9824f', '#8a5a33'); ctx.fillRect(0, floor, W, H - floor);
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; for (let y = floor + 20; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // 커튼
  for (const sd of [0, 1]) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); const x0 = sd ? W : 0, dx = sd ? -1 : 1; ctx.moveTo(x0, 0); ctx.lineTo(x0 + dx * W * 0.12, 0); ctx.quadraticCurveTo(x0 + dx * W * 0.05, floor * 0.5, x0 + dx * W * 0.09, floor); ctx.lineTo(x0, floor); ctx.fill(); }
  ctx.fillStyle = '#a93226'; for (let x = 0; x < W; x += 40 * TK.U) { ell(x + 20 * TK.U, 0, 24 * TK.U, 26 * TK.U); ctx.fill(); }
  band.forEach((f, i) => { ctx.save(); ctx.translate(f.x, f.y - TK.hopY(f.hop, H * 0.04)); ctx.rotate(Math.sin(TK.T * 4 + i) * 0.1); TK.drawFriend(f.kind, port ? H * 0.08 : H * 0.14); ctx.restore(); });
  twins.forEach((t, i) => {
    const pose = phase === 'party' ? 'happy' : (t.move % 2 ? 'jump' : (t.kind === 'coco' ? 'happy' : 'idle'));
    const lean = Math.sin(TK.T * 3 + i * 1.6) * 0.06 + (t.move === 3 ? (i ? -0.12 : 0.12) : 0);
    TK.twin(t.kind, pose, t.x, t.yb - TK.hopY(t.hop, t.h * 0.18) - TK.bob(i * 1.5, t.h * 0.02), t.h, { rot: lean, face: i ? 'left' : 'right' });
  });
  inst.forEach(drawInst);
  notes.forEach(n => drawNote(n.x, n.y, 12 * TK.U, TK.rgba(n.c, Math.max(0, 1 - n.t / 1.6))));
  // 친구가 몇 명 왔는지: 무대 위 작은 별 3개 (글자 대신)
  for (let k = 0; k < 3; k++) TK.star(W / 2 + (k - 1) * 36 * TK.U, H * 0.06, 13 * TK.U, k < band.length ? '#ffe066' : 'rgba(255,255,255,.25)', 0);
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get band() { return band.length; },
  actions() {
    if (phase !== 'play') return [];
    const k = beat % 4, it = inst[k];
    if (it.kind === 'xylo') { const b = bars[beat % 6]; return [{ type: 'tap', x: b.x, y: b.y, wait: 90 }]; }
    return [{ type: 'tap', x: it.x, y: it.y - it.s * 0.3, wait: 90 }];
  },
};
// 별 시범: 번갈아 북 두드리기 / 실로폰 쓸기
let demoN = 0;
window.__demo = () => {
  if (phase !== 'play' || !inst.length) return null;
  demoN++;
  if (demoN % 2) { const d = inst[0]; return { kind: 'tap', x: d.x, y: d.y - d.s * 0.4, say: '둥둥 두드려 봐!' }; }
  return { kind: 'path', pts: [{ x: bars[0].x, y: bars[0].y }, { x: bars[5].x, y: bars[5].y }], say: '쓱 쓸어 봐!' };
};
TK.start({ resize: layout, init() { layout(); }, update, draw });
})();
