// 티노코코 첫소리 배 — 톡(또는 끌기) 하나로 노는 놀이
//  배 돛과 뱃머리에 자음 하나(예: ㄱ). 그 자음으로 시작하는 친구(고래·거미·기차…)를 톡 하거나 끌어 오면
//  폴짝 배에 앉고 "기역. 고래." 하고 읽는다. 다른 소리 친구는 손을 흔들며 모래밭에서 '다음 배'를 기다린다(실패 없음).
//  맞는 친구가 다 타면 뱃고동 → 출항 → 다음 배는 기다리던 친구의 첫소리로 돌아온다.
//  1단계(듣고 보기)는 자음 없이 누구나 탄다. 여러 손가락 동시 OK (두 아이가 각자 한 친구씩).
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const HG = window.H;   // 한글 모듈 (이 파일 안의 H 는 화면 높이)
const SETS = [['crab', 'bunny', 'chick', 'frog'], ['starfish', 'owl', 'butterfly', 'jelly'], ['fish', 'skystar', 'bunny', 'chick'], ['frog', 'crab', 'owl', 'butterfly']];
let setIdx = 0, phase = 'play', phaseT = 0, rounds = 0, lastSeat = 0, jamo = null, waiting = [];
let boat = {}, friends = [], twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }], boatX = 0;

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  boat.w = Math.min(port ? W * 0.9 : W * 0.44, H * 0.7); boat.h = boat.w * 0.2;
  boat.x0 = port ? W / 2 : W * 0.66; boat.deck = H * (port ? 0.45 : 0.36);   // 손그림 바다 띠(화면 37~66%) 안에 배가 뜨게
  boat.fh = boat.w * 0.17; boat.th = boat.w * 0.36;
  if (phase === 'play') boatX = boat.x0;   // 화면 크기가 바뀌면 배도 제자리로
  const homes = port ? [[0.22, 0.76], [0.5, 0.8], [0.78, 0.76], [0.5, 0.94]] : [[0.09, 0.8], [0.22, 0.92], [0.36, 0.8], [0.22, 0.72]];
  friends.forEach((f, i) => { f.hx = homes[i][0] * W; f.hy = homes[i][1] * H; if (f.st === 'home') { f.x = f.hx; f.y = f.hy; } });
}
const seatPos = i => ({ x: boatX + boat.w * (-0.21 + i * 0.14), y: boat.deck + boat.h * 0.12 + bobY() });
const bobY = () => Math.sin(TK.T * 1.6) * boat.h * 0.06;
// 이번 배의 자음과 친구 넷 고르기: 그 자음 친구 2~3 + 다른 소리 친구(기다리던 친구 먼저)
function newSet() {
  const pool = HG.words().filter(o => o.cat !== 'name' && HG.hasPic(o.w) && [...o.w].length <= 5);
  const by = j => pool.filter(o => o.cho === j);
  let kinds;
  if (true) { jamo = null; kinds = HG.pick(4, { cat: 'animal', pic: true }).map(o => o.w); }   /* 2026-11-12 사용자 요청: 같은 자음만 태우는 제한 삭제 — 누구나 탐 (아래 자음 배 코드는 되살릴 때를 위해 남김) */
  else {
    const set = HG.jamoSet().filter(j => by(j).length >= 2);
    const wj = waiting.map(w => HG.cho(w)).find(j => set.includes(j));
    jamo = wj || TK.pick(set.length ? set : ['ㄱ']);
    const fav = HG.favWords();
    const match = TK.shuffle(by(jamo).map(o => o.w)).sort((a, b) => fav.includes(b) - fav.includes(a));
    const keep = waiting.filter(w => HG.cho(w) === jamo).concat(match.filter(w => !waiting.includes(w)));
    const yes = keep.slice(0, rounds % 2 ? 3 : 2);
    const others = waiting.filter(w => HG.cho(w) !== jamo).concat(TK.shuffle(pool.filter(o => o.cho !== jamo && !waiting.includes(o.w)).map(o => o.w)));
    kinds = TK.shuffle(yes.concat(others.slice(0, 4 - yes.length)));
  }
  friends = kinds.map(w => ({ kind: w, st: 'appear', t: 0, x: 0, y: 0, hx: 0, hy: 0, seat: -1, wig: 0, ptr: null }));
  layout();
  friends.forEach(f => { f.x = f.hx; f.y = f.hy; TK.spark(f.hx, f.hy - boat.fh * 0.5, [255, 255, 255], 6, 0.6); });
}
const fits = f => !jamo || HG.cho(f.kind) === jamo;   // 이 배에 탈 친구인가
const need = () => friends.filter(fits);
function wave(f) {   // 다른 소리 친구: 제자리에서 손 흔들며 이름만 (다음 배를 기다림)
  f.wig = 0.7; f.st = f.st === 'drag' ? 'back' : f.st; if (f.st === 'back') { f.t = 0; f.fx = f.x; f.fy = f.y; f.ptr = null; }
  TK.tone(660, 0, 0.12, 'sine', 0.08); HG.read(f.kind);
}
const inBoatZone = (x, y) => Math.abs(x - boatX) < boat.w * 0.5 && y > boat.deck - boat.th * 1.1 && y < boat.deck + boat.h * 1.2;
function seat(f) {
  const used = friends.filter(o => o.seat >= 0).map(o => o.seat);
  const free = [0, 1, 2, 3].filter(i => !used.includes(i)).sort((a, b) => Math.abs(seatPos(a).x - f.x) - Math.abs(seatPos(b).x - f.x));
  f.seat = free[0]; f.st = 'fly'; f.t = 0; f.fx = f.x; f.fy = f.y; f.ptr = null; lastSeat = TK.T;
  sfx.boing(); TK.tone(TK.pick([784, 880, 988]), 0.15, 0.15, 'triangle', 0.12, 1200);
  // 탈 때 읽어줌: 자음 배면 "기역." "고래." (1단계는 이름만)
  HG.read(f.kind, jamo ? HG.JAMO_NAME[jamo] : HG.cfg().stage >= 2 && HG.JAMO_NAME[HG.cho(f.kind)] ? HG.JAMO_NAME[HG.cho(f.kind)] : '');   // 각자 첫소리 + 이름
  const tw = seatPos(f.seat).x < boatX ? twins[0] : twins[1]; tw.hop = 0;
}
function sendHome(f) { f.st = 'back'; f.t = 0; f.fx = f.x; f.fy = f.y; f.ptr = null; sfx.soft(); }
const friendAt = (x, y) => friends.filter(f => (f.st === 'home' || f.st === 'seated') && TK.dist(x, y, f.x, f.y - boat.fh * 0.5) < boat.fh * 0.85).sort((a, b) => TK.dist(x, y, a.x, a.y) - TK.dist(x, y, b.x, b.y))[0];

TK.input({
  down(p) {
    if (phase !== 'play') return;
    const f = friendAt(p.x, p.y);
    if (f && f.st === 'home') { f.st = 'drag'; f.ptr = p.id; f.ox = f.x - p.x; f.oy = f.y - p.y; f.wig = 0.3; f.px = p.x; f.py = p.y; sfx.rustle(); return; }
    if (f && f.st === 'seated') { f.wig = 0.5; TK.tone(TK.pick([784, 880, 988]), 0, 0.15, 'triangle', 0.12, 1200); HG.read(f.kind); return; }
    const tw = twins.find(t => Math.abs(p.x - t.x) < boat.th * 0.3 && p.y > t.yb - boat.th && p.y < t.yb);
    if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - boat.th * 1.05); HG.read(tw.kind === 'tino' ? '티노' : '코코'); return; }
    TK.ring(p.x, p.y, 14 * TK.U, [255, 255, 255]); sfx.soft();
  },
  move(p) {
    const f = friends.find(f => f.st === 'drag' && f.ptr === p.id); if (!f) return;
    f.x = p.x + f.ox; f.y = p.y + f.oy;
    if (inBoatZone(f.x, f.y - boat.fh * 0.4)) { if (fits(f)) seat(f); else wave(f); }   // 배 근처면 자석처럼 쏙 (다른 소리 친구는 손 흔들고 돌아감)
  },
  up(p) {
    const f = friends.find(f => f.st === 'drag' && f.ptr === p.id); if (!f) return;
    const tap = TK.dist(p.x, p.y, f.px, f.py) < 18;   // 톡: 거의 안 움직였으면 태우기(맞는 친구) / 손 흔들기(다른 친구)
    if (tap || inBoatZone(f.x, f.y - boat.fh * 0.4)) { if (fits(f)) seat(f); else wave(f); } else sendHome(f);
  },
  key() { const f = friends.find(f => f.st === 'home' && fits(f)); if (f && phase === 'play') seat(f); },
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
  if (phase === 'play' && friends.length && need().every(f => f.st === 'seated')) { waiting = friends.filter(f => !fits(f)).map(f => f.kind); phase = 'party'; phaseT = 0; sfx.horn(); TK.say('출발!'); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') {
    TK.confetti(dt);
    if (phaseT > 1.0) boatX += boat.w * 0.9 * dt * Math.min(1, (phaseT - 1) * 1.5);
    if (Math.random() < dt * 10) TK.ring(boatX - boat.w * 0.5, boat.deck + boat.h * 0.9, 6 * TK.U, [255, 255, 255], 60);
    if (boatX - boat.w * 0.6 > TK.W) { phase = 'return'; phaseT = 0; rounds++; setIdx = (setIdx + 1) % SETS.length; friends = friends.filter(f => !fits(f)); boatX = -boat.w * 0.6; TK.flash(); }
  }
  if (phase === 'return') {
    boatX = Math.min(boat.x0, boatX + boat.w * 1.0 * dt);
    if (boatX >= boat.x0) { phase = 'play'; phaseT = 0; newSet(); sfx.sparkle(); lastSeat = TK.T; }
  }
}

// ---------- 바다·하늘 (그림책 화풍: 진한 테두리 구름, 겹겹 물결 + 거품, 반짝임, 젖은 모래, 조개) ----------
let sandPat = null;
function sandPattern() {
  if (sandPat) return sandPat;
  const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d');
  for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(150,105,50,.16)' : 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(Math.random() * 120, Math.random() * 120, 0.6 + Math.random() * 1.4, 0, 7); g.fill(); }
  return (sandPat = ctx.createPattern(c, 'repeat'));
}
const waveRow = (y, amp, len, ph, W) => { const p = new Path2D(); p.moveTo(-20, y); for (let x = -20; x <= W + 20; x += len / 2) { const k = Math.floor((x + 20) / (len / 2)); p.quadraticCurveTo(x + len / 4, y + (k % 2 ? amp : -amp) + Math.sin(TK.T * 1.2 + ph + x * 0.01) * amp * 0.4, x + len / 2, y); } return p; };
const gulls = [{ t: 0, y: 0.13, s: 1 }, { t: 0.55, y: 0.2, s: 0.75 }];
function drawGulls(W, H) {   // 갈매기: 오른쪽 → 왼쪽으로 천천히, 날갯짓은 위아래 흔들림
  const im = HG.lazyImg('o_gull'); if (!im) return;
  gulls.forEach((g, i) => { const span = W + 400, x = W + 150 - ((TK.T * 38 * TK.U + g.t * span) % span), y = H * g.y + Math.sin(TK.T * 2.4 + i) * H * 0.012, h = Math.min(W, H) * 0.075 * g.s; const w = h * im.naturalWidth / im.naturalHeight;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 + Math.sin(TK.T * 7 + i) * 0.08); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); });
}
function drawBg() {
  const W = TK.W, H = TK.H, sea = boat.deck - boat.h * 0.9, sand = H * 0.66, U = TK.U;
  if (HG.drawBg(ctx, 'bg_sea', 0, 0, W, H, 0.5, 0.5)) { drawGulls(W, H); return; }   // 손그림 바다 배경 (없으면 아래 코드 그림)
  // 하늘
  ctx.fillStyle = TK.grad(0, sea, '#8ccff5', '#e8f7ff'); ctx.fillRect(0, 0, W, sea + 2);
  const sr = Math.min(W, H) * 0.065, sx = W * 0.12, sy = H * 0.12;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 2.6); glow.addColorStop(0, 'rgba(255,240,170,.7)'); glow.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = glow; ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
  TK.ink(Math.max(2, 3 * U), () => {
    ell(sx, sy, sr, sr); ctx.fillStyle = '#ffd84a'; ctx.fill();
    for (let k = 0; k < 3; k++) {   // 구름
      const x = ((TK.T * 7 * (k + 1) + k * 420) % (W + 360)) - 180, y = H * (0.08 + k * 0.07), c = Math.min(W, H) * (0.045 + k * 0.006);
      const blobs = [[-1.0, 0.2, 0.62], [-0.25, -0.22, 0.82], [0.6, 0.0, 0.66], [0.1, 0.32, 0.6], [-0.6, 0.38, 0.5]];
      const pth = new Path2D(); blobs.forEach(([bx, by, br]) => { pth.moveTo(x + bx * c + br * c, y + by * c); pth.arc(x + bx * c, y + by * c, br * c, 0, 7); });
      ctx.save(); ctx.lineWidth = Math.max(4, 6 * U); ctx.strokeStyle = TK.INK; ctx.lineJoin = 'round'; blobs.forEach(([bx, by, br]) => { ctx.beginPath(); ctx.arc(x + bx * c, y + by * c, br * c, 0, 7); ctx.stroke(); }); ctx.restore();   // 바깥 테두리만 남게: 굵은 선 먼저
      ctx.save(); ctx.fillStyle = '#ffffff'; blobs.forEach(([bx, by, br]) => { ctx.beginPath(); ctx.arc(x + bx * c, y + by * c, br * c, 0, 7); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffffff'; CanvasRenderingContext2D.prototype.fill.call(ctx); }); ctx.restore();
    }
  });
  // 먼 섬과 야자수 (연하게)
  const ix = W * 0.82, iy = sea + 2;
  ctx.fillStyle = '#b9dca6'; ctx.beginPath(); ctx.ellipse(ix, iy, W * 0.09, H * 0.035, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#9a7a55'; ctx.lineWidth = Math.max(2, 3 * U); ctx.beginPath(); ctx.moveTo(ix + W * 0.01, iy - H * 0.02); ctx.quadraticCurveTo(ix + W * 0.02, iy - H * 0.06, ix + W * 0.005, iy - H * 0.1); ctx.stroke();
  ctx.fillStyle = '#8fc48a'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(ix + W * 0.005 + Math.cos(k * 1.26) * W * 0.018, iy - H * 0.1 + Math.sin(k * 1.26) * H * 0.008, W * 0.022, H * 0.008, k * 1.26, 0, 7); ctx.fill(); }
  // 바다: 수평선 → 앞으로 갈수록 밝게, 겹겹 물결 + 거품
  ctx.fillStyle = TK.grad(sea, sand, '#3a9fe0', '#7fd2f2'); ctx.fillRect(0, sea, W, sand - sea + 2);
  const rows = 6;
  for (let k = 0; k < rows; k++) {
    const t = k / (rows - 1), y = TK.lerp(sea + (sand - sea) * 0.12, sand - (sand - sea) * 0.08, t), amp = (3 + t * 5) * U, len = (60 + t * 70) * U;
    const p = waveRow(y, amp, len, k * 1.7 + TK.T * (0.2 + t * 0.3), W);
    const fillP = new Path2D(p); fillP.lineTo(W + 20, sand + 4); fillP.lineTo(-20, sand + 4); fillP.closePath();
    ctx.fillStyle = `hsl(${200 - t * 6}, ${70 + t * 6}%, ${52 + t * 12}%)`; ctx.fill(fillP);
    ctx.lineWidth = (1.5 + t * 2) * U; ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(255,255,255,${0.45 + t * 0.35})`; ctx.stroke(p);
  }
  for (let k = 0; k < 14; k++) {   // 반짝임
    const x = (k * 197 + 40) % W, y = sea + ((k * 71) % 100) / 100 * (sand - sea) * 0.85 + 6, a = Math.max(0, Math.sin(TK.T * 2.2 + k * 1.9)), r = (3 + (k % 3)) * U * a;
    if (r > 0.5) { ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`; ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.5, y); ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.5, y); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r * 2, y); ctx.lineTo(x, y + r * 0.5); ctx.lineTo(x + r * 2, y); ctx.lineTo(x, y - r * 0.5); ctx.closePath(); ctx.fill(); }
  }
  // 모래사장: 젖은 모래 띠 → 마른 모래, 들락날락 거품 줄
  const surf = sand + Math.sin(TK.T * 0.9) * 5 * U;
  ctx.fillStyle = TK.grad(surf, H, '#f7dfa6', '#efcd8a'); ctx.fillRect(0, surf, W, H - surf);
  ctx.fillStyle = sandPattern(); ctx.fillRect(0, surf, W, H - surf);
  ctx.fillStyle = 'rgba(190,150,90,.35)'; ctx.fillRect(0, surf, W, 14 * U);
  const foam = waveRow(surf, 4 * U, 46 * U, TK.T * 0.8, W); ctx.lineWidth = 7 * U; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(foam);
  TK.ink(Math.max(1.5, 2.2 * U), () => {   // 조개·불가사리
    [[0.08, 0.9, '#ff9fb4'], [0.93, 0.8, '#ffd27a'], [0.55, 0.96, '#ffb08a']].forEach(([fx, fy, c], i) => {
      const x = W * fx, y = H * fy, r = 11 * U;
      if (i === 1) { TK.star(x, y, r * 1.3, c, 0.3); ctx.beginPath(); for (let q = 0; q < 10; q++) { const a = -Math.PI / 2 + 0.3 + q * Math.PI / 5, rr = q % 2 ? r * 0.58 : r * 1.3; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(x, y + r * 0.6); ctx.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
    });
  });
}
// ---------- 배: 줄무늬 돛 + 나무 돛대 + 나무 판자 배 몸통 + 둥근 창, 앞 물결이 배 아래를 덮어 떠 있게 ----------
function sailPath(x, d, w, flap, back) {
  const p = new Path2D();
  if (back) { p.moveTo(x - w * 0.018, d - w * 0.56); p.quadraticCurveTo(x - w * 0.17 - flap, d - w * 0.34, x - w * 0.02, d - w * 0.13); p.closePath(); }
  else { p.moveTo(x + w * 0.018, d - w * 0.6); p.quadraticCurveTo(x + w * 0.24 + flap, d - w * 0.36, x + w * 0.018, d - w * 0.11); p.closePath(); }
  return p;
}
function drawBoatBack() {
  const x = boatX, d = boat.deck + bobY(), w0 = boat.w, w = Math.min(w0, (d - 14 * TK.U) / 0.64), flap = Math.sin(TK.T * 3) * w * 0.012, lw = Math.max(2, w0 * 0.006);
  const sail = HG.lazyImg('o_boat_sail');
  if (sail) {   // 손그림 돛: 돛대(그림 왼쪽 끝)를 배 가운데에 세우고 바람에 살짝 부풀었다 줄었다
    const sh = w * 0.66, sw = sh * sail.naturalWidth / sail.naturalHeight;
    ctx.save(); ctx.translate(x - sw * 0.06, d + w0 * 0.02); ctx.scale(1 + Math.sin(TK.T * 2.6) * 0.04, 1); ctx.drawImage(sail, 0, -sh, sw, sh); ctx.restore();
    if (jamo) HG.drawJamo(ctx, jamo, x + sw * 0.45, d - sh * 0.45, w * 0.11, '#e9644f', 0.18);
    return;
  }
  TK.ink(lw, () => {
    const mast = new Path2D(); mast.roundRect(x - w0 * 0.011, d - w * 0.63, w0 * 0.022, w * 0.63, w0 * 0.008); ctx.fillStyle = '#9a6538'; ctx.fill(mast);
    const back = sailPath(x, d, w, flap, true); ctx.fillStyle = '#fff3d0'; ctx.fill(back);
    const main = sailPath(x, d, w, flap, false); ctx.fillStyle = '#ffffff'; ctx.fill(main);
    ctx.save(); ctx.clip(main); for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0)' : '#ff7a6b'; ctx.fillRect(x, d - w * (0.6 - k * 0.125), w * 0.3, w * 0.0625); } ctx.restore();   // 빨간 줄무늬
    ctx.lineWidth = lw; ctx.strokeStyle = TK.INK; ctx.stroke(main);
    const flag = new Path2D(); flag.moveTo(x, d - w * 0.63); flag.quadraticCurveTo(x + w * 0.05, d - w * 0.62 + flap * 2, x + w * 0.1, d - w * 0.6 + flap); flag.lineTo(x, d - w * 0.565); flag.closePath(); ctx.fillStyle = '#ffd84a'; ctx.fill(flag);
    const top = new Path2D(); top.arc(x, d - w * 0.635, w0 * 0.016, 0, 7); ctx.fillStyle = '#ffd84a'; ctx.fill(top);
  });
  if (jamo) HG.drawJamo(ctx, jamo, x + w * 0.09 + flap * 0.5, d - w * 0.37, w * 0.11, '#e9644f', 0.18);   // 돛의 자음 (자음 배일 때)
}
function hullPath(x, d, w, h) {
  const p = new Path2D(); p.moveTo(x - w * 0.53, d - h * 0.12); p.lineTo(x + w * 0.55, d - h * 0.18);
  p.quadraticCurveTo(x + w * 0.47, d + h * 1.0, x + w * 0.3, d + h * 1.02); p.lineTo(x - w * 0.32, d + h * 1.02); p.quadraticCurveTo(x - w * 0.46, d + h * 0.95, x - w * 0.53, d - h * 0.12); p.closePath();
  return p;
}
const hullOff = document.createElement('canvas'), hullCtx = hullOff.getContext('2d');
function drawHull() {
  const x = boatX, d = boat.deck + bobY(), w = boat.w, h = boat.h, lw = Math.max(2.2, w * 0.007);
  const him = HG.lazyImg('o_boat_hull');
  if (him) {   // 손그림 배 몸통: 빨간 몸통 윗선(그림 높이 31%)을 갑판에 맞추고, 아래쪽은 물에 잠기게(그림 위에만 물빛 칠)
    const iw = w * 1.08, ih = iw * him.naturalHeight / him.naturalWidth, top = d - ih * 0.1, dpr = Math.min(devicePixelRatio || 1, 2);
    if (hullOff.width !== Math.ceil(iw * dpr) || hullOff.height !== Math.ceil(ih * dpr)) { hullOff.width = Math.ceil(iw * dpr); hullOff.height = Math.ceil(ih * dpr); }
    hullCtx.setTransform(dpr, 0, 0, dpr, 0, 0); hullCtx.clearRect(0, 0, iw, ih); hullCtx.globalCompositeOperation = 'source-over'; hullCtx.drawImage(him, 0, 0, iw, ih);
    const wl = ih * 0.8 + Math.sin(TK.T * 1.6) * ih * 0.015;   // 물 높이 (그림 안 좌표)
    const wg = hullCtx.createLinearGradient(0, wl, 0, ih); wg.addColorStop(0, 'rgba(90,210,226,.72)'); wg.addColorStop(1, 'rgba(40,160,200,.9)');
    hullCtx.globalCompositeOperation = 'source-atop'; hullCtx.fillStyle = wg; hullCtx.beginPath(); hullCtx.moveTo(0, wl);
    for (let k = 0; k <= 12; k++) hullCtx.quadraticCurveTo(iw * (k + 0.5) / 12, wl + (k % 2 ? 3 : -3) * TK.U, iw * (k + 1) / 12, wl);
    hullCtx.lineTo(iw, ih); hullCtx.lineTo(0, ih); hullCtx.closePath(); hullCtx.fill();
    hullCtx.strokeStyle = 'rgba(255,255,255,.95)'; hullCtx.lineWidth = 3.5 * TK.U; hullCtx.beginPath(); hullCtx.moveTo(0, wl); for (let k = 0; k <= 12; k++) hullCtx.quadraticCurveTo(iw * (k + 0.5) / 12, wl + (k % 2 ? 3 : -3) * TK.U, iw * (k + 1) / 12, wl); hullCtx.stroke();
    ctx.drawImage(hullOff, x - iw / 2, top, iw, ih);
    const buoy = HG.lazyImg('o_lifebuoy'); if (buoy) { const bh = ih * 0.42; ctx.drawImage(buoy, x - iw * 0.43, top + ih * 0.06, bh, bh); }   // 난간에 건 구명 튜브
    const wy = top + wl;
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { ell(x + sd * iw * (0.47 + k * 0.045), wy + h * (0.02 + k * 0.05), iw * (0.045 - k * 0.011), h * 0.06, 0); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); }   // 양 끝 물거품
    for (let k = 0; k < 3; k++) { const rx = x - iw * (0.58 + k * 0.1) - (TK.T * 30 % 30) * TK.U; ell(rx, wy + h * 0.12, iw * 0.05 * (1 + k * 0.3), h * 0.05); ctx.fillStyle = `rgba(255,255,255,${0.55 - k * 0.15})`; ctx.fill(); }   // 뒤 물결 자국
    if (jamo) { const r = h * 0.48; ell(x, d + h * 0.5, r, r); ctx.fillStyle = '#ffffff'; ctx.fill(); HG.drawJamo(ctx, jamo, x, d + h * 0.5, r * 1.3, '#e9644f', 0.17); }
    return;
  }
  const hull = hullPath(x, d, w, h);
  TK.ink(lw, () => {
    ctx.fillStyle = TK.grad(d - h * 0.2, d + h, '#f2735c', '#c9483a'); ctx.fill(hull);
    ctx.save(); ctx.clip(hull);
    ctx.strokeStyle = 'rgba(120,30,20,.28)'; ctx.lineWidth = Math.max(1.5, h * 0.03); for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - w * 0.6, d + h * k * 0.25); ctx.lineTo(x + w * 0.6, d + h * k * 0.25 - h * 0.05); ctx.stroke(); }   // 판자 줄
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - w * 0.6, d + h * 0.08, w * 1.2, h * 0.13);   // 흰 띠
    ctx.fillStyle = '#2f6fb3'; ctx.fillRect(x - w * 0.6, d + h * 0.78, w * 1.2, h * 0.3);   // 아래 파란 칠
    ctx.restore();
    const rim = new Path2D(); rim.roundRect(x - w * 0.55, d - h * 0.2, w * 1.12, h * 0.16, h * 0.08); ctx.fillStyle = '#b77a45'; ctx.fill(rim);   // 나무 난간
    for (let k = 0; k < 5; k++) { if (jamo && k === 2) continue; const px = x - w * 0.3 + k * w * 0.15, py = d + h * 0.48; const o = new Path2D(); o.arc(px, py, h * 0.15, 0, 7); ctx.fillStyle = '#ffd36b'; ctx.fill(o); const i2 = new Path2D(); i2.arc(px, py, h * 0.09, 0, 7); ctx.fillStyle = '#bfe8ff'; ctx.fill(i2); }   // 둥근 창
  });
  for (let k = 0; k < 5; k++) { if (jamo && k === 2) continue; ell(x - w * 0.3 + k * w * 0.15 - h * 0.03, d + h * 0.44, h * 0.03, h * 0.02); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); }
  if (jamo) {   // 뱃머리 자음 표지
    const r = h * 0.48, pulse = 1 + 0.05 * Math.sin(TK.T * 4);
    ell(x, d + h * 0.5, r * pulse, r * pulse); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#f0c879'; ctx.lineWidth = Math.max(3, h * 0.06); ctx.stroke();
    HG.drawJamo(ctx, jamo, x, d + h * 0.5, r * 1.3, '#e9644f', 0.17);
  }
  // 앞 물결: 배 아래쪽을 덮어 물에 떠 있는 것처럼
  const wy = d + h * 0.86, front = waveRow(wy, 4 * TK.U, 40 * TK.U, TK.T * 1.5, TK.W);
  const fp = new Path2D(front); fp.lineTo(x + w * 0.75, wy + h * 0.5); fp.lineTo(x - w * 0.75, wy + h * 0.5); fp.closePath();
  ctx.save(); ctx.clip(hull);   // 배 몸통 안쪽만 물에 잠김
  ctx.fillStyle = 'rgba(70,170,228,.9)'; ctx.fill(fp); ctx.lineWidth = 4 * TK.U; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.stroke(front); ctx.restore();
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { ell(x + sd * w * (0.5 + k * 0.05), wy + h * (0.02 + k * 0.05), w * (0.05 - k * 0.012), h * 0.06, 0); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); }   // 양 끝 물거품
  for (let k = 0; k < 3; k++) { const rx = x - w * (0.6 + k * 0.12) - (TK.T * 30 % 30) * TK.U; ell(rx, wy + h * 0.15, w * 0.05 * (1 + k * 0.3), h * 0.06); ctx.fillStyle = `rgba(255,255,255,${0.55 - k * 0.15})`; ctx.fill(); }   // 뒤 물결 자국
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
  get phase() { return phase; }, get rounds() { return rounds; }, get jamo() { return jamo; }, get friends() { return friends.map(f => f.kind + ':' + f.st); },
  actions() {   // 자동 확인용: 아직 모래밭에 있는 친구 하나를 배로 끄는 경로
    if (phase !== 'play') return [];
    const f = friends.find(f => f.st === 'home' && fits(f)); if (!f) return [];
    const pts = [], to = { x: boatX, y: boat.deck - boat.fh * 0.2 };
    for (let k = 0; k <= 14; k++) pts.push({ x: TK.lerp(f.x, to.x, k / 14), y: TK.lerp(f.y - boat.fh * 0.5, to.y, k / 14) });
    return [{ type: 'path', pts, wait: 450 }];
  },
};
// 별 시범: 모래밭 친구 하나를 배까지 끌고 가기
window.__demo = () => {
  if (phase !== 'play') return null;
  const f = friends.find(f => f.st === 'home' && fits(f)); if (!f) return null;
  return { kind: 'path', pts: [{ x: f.x, y: f.y - boat.fh * 0.5 }, { x: TK.lerp(f.x, boatX, 0.5), y: Math.min(f.y, boat.deck) - boat.fh * 1.6 }, { x: boatX, y: boat.deck - boat.fh * 0.3 }], say: jamo ? HG.JAMO_NAME[jamo] + ' 친구를 배에 태워 줘' : '배에 태워 줘' };
};
TK.start({ resize: layout, init() { layout(); boatX = boat.x0; newSet(); }, update, draw });
})();
