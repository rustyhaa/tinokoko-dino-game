// 티노코코 비눗방울 후 — "길게 누르기" 하나로 노는 놀이
//  화면을 누르고 있으면 손가락 자리에서 비눗방울이 점점 커지고, 떼면 둥실 날아간다.
//  크게 키운 방울엔 친구가 쏙 들어가 함께 날아간다. 날아가는 방울을 톡 치면 퐁! 친구는 살랑살랑 내려와 인사.
//  방울 8개를 날리면 방울 잔치. 여러 손가락이면 방울도 여러 개 동시에.
(() => {
const { ctx, ell, rand, clamp, sfx, tone } = TK;
const FR = ['chick', 'bunny', 'frog', 'butterfly', 'starfish', 'owl', 'crab', 'jelly', 'skystar', 'fish'];
let phase = 'play', phaseT = 0, rounds = 0, released = 0, frIdx = 0, RMAX = 100, RMIN = 14;
let growing = new Map(), bubbles = [], fallers = [], twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }];

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  RMAX = Math.min(W, H) * (port ? 0.2 : 0.16); RMIN = 12 * TK.U + 6;
  twins.forEach((t, i) => { t.h = port ? H * 0.2 : H * 0.34; t.x = i ? W * (port ? 0.82 : 0.88) : W * (port ? 0.18 : 0.12); t.yb = H * 0.97; });
}
const hue = () => Math.floor(rand(0, 360));
function release(g) {
  const big = g.r > RMAX * 0.6;
  bubbles.push({ x: g.x, y: g.y, r: g.r, vy: -rand(40, 70) * TK.U - g.r * 0.25, vx: rand(-20, 20) * TK.U, ph: rand(0, 6.28), h: g.h, friend: big ? FR[frIdx++ % FR.length] : null, age: 0 });
  sfx.whoosh(); tone(400 + g.r * 3, 0, 0.25, 'sine', 0.1, 900 + g.r * 4);
  released++;
  const tw = g.x < TK.W / 2 ? twins[0] : twins[1]; tw.hop = 0;
  if (big) sfx.giggle(tw.kind, 0.1);
  if (phase === 'play' && released >= 8) { phase = 'party'; phaseT = 0; sfx.fanfare(); twins.forEach(t => t.hop = 0); }
}
function popBubble(b) {
  bubbles.splice(bubbles.indexOf(b), 1);
  sfx.pop(); TK.ring(b.x, b.y, b.r, [255, 255, 255], 80);
  for (let k = 0; k < 10; k++) { const a = rand(0, 6.28); TK.parts.push({ t: 'drop', x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 80 * TK.U, vy: Math.sin(a) * 80 * TK.U, r: rand(2, 4) * TK.U, life: 0.5, max: 0.5, c: [200, 230, 255], g: 200 }); }
  if (b.friend) { fallers.push({ kind: b.friend, x: b.x, y: b.y + b.r * 0.4, t: 0, land: TK.H * rand(0.86, 0.94), st: 'fall' }); TK.say('안녕!'); }
}
const bubbleAt = (x, y) => bubbles.filter(b => TK.dist(x, y, b.x, b.y) < b.r + 14 * TK.U).sort((a, c) => a.r - c.r)[0];

TK.input({
  down(p) {
    const b = bubbleAt(p.x, p.y);
    if (b) { popBubble(b); return; }
    growing.set(p.id, { x: p.x, y: p.y, r: RMIN, h: hue(), t: 0 });
    tone(500, 0, 0.12, 'sine', 0.06, 700);
  },
  move(p) { const g = growing.get(p.id); if (g) { g.x = p.x; g.y = p.y; } },
  up(p) { const g = growing.get(p.id); if (g) { growing.delete(p.id); release(g); } },
  key() { release({ x: rand(TK.W * 0.25, TK.W * 0.75), y: TK.H * 0.7, r: rand(RMAX * 0.5, RMAX * 0.9), h: hue() }); },
});

function update(dt) {
  phaseT += dt;
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  growing.forEach(g => {
    const before = g.r;
    g.r = Math.min(RMAX, g.r + (RMAX - RMIN) * dt / 1.6); g.t += dt;
    if (Math.floor(g.t / 0.18) !== Math.floor((g.t - dt) / 0.18) && g.r < RMAX) tone(420 + g.r * 4, 0, 0.1, 'sine', 0.05);   // 커지는 소리 뿌우우
    if (before < RMAX * 0.6 && g.r >= RMAX * 0.6) TK.spark(g.x, g.y - g.r, [255, 255, 255], 6, 0.5);   // 친구 탈 만큼 커졌다는 반짝
  });
  bubbles.forEach(b => { b.age += dt; b.x += (b.vx + Math.sin(b.age * 1.5 + b.ph) * 25 * TK.U) * dt; b.y += b.vy * dt; b.x = clamp(b.x, b.r, TK.W - b.r); });
  bubbles = bubbles.filter(b => b.y > -b.r * 2);
  fallers.forEach(f => {
    f.t += dt;
    if (f.st === 'fall') { f.y += 70 * TK.U * dt; f.x += Math.sin(f.t * 3) * 40 * TK.U * dt; if (f.y >= f.land) { f.y = f.land; f.st = 'wave'; f.t = 0; } }
    else if (f.st === 'wave' && f.t > 1.4) { f.st = 'go'; f.dir = f.x < TK.W / 2 ? -1 : 1; }
    else if (f.st === 'go') f.x += f.dir * 160 * TK.U * dt;
  });
  fallers = fallers.filter(f => f.x > -100 && f.x < TK.W + 100);
  if (phase === 'party') {
    if (Math.random() < dt * 14) bubbles.push({ x: rand(0, TK.W), y: TK.H + 30, r: rand(RMAX * 0.15, RMAX * 0.4), vy: -rand(90, 160) * TK.U, vx: rand(-20, 20) * TK.U, ph: rand(0, 6.28), h: hue(), friend: null, age: 0 });
    if (phaseT > 3.5) { phase = 'play'; phaseT = 0; rounds++; released = 0; }
  }
}

function drawBubble(x, y, r, h, age, friend) {
  const wob = 1 + Math.sin(age * 5) * 0.03;
  if (friend) { ctx.save(); ctx.translate(x, y + r * 0.55); ctx.rotate(Math.sin(age * 2) * 0.15); TK.drawFriend(friend, r * 1.0); ctx.restore(); }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.7, `hsla(${h},90%,75%,.18)`); g.addColorStop(1, `hsla(${(h + 60) % 360},90%,70%,.55)`);
  ell(x, y, r * wob, r / wob); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.04); ctx.strokeStyle = `hsla(${(h + 120) % 360},80%,85%,.9)`; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.75, -2.6, -1.9); ctx.lineWidth = r * 0.08; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
}
function draw() {
  const W = TK.W, H = TK.H, gy = H * 0.78;
  ctx.fillStyle = TK.grad(0, gy, '#8fd4ff', '#e2f5ff'); ctx.fillRect(0, 0, W, gy);
  const sr = Math.min(W, H) * 0.06; ell(W * 0.12, H * 0.1, sr, sr); ctx.fillStyle = '#ffd84a'; ctx.fill();
  for (let k = 0; k < 3; k++) { const x = ((TK.T * 10 * (k + 1) + k * 300) % (W + 300)) - 150, y = H * (0.12 + k * 0.08), s = Math.min(W, H) * 0.05; ctx.fillStyle = 'rgba(255,255,255,.9)'; ell(x, y, s * 1.4, s * 0.7); ctx.fill(); ell(x - s * 0.8, y + s * 0.15, s * 0.8, s * 0.55); ctx.fill(); ell(x + s * 0.9, y + s * 0.1, s * 0.9, s * 0.6); ctx.fill(); }
  ctx.fillStyle = TK.grad(gy, H, '#9fdc7c', '#6fbf5a'); ctx.beginPath(); ctx.moveTo(0, gy); ctx.quadraticCurveTo(W * 0.5, gy - H * 0.05, W, gy); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  for (let k = 0; k < 9; k++) { const x = (k + 0.5) * W / 9, y = gy + H * (0.06 + (k % 3) * 0.05); for (let q = 0; q < 5; q++) { ell(x + Math.cos(q * 1.26) * 6 * TK.U, y + Math.sin(q * 1.26) * 6 * TK.U, 4.5 * TK.U, 4.5 * TK.U); ctx.fillStyle = TK.rgba(TK.COLS[k % 7], 1); ctx.fill(); } ell(x, y, 3.5 * TK.U, 3.5 * TK.U); ctx.fillStyle = '#fff3a0'; ctx.fill(); }
  // 처음엔 "꾹 누르기" 그림 힌트: 손자리 동그라미가 커졌다 작아짐 (아무것도 안 했을 때만)
  if (released === 0 && growing.size === 0 && bubbles.length === 0) { const q = (TK.T % 1.6) / 1.6, r = TK.lerp(RMIN, RMAX * 0.7, TK.ease(q)); drawBubble(W / 2, H * 0.45, r, 200, TK.T, null); ell(W / 2, H * 0.45, 18 * TK.U, 18 * TK.U); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); }
  fallers.forEach(f => { ctx.save(); ctx.translate(f.x, f.y - (f.st === 'wave' ? Math.abs(Math.sin(f.t * 8)) * 10 * TK.U : 0)); ctx.rotate(f.st === 'fall' ? Math.sin(f.t * 3) * 0.2 : 0); TK.drawFriend(f.kind, RMAX * 0.7); ctx.restore(); if (f.st === 'fall') { ctx.save(); ctx.translate(f.x, f.y - RMAX * 0.95); ctx.beginPath(); ctx.arc(0, 0, RMAX * 0.45, Math.PI, 0); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.restore(); } });
  twins.forEach((t, i) => TK.twin(t.kind, phase === 'party' || t.hop >= 0 ? 'happy' : 'idle', t.x, t.yb - TK.hopY(t.hop, t.h * 0.2) - (phase === 'party' ? TK.bob(i * 1.5, t.h * 0.1, 7) : TK.bob(i * 1.5, t.h * 0.02)), t.h, { face: i ? 'left' : 'right' }));
  bubbles.forEach(b => drawBubble(b.x, b.y, b.r, b.h, b.age, b.friend));
  growing.forEach(g => drawBubble(g.x, g.y, g.r, g.h, g.t, null));
  for (let k = 0; k < 8; k++) ell(W / 2 + (k - 3.5) * 20 * TK.U, H * 0.04 + 6, 6 * TK.U, 6 * TK.U), ctx.fillStyle = k < released ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.3)', ctx.fill();   // 날린 방울 수 (글자 대신 동그라미 8개)
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get released() { return released; }, get bubbles() { return bubbles.length; }, get fallers() { return fallers.length; },
  actions() {
    if (phase !== 'play') return [];
    const b = bubbles.find(b => b.friend && b.y > b.r && b.age > 0.6);
    if (b && released % 3 === 2) return [{ type: 'tap', x: b.x, y: b.y, wait: 150 }];
    return [{ type: 'hold', x: rand(TK.W * 0.3, TK.W * 0.7), y: TK.H * rand(0.45, 0.65), ms: released % 2 ? 1500 : 500, wait: 200 }];
  },
};
TK.start({ resize: layout, init() { layout(); }, update, draw });
})();
