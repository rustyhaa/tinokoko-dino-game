// 티노코코 글자 달리기 — 탭 하나로 노는 달리기 (한글 놀이터, 예전 동시점프 러너 리뉴얼)
//  티노와 코코가 길을 달린다. 하늘에 글자 풍선이 차례로 떠 오고, 화면 왼쪽을 톡 하면 티노가, 오른쪽을 톡 하면 코코가 폴짝.
//  점프해서 풍선에 닿으면 퐁! 글자가 위쪽 단어 카드 제자리로 날아가며 "나." 하고 읽는다. 다 모이면 "나, 비. 나비!"
//  단어가 완성되면 그 그림 깃발이 길가에 꽂힌다. 단어 셋이면 결승선 잔치 → 다음 길(바닷가 → 숲 → 밤).
//  실패·점수 없음: 놓친 풍선은 다시 날아오고, 돌멩이에 부딪히면 "쿵" 하고 웃으며 계속 달린다.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const HG = window.H;   // 한글 모듈 (이 파일의 높이는 Hh)
const SCENES = ['bg_pk_beach', 'bg_pk_forest', 'bg_pk_night'];
let phase = 'play', phaseT = 0, rounds = 0, scene = 0, wordsDone = 0, scroll = 0, speed = 200;
let word = null, got = [], balloons = [], queue = [], rocks = [], flags = [], fly = [], finish = null, lastWord = '';
let gy = 500, th = 120, U = 1, spawnT = 0, rockT = 3;
const twins = [{ kind: 'tino', x: 0, y: 0, vy: 0, air: false, bonk: 0, happy: 0 }, { kind: 'coco', x: 0, y: 0, vy: 0, air: false, bonk: 0, happy: 0 }];

function layout() {
  const W = TK.W, Hh = TK.H, port = W < Hh; U = TK.U;
  gy = Hh * (port ? 0.8 : 0.84); th = Math.min(Hh * (port ? 0.16 : 0.24), W * 0.2);
  speed = Math.min(W, Hh * 1.6) * 0.28;   // 화면 크기에 맞춘 차분한 속도
  twins[0].x = W * (port ? 0.2 : 0.16); twins[1].x = W * (port ? 0.42 : 0.3);
  twins.forEach(t => { if (!t.air) t.y = 0; });
}
const balloonY = () => gy - th * 1.35;   // 점프하면 닿는 높이
const jumpV = () => Math.sqrt(2 * 2400 * U * th * 1.05);
function newWord() {
  const stage = HG.cfg().stage, maxLen = stage <= 1 ? 2 : 3;
  const fav = HG.favWords().filter(w => [...w].length >= 2 && [...w].length <= maxLen && w !== lastWord && HG.hasPic(w));
  const pool = HG.pick(12, { pic: true, exclude: [lastWord] }).filter(o => o.syl.length >= 2 && o.syl.length <= maxLen);
  const w = (fav.length && wordsDone % 2 === 0 ? HG.word(TK.pick(fav)) : pool[0]) || HG.word('나비');
  word = w; lastWord = w.w; got = w.syl.map(() => false); queue = w.syl.map((_, i) => i); spawnT = 0.8;
}
function spawnBalloon(si) {
  balloons.push({ si, x: TK.W + 60 * U, y: balloonY(), ph: rand(0, 6), c: TK.COLS[(si * 2 + wordsDone) % 7], pop: -1 });
}
function jump(t) {
  if (t.air || phase === 'scene') return;
  t.air = true; t.vy = jumpV(); sfx.boing();
}
function tapAt(x, y) {
  TK.audio();
  if (phase === 'party') { HG.read(word.w); return; }
  jump(x < TK.W / 2 ? twins[0] : twins[1]);
}
TK.input({ down(p) { tapAt(p.x, p.y); }, key(e) { jump(e && e.key === 'ArrowRight' ? twins[1] : twins[0]); } });

function collect(b) {
  b.pop = 0; sfx.pop(); TK.spark(b.x, b.y, b.c, 10, 0.8);
  if (!got[b.si] && !fly.some(f => f.si === b.si)) { fly.push({ si: b.si, x: b.x, y: b.y, fx: b.x, fy: b.y, t: 0 }); HG.saySyl(word.syl[b.si]); }
}
const slot = i => { const fs = cardFont(), gap = fs * 1.02; return { x: TK.W / 2 - (word.syl.length - 1) * gap / 2 + i * gap, y: TK.H * 0.12 }; };
const cardFont = () => Math.min(TK.W, TK.H) * 0.085;

function update(dt) {
  phaseT += dt;
  const run = phase === 'play' || phase === 'party' ? speed : phase === 'finish' ? speed * 0.6 : 0;
  scroll += run * dt;
  // 친구들: 점프·착지, 부딪힘 흔들림
  twins.forEach(t => {
    if (t.air) { t.y += t.vy * dt; t.vy -= 2400 * U * dt; if (t.y <= 0) { t.y = 0; t.air = false; t.vy = 0; } }
    t.bonk = Math.max(0, t.bonk - dt); t.happy = Math.max(0, t.happy - dt);
  });
  // 풍선: 차례로 날아옴, 놓치면 다시 줄 끝으로
  if (phase === 'play') {
    spawnT -= dt;
    if (spawnT <= 0 && queue.length && balloons.filter(b => b.pop < 0).length < 2) { spawnBalloon(queue.shift()); spawnT = 2.2; }
  }
  balloons.forEach(b => {
    b.x -= run * dt; b.y = balloonY() + Math.sin(TK.T * 2 + b.ph) * th * 0.08;
    if (b.pop >= 0) { b.pop += dt * 3; return; }
    twins.forEach(t => { const hy = gy - t.y - th * 0.85; if (t.y > th * 0.25 && Math.abs(b.x - t.x) < th * 0.45 && Math.abs(b.y - hy) < th * 0.6) collect(b); });
    if (b.x < -60 * U && !got[b.si]) { b.pop = 9; queue.push(b.si); }   // 놓친 글자는 다시
  });
  balloons = balloons.filter(b => b.pop < 1 && b.x > -80 * U);
  // 날아가는 글자 → 단어 카드
  fly.forEach(f => {
    f.t += dt / 0.6; const s = slot(f.si), e = TK.ease(f.t);
    f.x = TK.lerp(f.fx, s.x, e); f.y = TK.lerp(f.fy, s.y, e) - Math.sin(Math.PI * clamp(f.t, 0, 1)) * TK.H * 0.06;
    if (f.t >= 1) { got[f.si] = true; TK.spark(s.x, s.y, TK.pick(TK.COLS), 8, 0.6); TK.tone(TK.PENTA[(f.si * 2 + 3) % 10] * 2, 0, 0.3, 'sine', 0.14); }
  });
  fly = fly.filter(f => f.t < 1);
  // 돌멩이: 가끔. 부딪히면 쿵 하고 웃기만
  if (phase === 'play') { rockT -= dt; if (rockT <= 0) { rocks.push({ x: TK.W + 40 * U, hit: false, r: th * rand(0.16, 0.22) }); rockT = rand(4, 7); } }
  rocks.forEach(r => {
    r.x -= run * dt;
    twins.forEach(t => { if (!r.hit && !t.air && Math.abs(r.x - t.x) < th * 0.25) { r.hit = true; t.bonk = 0.5; t.air = true; t.vy = jumpV() * 0.45; TK.tone(140, 0, 0.18, 'sine', 0.25, 80); sfx.giggle(t.kind, 0.1); } });
  });
  rocks = rocks.filter(r => r.x > -60 * U);
  flags.forEach(f => f.x -= run * dt); flags = flags.filter(f => f.x > -200 * U);
  // 단어 완성
  if (phase === 'play' && word && got.length && got.every(Boolean)) {
    phase = 'party'; phaseT = 0; wordsDone++; sfx.fanfare(); setTimeout(() => { HG.read(word.w); TK.wordPop(word.w, TK.W / 2, TK.H * 0.34); }, 350);
    twins.forEach(t => t.happy = 2); flags.push({ x: TK.W + 80 * U, w: word.w });
  }
  if (phase === 'party') {
    TK.confetti(dt * 0.5);
    if (phaseT > 3.2) {
      if (wordsDone % 3 === 0) { phase = 'finish'; phaseT = 0; finish = { x: TK.W + 60 * U }; }
      else { phase = 'play'; phaseT = 0; newWord(); }
    }
  }
  if (phase === 'finish') {
    if (finish) finish.x -= speed * 0.6 * dt;
    if (finish && finish.x < twins[1].x && !finish.done) { finish.done = true; sfx.fanfare(); sfx.clap(); twins.forEach(t => { t.happy = 3; jump(t); }); }
    if (finish && finish.done) TK.confetti(dt);
    if (phaseT > 6.5) { phase = 'scene'; phaseT = 0; }
  }
  if (phase === 'scene' && phaseT > 0.8) { scene = (scene + 1) % SCENES.length; rounds++; finish = null; rocks = []; flags = []; phase = 'play'; phaseT = 0; newWord(); TK.flash(); sfx.sparkle(); }
}

// 배경: 손그림 배경을 옆으로 흐르게 (번갈아 좌우 뒤집어 이어 붙여 이음매를 감춤)
function drawBg() {
  const W = TK.W, Hh = TK.H, f = HG.bgFit(SCENES[scene], 0, 0, W, Hh, 0, 1);
  if (!f) { ctx.fillStyle = TK.grad(0, Hh, '#8fd4ff', '#fbe7b4'); ctx.fillRect(0, 0, W, Hh); return; }
  f.dh = Hh; f.dy = 0; const dw = f.dh * f.im.naturalWidth / f.im.naturalHeight, off = (scroll * 0.5) % (dw * 2);   // 높이에 맞추고 옆으로 이어 붙임 (하늘이 잘리지 않게)
  for (let k = -1; k < Math.ceil(W / dw) + 2; k++) {
    const x = k * dw - off;
    ctx.save(); if (((k % 2) + 2) % 2) { ctx.translate(x + dw, f.dy); ctx.scale(-1, 1); ctx.drawImage(f.im, 0, 0, dw, f.dh); } else ctx.drawImage(f.im, x, f.dy, dw, f.dh); ctx.restore();
  }
  // 달리는 길 (흙길 띠 + 흐르는 점선)
  ctx.fillStyle = 'rgba(236,206,150,.88)'; ctx.fillRect(0, gy - th * 0.06, W, Hh);
  ctx.fillStyle = 'rgba(205,168,112,.9)'; ctx.fillRect(0, gy - th * 0.06, W, Math.max(3, th * 0.04));
  ctx.fillStyle = 'rgba(255,248,230,.75)';
  const dash = th * 0.5; for (let x = -((scroll) % (dash * 2)); x < W; x += dash * 2) TK.rr(x, gy + th * 0.22, dash, Math.max(4, th * 0.05), th * 0.03), ctx.fill();
  if (phase === 'scene') { ctx.fillStyle = `rgba(255,255,255,${Math.sin(Math.PI * clamp(phaseT / 0.8, 0, 1))})`; ctx.fillRect(0, 0, W, Hh); }
}
function drawBalloon(b) {
  const s = b.pop >= 0 ? 1 + b.pop * 0.6 : 1, a = b.pop >= 0 ? 1 - b.pop : 1, r = th * 0.36;
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
  ctx.beginPath(); ctx.moveTo(b.x, b.y + r); ctx.quadraticCurveTo(b.x + Math.sin(TK.T * 3 + b.ph) * r * 0.3, b.y + r * 1.8, b.x, b.y + r * 2.5); ctx.strokeStyle = 'rgba(80,60,50,.6)'; ctx.lineWidth = 2; ctx.stroke();   // 줄
  ctx.translate(b.x, b.y); ctx.scale(s, s);
  TK.ink(Math.max(2, r * 0.06), () => { ell(0, 0, r * 0.9, r); ctx.fillStyle = TK.rgba(b.c, 1); ctx.fill(); });
  ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.98); ctx.lineTo(r * 0.12, r * 0.98); ctx.lineTo(0, r * 1.15); ctx.closePath(); ctx.fillStyle = TK.rgba(b.c, 1); ctx.fill();
  ell(-r * 0.35, -r * 0.45, r * 0.16, r * 0.26, -0.5); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
  if (b.pop < 0 && word) HG.drawWord(ctx, word.syl[b.si], 0, r * 0.05, r * 0.95, { color: '#ffffff', outline: 'rgba(59,42,32,.55)' });
  ctx.restore();
}
function drawRock(r) {
  TK.ink(Math.max(2, r.r * 0.12), () => { ell(r.x, gy - r.r * 0.55, r.r * 1.2, r.r * 0.75); ctx.fillStyle = '#a7a39b'; ctx.fill(); });
  ell(r.x - r.r * 0.4, gy - r.r * 0.85, r.r * 0.35, r.r * 0.18, -0.3); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
}
function drawFlag(f) {
  const h = th * 1.4, x = f.x, y = gy - th * 0.02;
  TK.ink(2, () => { ctx.fillStyle = '#8a5a3a'; TK.rr(x - 3 * U, y - h, 6 * U, h, 3 * U); ctx.fill(); });
  ctx.save(); ctx.translate(x + th * 0.45, y - h * 0.55); HG.drawPic(ctx, f.w, th * 0.7); ctx.restore();
  HG.drawTag(ctx, f.w, x + th * 0.45, y - h * 0.4, th * 0.16);
}
function drawFinish() {
  if (!finish) return;
  const x = finish.x, h = th * 2.2;
  TK.ink(2, () => { for (const dx of [-th * 1.2, th * 1.2]) { ctx.fillStyle = '#ffffff'; TK.rr(x + dx - 5 * U, gy - h, 10 * U, h, 4 * U); ctx.fill(); } });
  for (let i = 0; i < 8; i++) { const cx = x - th * 1.2 + i * th * 0.3; ctx.fillStyle = i % 2 ? '#ffffff' : '#ff5a5f'; ctx.fillRect(cx, gy - h, th * 0.3, th * 0.3); }
  ctx.strokeStyle = TK.INK; ctx.lineWidth = 2; ctx.strokeRect(x - th * 1.2, gy - h, th * 2.4, th * 0.3);
}
function draw() {
  const W = TK.W, Hh = TK.H;
  drawBg();
  flags.forEach(drawFlag); drawFinish(); rocks.forEach(drawRock);
  // 친구들 (그림자 → 몸)
  twins.forEach((t, i) => {
    ell(t.x, gy, th * 0.32 * (1 - t.y / (th * 2.5)), th * 0.06); ctx.fillStyle = 'rgba(70,45,20,.22)'; ctx.fill();
    const bob = t.air ? 0 : TK.bob(i * 1.3, th * 0.05, 9), wob = t.bonk > 0 ? Math.sin(t.bonk * 40) * 0.12 : 0;
    ctx.save(); ctx.translate(t.x, gy - t.y - bob); ctx.rotate(wob);
    TK.twin(t.kind, t.air ? 'jump' : t.happy > 0 ? 'happy' : 'idle', 0, 0, th, { face: 'right' });
    ctx.restore();
  });
  balloons.forEach(drawBalloon);
  // 위쪽 단어 카드: 모은 글자만 진하게
  if (word) {
    const fs = cardFont(), cw = word.syl.length * fs * 1.02 + fs * 0.9, chh = fs * 1.45, cy = Hh * 0.12, hi = HG.hi(word.w);
    ctx.save(); ctx.shadowColor = 'rgba(80,60,30,.25)'; ctx.shadowBlur = fs * 0.3; ctx.shadowOffsetY = fs * 0.08; TK.rr(W / 2 - cw / 2, cy - chh / 2, cw, chh, chh / 2); ctx.fillStyle = 'rgba(255,253,245,.9)'; ctx.fill(); ctx.restore();
    TK.rr(W / 2 - cw / 2, cy - chh / 2, cw, chh, chh / 2); ctx.lineWidth = Math.max(2, fs * 0.05); ctx.strokeStyle = '#e9c88a'; ctx.stroke();
    word.syl.forEach((ch, i) => { const s = slot(i); HG.drawWord(ctx, ch, s.x, s.y, fs, got[i] ? { color: '#2b3550', hi: hi === 'all' || hi === i ? 'all' : -1 } : { color: 'rgba(43,53,80,.16)', outline: 'rgba(0,0,0,0)' }); });
    if (phase === 'party') { const k = clamp(phaseT / 0.5, 0, 1); ctx.save(); ctx.translate(W / 2, cy + chh * 0.6 + th * 0.9); ctx.scale(TK.back(k), TK.back(k)); HG.drawPic(ctx, word.w, th * 0.9); ctx.restore(); }
  }
  fly.forEach(f => HG.drawWord(ctx, word.syl[f.si], f.x, f.y, cardFont(), { color: '#ff6b3d' }));
  TK.drawParts();
}

// 자동 확인·별 시범: 다가오는 풍선에 맞춰 그 아래 친구 쪽을 톡
function nextHit() {
  for (const b of balloons) { if (b.pop >= 0) continue; for (const t of twins) { const dx = b.x - t.x; if (!t.air && dx > 0 && dx < speed * 0.42) return t; } }
  return null;
}
window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get words() { return wordsDone; }, get word() { return word && word.w; }, get got() { return got.slice(); },
  actions() { if (phase !== 'play') return []; const t = nextHit(); if (!t) return []; return [{ type: 'tap', x: t === twins[0] ? TK.W * 0.15 : TK.W * 0.85, y: TK.H * 0.5, wait: 80 }]; },
};
window.__demo = () => {
  if (phase !== 'play') return null;
  const b = balloons.find(b => b.pop < 0 && b.x > TK.W * 0.4); if (!b) return null;
  return { kind: 'tap', x: TK.W * 0.25, y: TK.H * 0.55, say: '톡 하면 폴짝 뛰어요' };
};
if (window.TKMusic) TKMusic.play('beach');
TK.start({ resize: layout, init() { layout(); newWord(); }, update, draw });
})();
