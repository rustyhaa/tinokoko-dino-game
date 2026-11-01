// 티노코코 배 태우기 — 끌어다 놓기 하나로 노는 놀이
//  모래밭의 친구 넷을 손가락으로 끌어 티노·코코의 배에 태운다. 배 근처까지만 끌어와도 자석처럼 쏙 앉는다.
//  엉뚱한 데 놓으면 친구가 제자리로 폴짝 돌아갈 뿐. 넷이 다 타면 뱃고동 뿌우 → 출항 → 빈 배로 돌아와 새 친구들.
//  여러 손가락 동시 끌기 OK (두 아이가 각자 한 친구씩).
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const HG = window.H;   // 한글 모듈 (이 파일 안의 H 는 화면 높이)
const SETS = [['crab', 'bunny', 'chick', 'frog'], ['starfish', 'owl', 'butterfly', 'jelly'], ['fish', 'skystar', 'bunny', 'chick'], ['frog', 'crab', 'owl', 'butterfly']];
let setIdx = 0, phase = 'play', phaseT = 0, rounds = 0, lastSeat = 0;
let boat = {}, friends = [], twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }], boatX = 0;

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  boat.w = Math.min(port ? W * 0.9 : W * 0.5, H * 0.8); boat.h = boat.w * 0.2;
  boat.x0 = port ? W / 2 : W * 0.66; boat.deck = H * (port ? 0.5 : 0.46);
  boat.fh = boat.w * 0.17; boat.th = boat.w * 0.36;
  if (phase === 'play') boatX = boat.x0;   // 화면 크기가 바뀌면 배도 제자리로
  const homes = port ? [[0.22, 0.76], [0.5, 0.8], [0.78, 0.76], [0.5, 0.94]] : [[0.09, 0.8], [0.22, 0.92], [0.36, 0.8], [0.22, 0.72]];
  friends.forEach((f, i) => { f.hx = homes[i][0] * W; f.hy = homes[i][1] * H; if (f.st === 'home') { f.x = f.hx; f.y = f.hy; } });
}
const seatPos = i => ({ x: boatX + boat.w * (-0.21 + i * 0.14), y: boat.deck + boat.h * 0.12 + bobY() });
const bobY = () => Math.sin(TK.T * 1.6) * boat.h * 0.06;
function newSet() {
  friends = HG.pick(4, { cat: 'animal', pic: true }).map(o => ({ kind: o.w, st: 'appear', t: 0, x: 0, y: 0, hx: 0, hy: 0, seat: -1, wig: 0, ptr: null }));
  layout();
  friends.forEach(f => { f.x = f.hx; f.y = f.hy; TK.spark(f.hx, f.hy - boat.fh * 0.5, [255, 255, 255], 6, 0.6); });
}
const inBoatZone = (x, y) => Math.abs(x - boatX) < boat.w * 0.5 && y > boat.deck - boat.th * 1.1 && y < boat.deck + boat.h * 1.2;
function seat(f) {
  const used = friends.filter(o => o.seat >= 0).map(o => o.seat);
  const free = [0, 1, 2, 3].filter(i => !used.includes(i)).sort((a, b) => Math.abs(seatPos(a).x - f.x) - Math.abs(seatPos(b).x - f.x));
  f.seat = free[0]; f.st = 'fly'; f.t = 0; f.fx = f.x; f.fy = f.y; f.ptr = null; lastSeat = TK.T;
  sfx.boing(); TK.tone(TK.pick([784, 880, 988]), 0.15, 0.15, 'triangle', 0.12, 1200);
  // 탈 때 이름을 읽어줌. 2단계 이상이면 첫소리를 먼저 "기역, 게!"
  HG.read(f.kind, HG.cfg().stage >= 2 ? HG.JAMO_NAME[HG.cho(f.kind)] + ', ' : '');
  const tw = seatPos(f.seat).x < boatX ? twins[0] : twins[1]; tw.hop = 0;
}
function sendHome(f) { f.st = 'back'; f.t = 0; f.fx = f.x; f.fy = f.y; f.ptr = null; sfx.soft(); }
const friendAt = (x, y) => friends.filter(f => (f.st === 'home' || f.st === 'seated') && TK.dist(x, y, f.x, f.y - boat.fh * 0.5) < boat.fh * 0.85).sort((a, b) => TK.dist(x, y, a.x, a.y) - TK.dist(x, y, b.x, b.y))[0];

TK.input({
  down(p) {
    if (phase !== 'play') return;
    const f = friendAt(p.x, p.y);
    if (f && f.st === 'home') { f.st = 'drag'; f.ptr = p.id; f.ox = f.x - p.x; f.oy = f.y - p.y; f.wig = 0.3; sfx.rustle(); return; }
    if (f && f.st === 'seated') { f.wig = 0.5; TK.tone(TK.pick([784, 880, 988]), 0, 0.15, 'triangle', 0.12, 1200); HG.read(f.kind); return; }
    const tw = twins.find(t => Math.abs(p.x - t.x) < boat.th * 0.3 && p.y > t.yb - boat.th && p.y < t.yb);
    if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - boat.th * 1.05); HG.read(tw.kind === 'tino' ? '티노' : '코코'); return; }
    TK.ring(p.x, p.y, 14 * TK.U, [255, 255, 255]); sfx.soft();
  },
  move(p) {
    const f = friends.find(f => f.st === 'drag' && f.ptr === p.id); if (!f) return;
    f.x = p.x + f.ox; f.y = p.y + f.oy;
    if (inBoatZone(f.x, f.y - boat.fh * 0.4)) seat(f);   // 배 근처면 자석처럼 쏙
  },
  up(p) {
    const f = friends.find(f => f.st === 'drag' && f.ptr === p.id); if (!f) return;
    if (inBoatZone(f.x, f.y - boat.fh * 0.4)) seat(f); else sendHome(f);
  },
  key() { const f = friends.find(f => f.st === 'home'); if (f && phase === 'play') seat(f); },
});

function update(dt) {
  phaseT += dt;
  if (phase === 'play' || phase === 'party') { /* 배는 제자리 */ }
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  friends.forEach(f => {
    f.wig = Math.max(0, f.wig - dt);
    if (f.st === 'appear') { f.t += dt; if (f.t > 0.4) f.st = 'home'; }
    if (f.st === 'fly' || f.st === 'back') {
      f.t += dt / (f.st === 'fly' ? 0.35 : 0.45);
      const to = f.st === 'fly' ? seatPos(f.seat) : { x: f.hx, y: f.hy }, e = TK.ease(f.t);
      f.x = TK.lerp(f.fx, to.x, e); f.y = TK.lerp(f.fy, to.y, e) - Math.sin(Math.PI * clamp(f.t, 0, 1)) * boat.fh * 0.8;
      if (f.t >= 1) { f.st = f.st === 'fly' ? 'seated' : 'home'; if (f.st === 'seated') TK.spark(f.x, f.y - boat.fh * 0.6, TK.pick(TK.COLS), 6, 0.6); }
    }
    if (f.st === 'seated') { const s = seatPos(f.seat); f.x = s.x; f.y = s.y; }
  });
  if (phase === 'play' && friends.length && friends.every(f => f.st === 'seated')) { phase = 'party'; phaseT = 0; sfx.horn(); TK.say('출발!'); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') {
    TK.confetti(dt);
    if (phaseT > 1.0) boatX += boat.w * 0.9 * dt * Math.min(1, (phaseT - 1) * 1.5);
    if (Math.random() < dt * 10) TK.ring(boatX - boat.w * 0.5, boat.deck + boat.h * 0.9, 6 * TK.U, [255, 255, 255], 60);
    if (boatX - boat.w * 0.6 > TK.W) { phase = 'return'; phaseT = 0; rounds++; setIdx = (setIdx + 1) % SETS.length; friends = []; boatX = -boat.w * 0.6; }
  }
  if (phase === 'return') {
    boatX = Math.min(boat.x0, boatX + boat.w * 1.0 * dt);
    if (boatX >= boat.x0) { phase = 'play'; phaseT = 0; newSet(); sfx.sparkle(); lastSeat = TK.T; }
  }
}

function drawBg() {
  const W = TK.W, H = TK.H, sea = boat.deck - boat.h * 0.6, sand = H * 0.64;
  ctx.fillStyle = TK.grad(0, sea, '#8fd4ff', '#e2f5ff'); ctx.fillRect(0, 0, W, sea);
  const sr = Math.min(W, H) * 0.06; ell(W * 0.12, H * 0.1, sr, sr); ctx.fillStyle = '#ffd84a'; ctx.fill();
  for (let k = 0; k < 3; k++) { const x = ((TK.T * 8 * (k + 1) + k * 400) % (W + 300)) - 150, y = H * (0.08 + k * 0.07), s = Math.min(W, H) * 0.05; ctx.fillStyle = 'rgba(255,255,255,.92)'; ell(x, y, s * 1.4, s * 0.7); ctx.fill(); ell(x - s * 0.8, y + s * 0.15, s * 0.8, s * 0.55); ctx.fill(); ell(x + s * 0.9, y + s * 0.1, s * 0.9, s * 0.6); ctx.fill(); }
  ctx.fillStyle = TK.grad(sea, sand, '#3fb0e8', '#86d6f3'); ctx.fillRect(0, sea, W, sand - sea + 2);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let x = 0; x <= W + 10; x += 10) { const y = sea + (sand - sea) * (0.2 + k * 0.28) + Math.sin(x * 0.03 + TK.T * 1.3 + k) * 3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  ctx.fillStyle = TK.grad(sand, H, '#fbe7b4', '#efcf8c');
  ctx.beginPath(); ctx.moveTo(0, sand); for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, sand + Math.sin(x * 0.02 + TK.T) * 4); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
}
function drawBoatBack() {
  const x = boatX, d = boat.deck + bobY(), w0 = boat.w;
  const w = Math.min(w0, (d - 14 * TK.U) / 0.64);   // 돛대가 화면 위로 잘리지 않게
  ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x - w0 * 0.012, d - w * 0.62, w0 * 0.024, w * 0.62);   // 돛대
  const flap = Math.sin(TK.T * 3) * w * 0.01;
  ctx.beginPath(); ctx.moveTo(x + w * 0.016, d - w * 0.6); ctx.quadraticCurveTo(x + w * 0.2 + flap, d - w * 0.35, x + w * 0.016, d - w * 0.12); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - w * 0.016, d - w * 0.55); ctx.quadraticCurveTo(x - w * 0.15 - flap, d - w * 0.33, x - w * 0.016, d - w * 0.14); ctx.closePath(); ctx.fillStyle = '#ffe9a8'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, d - w * 0.62); ctx.lineTo(x + w * 0.09, d - w * 0.6 + flap); ctx.lineTo(x, d - w * 0.57); ctx.fillStyle = '#ff6b6b'; ctx.fill();
}
function drawHull() {
  const x = boatX, d = boat.deck + bobY(), w = boat.w, h = boat.h;
  ctx.beginPath(); ctx.moveTo(x - w * 0.5, d); ctx.lineTo(x + w * 0.5, d);
  ctx.quadraticCurveTo(x + w * 0.44, d + h, x + w * 0.32, d + h); ctx.lineTo(x - w * 0.32, d + h);
  ctx.quadraticCurveTo(x - w * 0.44, d + h, x - w * 0.5, d); ctx.closePath();
  ctx.fillStyle = '#e9644f'; ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - w * 0.47, d + h * 0.18, w * 0.94, h * 0.14);
  for (let k = 0; k < 5; k++) { ell(x - w * 0.28 + k * w * 0.14, d + h * 0.58, h * 0.13, h * 0.13); ctx.fillStyle = '#ffe9a8'; ctx.fill(); ctx.strokeStyle = '#b8412f'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let k = 0; k < 3; k++) { ell(x - w * 0.4 + k * w * 0.4 + Math.sin(TK.T * 2 + k) * 4, d + h * 1.02, w * 0.12, h * 0.1); ctx.fill(); }
}
function draw() {
  drawBg(); drawBoatBack();
  const d = boat.deck + bobY();
  twins[0].x = boatX - boat.w * 0.38; twins[1].x = boatX + boat.w * 0.38;
  ctx.save(); ctx.beginPath(); ctx.rect(-TK.W, -TK.H, TK.W * 3, d + TK.H + boat.h * 0.05); ctx.clip();
  twins.forEach((t, i) => { t.yb = d + boat.th * 0.3; TK.twin(t.kind, 'happy', t.x, t.yb - TK.hopY(t.hop, boat.th * 0.25) - TK.bob(i * 1.4, boat.th * 0.02), boat.th); });
  friends.filter(f => f.st === 'seated').forEach(drawFriendAt);
  ctx.restore();
  drawHull();
  friends.filter(f => f.st === 'home' || f.st === 'appear' || f.st === 'back').forEach(drawFriendAt);
  friends.filter(f => f.st === 'drag' || f.st === 'fly').forEach(drawFriendAt);
  TK.drawParts();
}
function drawFriendAt(f) {
  const sc = f.st === 'appear' ? TK.back(f.t / 0.4) : f.st === 'drag' ? 1.15 : 1;
  const wg = f.wig > 0 ? Math.sin(f.wig * 40) * 0.12 : 0;
  const hop = f.st === 'home' ? TK.bob(f.hx * 0.01, boat.fh * 0.05, 4) : 0;
  ctx.save(); ctx.translate(f.x, f.y - hop); ctx.rotate(wg); ctx.scale(sc, sc);
  if (f.st !== 'seated') { ell(0, 0, boat.fh * 0.4, boat.fh * 0.08); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); }
  HG.drawPic(ctx, f.kind, boat.fh);
  if (f.st !== 'seated') HG.drawTag(ctx, f.kind, 0, boat.fh * 0.3, boat.fh * 0.22, { hi: HG.hi(f.kind) });   // 이름표
  ctx.restore();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; },
  actions() {   // 자동 확인용: 아직 모래밭에 있는 친구 하나를 배로 끄는 경로
    if (phase !== 'play') return [];
    const f = friends.find(f => f.st === 'home'); if (!f) return [];
    const pts = [], to = { x: boatX, y: boat.deck - boat.fh * 0.2 };
    for (let k = 0; k <= 14; k++) pts.push({ x: TK.lerp(f.x, to.x, k / 14), y: TK.lerp(f.y - boat.fh * 0.5, to.y, k / 14) });
    return [{ type: 'path', pts, wait: 450 }];
  },
};
// 별 시범: 모래밭 친구 하나를 배까지 끌고 가기
window.__demo = () => {
  if (phase !== 'play') return null;
  const f = friends.find(f => f.st === 'home'); if (!f) return null;
  return { kind: 'path', pts: [{ x: f.x, y: f.y - boat.fh * 0.5 }, { x: TK.lerp(f.x, boatX, 0.5), y: Math.min(f.y, boat.deck) - boat.fh * 1.6 }, { x: boatX, y: boat.deck - boat.fh * 0.3 }], say: '배에 태워 줘!' };
};
TK.start({ resize: layout, init() { layout(); boatX = boat.x0; newSet(); }, update, draw });
})();
