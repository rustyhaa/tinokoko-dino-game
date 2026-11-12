// 티노코코 쿵짝 악단 — 탭 하나로 노는 자유 연주
//  북·실로폰·나팔·탬버린을 두드리면 소리가 나고 무대 위 티노와 코코가 박자에 맞춰 춤춘다.
//  실로폰은 손가락으로 쓸면 또로롱. 12번 칠 때마다 동물 친구가 한 명씩 합류하고, 셋이 모이면 피날레!
//  정답·목표 없음. 아무렇게나 쳐도 늘 어울리는 음(펜타토닉)만 나온다.
(() => {
const { ctx, ell, rand, clamp, sfx, tone, noise } = TK;
const HG = window.H;   // 한글 모듈 (이 파일 안의 H 는 화면 높이)
// 실로폰 글자: 3단계(가나다)는 가 나 다 라 마 바, 그 전엔 이름·단어의 첫 글자
let syls = [];
function pickSyls() {
  if (HG.cfg().stage >= 3) { syls = HG.GANA.slice(0, 6); return; }
  const out = [];
  ['티노', '코코'].concat(HG.pick(12).map(o => o.w)).forEach(w => [...w].forEach(c => { if (out.length < 6 && !out.includes(c)) out.push(c); }));
  syls = out;
}
pickSyls();
// 합류하는 친구: 좋아하는 것(공룡·고래)을 먼저
const friendPool = () => HG.favWords().concat(['토끼', '개구리', '나비', '오리', '하마', '게']);
let phase = 'play', phaseT = 0, rounds = 0, hits = 0, beat = 0, friendIdx = 0, lastHit = 0;
let inst = [], band = [], twins = [{ kind: 'tino', hop: -1, move: 0 }, { kind: 'coco', hop: -1, move: 0 }], notes = [], bars = [];

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  const s = port ? Math.min(W * 0.15, H * 0.09) : Math.min(W * 0.1, H * 0.17);
  const pos = port ? [[0.2, 0.69], [0.5, 0.86], [0.8, 0.69], [0.5, 0.69]] : [[0.11, 0.8], [0.405, 0.84], [0.715, 0.8], [0.9, 0.8]];   // 나팔이 실로폰 글자를 가리지 않게
  inst = ['drum', 'xylo', 'horn', 'tamb'].map((k, i) => Object.assign(inst[i] || { hit: 0 }, { kind: k, x: pos[i][0] * W, y: pos[i][1] * H, s: k === 'xylo' ? s * (port ? 1.5 : 1.3) : s }));
  if (port) inst[3].s = s * 0.8;
  const xy = inst[1];
  bars = [0, 1, 2, 3, 4, 5].map(i => ({ i, x: xy.x - xy.s * 1.25 + i * xy.s * 0.5, y: xy.y, w: xy.s * 0.42, h: xy.s * (1.3 - i * 0.1), bump: (bars[i] || {}).bump || 0 }));
  twins.forEach((t, i) => { t.h = port ? H * 0.22 : H * 0.4; t.x = W * (i ? (port ? 0.73 : 0.62) : (port ? 0.27 : 0.38)); t.yb = port ? H * 0.55 : H * 0.66; });
  band.forEach((f, i) => { f.hx = W * [0.18, 0.82, 0.5][i]; f.y = port ? H * 0.3 : H * 0.42; });
}
const xyloNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
// 따라 치기: 반짝이는 바를 치면 노래가 한 음씩 나아감 (학교종이 땡땡땡). 다른 바를 쳐도 그냥 소리만 — 틀림 없음
//  솔솔라라솔솔미 솔솔미미레 솔솔라라솔솔미 솔미레미도 (바 번호: 도0 레1 미2 솔3 라4 높은도5)
const SONG = [3, 3, 4, 4, 3, 3, 2, 3, 3, 2, 2, 1, 3, 3, 4, 4, 3, 3, 2, 3, 2, 1, 2, 0];
let songI = 0, songGlow = 0;
function playInst(k, barI) {
  if (k === 'drum') { tone(150, 0, 0.35, 'sine', 0.5, 50); noise(0.12, 300, 0.25); }
  else if (k === 'xylo') { const f = xyloNotes[barI]; tone(f, 0, 0.6, 'triangle', 0.25); tone(f * 4, 0, 0.08, 'sine', 0.05); HG.saySyl(syls[barI]); }
  else if (k === 'horn') { const f = TK.pick([392, 440, 523.25]); tone(f, 0, 0.18, 'sawtooth', 0.09); tone(f * 1.26, 0.18, 0.3, 'sawtooth', 0.09); tone(f, 0, 0.45, 'square', 0.03); }
  else { for (let i = 0; i < 4; i++) noise(0.08, 7000, 0.12, i * 0.05, 0, 3); tone(1800, 0, 0.1, 'triangle', 0.04); }
}
function hit(k, barI = 0) {
  if (phase === 'leave') return;
  playInst(k, barI);
  const it = inst.find(i => i.kind === k); it.hit = 1;
  if (k === 'xylo') bars[barI].bump = 1;
  if (k === 'xylo' && phase === 'play' && barI === SONG[songI]) {   // 노래 한 음 앞으로
    songI++; songGlow = 1; TK.spark(bars[barI].x, bars[barI].y - bars[barI].h * 0.6, [255, 224, 102], 5, 0.5);
    if (songI >= SONG.length) { songI = 0; hits = 12; sfx.sparkle(); }   // 한 곡 끝 → 친구가 바로 합류
  }
  notes.push({ x: it.x + rand(-it.s * 0.3, it.s * 0.3), y: it.y - it.s, vx: rand(-30, 30) * TK.U, t: 0, c: TK.pick(TK.COLS) });
  hits++; beat++; lastHit = TK.T;
  twins.forEach((t, i) => { if (beat % 2 === i || k === 'drum') t.hop = 0; t.move = (t.move + 1) % 4; });
  band.forEach(f => f.hop = 0);
  if (phase === 'play' && hits >= 12) {   // 친구 합류
    hits = 0;
    if (band.length < 3) { const pool = friendPool(), kind = pool[friendIdx++ % pool.length]; band.push({ kind, x: 0, hx: 0, y: 0, t: 0, hop: -1, side: band.length % 2 ? 1 : -1 }); layout(); sfx.sparkle(); setTimeout(() => HG.read(kind), 400); }
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
  bars.forEach(b => b.bump = Math.max(0, b.bump - dt * 5)); songGlow = Math.max(0, songGlow - dt * 3);
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
    if (phaseT > 1.2) { band = []; phase = 'play'; phaseT = 0; rounds++; hits = 0; pickSyls(); }
  }
}

function drawNote(x, y, s, c) {
  const im = HG.lazyImg('o_note'); if (im) { const m = /,([\d.]+)\)$/.exec(c); ctx.save(); ctx.globalAlpha = m ? +m[1] : 1; ctx.drawImage(im, x - s, y - s * 2.2, s * 2, s * 2.2); ctx.restore(); return; }
  ctx.fillStyle = c; ell(x, y, s * 0.55, s * 0.4, -0.4); ctx.fill();
  ctx.fillRect(x + s * 0.42, y - s * 1.6, s * 0.14, s * 1.6);
  ctx.beginPath(); ctx.moveTo(x + s * 0.56, y - s * 1.6); ctx.quadraticCurveTo(x + s * 1.1, y - s * 1.3, x + s * 0.9, y - s * 0.8); ctx.lineWidth = s * 0.14; ctx.strokeStyle = c; ctx.stroke();
}
// ---------- 그림책 화풍 도우미: 진한 갈색 테두리 + 크레용 질감 + 바닥 그림자 + 반짝임 (손그림 티노·코코와 맞춤) ----------
const INK = '#3b2a20';
let crayon = null;
function crayonPat() {   // 작은 얼룩 무늬를 한 번 만들어 반복 (색 위에 살짝 곱하기)
  if (crayon) return crayon;
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  for (let i = 0; i < 900; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.05 + Math.random() * 0.08})` : `rgba(255,255,255,${0.06 + Math.random() * 0.1})`; g.fillRect(Math.random() * 96, Math.random() * 96, 1 + Math.random() * 2.5, 1 + Math.random() * 1.2); }
  return (crayon = ctx.createPattern(c, 'repeat'));
}
function inkFill(path, color, lw) {   // 채우고 → 질감 → 테두리
  ctx.fillStyle = color; ctx.fill(path);
  ctx.save(); ctx.clip(path); ctx.fillStyle = crayonPat(); ctx.fillRect(-2000, -2000, 4000, 4000); ctx.restore();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(path);
}
const ellP = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, Math.max(rx, .01), Math.max(ry, .01), rot, 0, Math.PI * 2); return p; };
const rrP = (x, y, w, h, r) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };
const shine = (x0, y0, x1, y1, w) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.stroke(); };
const floorShadow = (x, y, rx, ry) => { ell(x, y, rx, ry); ctx.fillStyle = 'rgba(70,35,10,.22)'; ctx.fill(); };
function drawInst(it) {
  const s = it.s, sh = it.hit, lw = Math.max(2, s * 0.055);
  if (it.kind === 'xylo') {
    floorShadow(it.x, it.y + s * 0.42, s * 1.7, s * 0.14);
    for (const dy of [-0.2, 0.2]) inkFill(rrP(it.x - s * 1.6, it.y + dy * s - s * 0.07, s * 3.2, s * 0.14, s * 0.07), '#8a5a3a', lw * 0.8);   // 받침 두 줄
    bars.forEach(b => {
      const y = b.y - b.bump * s * 0.08, c = TK.COLS[b.i];
      inkFill(rrP(b.x - b.w / 2, y - b.h / 2, b.w, b.h, b.w * 0.28), TK.rgba(c, 1), lw);
      shine(b.x - b.w * 0.26, y - b.h * 0.36, b.x - b.w * 0.26, y - b.h * 0.12, b.w * 0.09);
      for (const k of [-1, 1]) { const p = ellP(b.x, y + k * b.h * 0.38, b.w * 0.085, b.w * 0.085); inkFill(p, '#e6e2da', lw * 0.5); }   // 고정 나사
    });
    bars.forEach(b => HG.drawWord(ctx, syls[b.i] || '', b.x, b.y + b.h * 0.06 - b.bump * s * 0.08, b.w * 0.62, { color: '#ffffff', outline: 'rgba(59,42,32,.55)' }));   // 바마다 글자
    return;
  }
  ctx.save(); ctx.translate(it.x, it.y);
  { const art = { drum: 'o_drum', horn: 'o_horn', tamb: 'o_tamb' }[it.kind], im = art && HG.lazyImg(art);   // 손그림 악기 (치면 찌그러지고 흔들림)
    if (im) {
      floorShadow(0, s * (it.kind === 'tamb' ? 0.85 : 0.62), s * 0.95, s * 0.15);
      if (it.kind === 'drum') ctx.scale(1 + sh * 0.06, 1 - sh * 0.06); else if (it.kind === 'horn') ctx.rotate(-0.12 - sh * 0.15); else ctx.rotate(Math.sin(TK.T * 30) * 0.25 * sh);
      const hh = s * { drum: 1.75, horn: 1.2, tamb: 1.55 }[it.kind], ww = hh * im.naturalWidth / im.naturalHeight;
      ctx.drawImage(im, -ww / 2, s * 0.65 - hh, ww, hh); ctx.restore(); return;
    } }
  if (it.kind === 'drum') {
    floorShadow(0, s * 0.62, s * 1.05, s * 0.18);
    ctx.scale(1 + sh * 0.05, 1 - sh * 0.05);
    const body = new Path2D(); body.moveTo(-s * 0.9, -s * 0.55); body.lineTo(-s * 0.9, s * 0.35); body.ellipse(0, s * 0.35, s * 0.9, s * 0.25, 0, Math.PI, 0, true); body.lineTo(s * 0.9, -s * 0.55); body.closePath();
    inkFill(body, '#e9504f', lw);
    ctx.save(); ctx.clip(body); ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = s * 0.07; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.9 + k * s * 0.45, -s * 0.5); ctx.lineTo(-s * 0.68 + k * s * 0.45, s * 0.5); ctx.stroke(); } ctx.restore();   // 지그재그 끈
    inkFill(rrP(-s * 0.95, s * 0.2, s * 1.9, s * 0.14, s * 0.07), '#f2c060', lw * 0.7);   // 아래 테
    inkFill(ellP(0, -s * 0.55, s * 0.92, s * 0.27), '#fff4e2', lw);   // 북면
    if (sh > 0) { ell(0, -s * 0.55, s * 0.9 * (1 - sh * 0.5), s * 0.25 * (1 - sh * 0.5)); ctx.strokeStyle = `rgba(200,150,90,${sh})`; ctx.lineWidth = lw; ctx.stroke(); }
    shine(-s * 0.72, -s * 0.3, -s * 0.72, s * 0.15, s * 0.07);
    for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * s * 0.55, -s * 0.85); ctx.rotate(k * 0.5); inkFill(rrP(-s * 0.04, -s * 0.5, s * 0.08, s * 0.6, s * 0.04), '#d9b07a', lw * 0.6); inkFill(ellP(0, -s * 0.5, s * 0.1, s * 0.1), '#ffffff', lw * 0.6); ctx.restore(); }   // 북채
  } else if (it.kind === 'horn') {
    floorShadow(0, s * 0.6, s * 0.95, s * 0.14);
    ctx.rotate(-0.25 - sh * 0.15);
    const horn = new Path2D(); horn.moveTo(-s * 0.95, -s * 0.11); horn.lineTo(s * 0.3, -s * 0.13); horn.quadraticCurveTo(s * 0.7, -s * 0.2, s * 0.98, -s * 0.58); horn.lineTo(s * 0.98, s * 0.58); horn.quadraticCurveTo(s * 0.7, s * 0.2, s * 0.3, s * 0.13); horn.lineTo(-s * 0.95, s * 0.11); horn.closePath();
    inkFill(horn, '#ffc93c', lw);
    inkFill(ellP(s * 0.98, 0, s * 0.15, s * 0.58), '#e8a91a', lw);   // 나팔 입구
    for (let k = 0; k < 3; k++) inkFill(rrP(-s * 0.38 + k * s * 0.2, -s * 0.42, s * 0.11, s * 0.3, s * 0.04), '#e8a91a', lw * 0.7);   // 누름 단추
    inkFill(ellP(-s * 0.98, 0, s * 0.1, s * 0.17), '#e8a91a', lw * 0.8);
    shine(-s * 0.7, -s * 0.05, s * 0.2, -s * 0.06, s * 0.05); shine(s * 0.6, -s * 0.2, s * 0.85, -s * 0.42, s * 0.05);
  } else {
    floorShadow(0, s * 0.85, s * 0.8, s * 0.13);
    ctx.rotate(Math.sin(TK.T * 30) * 0.25 * sh);
    const ring = new Path2D(); ring.arc(0, 0, s * 0.76, 0, Math.PI * 2); ring.arc(0, 0, s * 0.6, 0, Math.PI * 2, true);
    inkFill(ellP(0, 0, s * 0.6, s * 0.6), '#fff1d6', lw * 0.8);   // 가죽
    inkFill(ring, '#d9a35a', lw);   // 나무 테
    for (let k = 0; k < 6; k++) { const a = k * TK.TAU / 6, x = Math.cos(a) * s * 0.68, y = Math.sin(a) * s * 0.68; inkFill(ellP(x, y, s * 0.14, s * 0.14), '#dfe4ea', lw * 0.6); ell(x - s * 0.04, y - s * 0.04, s * 0.04, s * 0.04); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); }   // 방울
    shine(-s * 0.35, -s * 0.3, -s * 0.15, -s * 0.42, s * 0.06);
  }
  ctx.restore();
}
function draw() {
  const W = TK.W, H = TK.H, port = W < H, floor = port ? H * 0.58 : H * 0.68;
  const art = HG.drawBg(ctx, 'bg_band', 0, 0, W, floor + H * 0.04, 0.5, 0.85);   // 손그림 무대 (커튼 포함)
  if (!art) { ctx.fillStyle = TK.grad(0, floor, '#3a1d52', '#6b3384'); ctx.fillRect(0, 0, W, floor); }
  // 조명
  for (let k = 0; k < 3; k++) {
    const x = W * (0.25 + k * 0.25) + Math.sin(TK.T * 0.8 + k * 2 + beat * 0.3) * W * 0.08;
    ctx.fillStyle = TK.rgba(TK.COLS[(k * 2 + beat) % 7], (phase === 'party' ? 0.28 : 0.13) * (art ? 0.6 : 1));
    ctx.beginPath(); ctx.moveTo(W * (0.2 + k * 0.3), 0); ctx.lineTo(x - W * 0.12, floor); ctx.lineTo(x + W * 0.12, floor); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = TK.grad(floor, H, '#b9824f', '#8a5a33'); ctx.fillRect(0, floor, W, H - floor);
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; for (let y = floor + 20; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // 커튼
  if (!art) for (const sd of [0, 1]) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); const x0 = sd ? W : 0, dx = sd ? -1 : 1; ctx.moveTo(x0, 0); ctx.lineTo(x0 + dx * W * 0.12, 0); ctx.quadraticCurveTo(x0 + dx * W * 0.05, floor * 0.5, x0 + dx * W * 0.09, floor); ctx.lineTo(x0, floor); ctx.fill(); }
  ctx.fillStyle = '#a93226'; if (!art) for (let x = 0; x < W; x += 40 * TK.U) { ell(x + 20 * TK.U, 0, 24 * TK.U, 26 * TK.U); ctx.fill(); }
  band.forEach((f, i) => { ctx.save(); ctx.translate(f.x, f.y - TK.hopY(f.hop, H * 0.04)); ctx.rotate(Math.sin(TK.T * 4 + i) * 0.1); HG.drawPic(ctx, f.kind, port ? H * 0.08 : H * 0.14); ctx.restore(); const nm = f.kind; HG.drawTag(ctx, nm, f.x, f.y + (port ? H * 0.025 : H * 0.04), port ? H * 0.018 : H * 0.03, { hi: HG.hi(nm) }); });
  twins.forEach((t, i) => {
    const pose = phase === 'party' ? TK.partyPose(i) : (t.move % 2 ? 'jump' : (t.kind === 'coco' ? 'happy' : 'idle'));
    const lean = Math.sin(TK.T * 3 + i * 1.6) * 0.06 + (t.move === 3 ? (i ? -0.12 : 0.12) : 0);
    TK.twin(t.kind, pose, t.x, t.yb - TK.hopY(t.hop, t.h * 0.18) - TK.bob(i * 1.5, t.h * 0.02), t.h, { rot: lean, face: i ? 'left' : 'right', hop: t.hop });
  });
  inst.forEach(drawInst);
  if (phase === 'play' && bars.length) {   // 다음에 칠 바: 빛 + 통통 뛰는 별 + 노래 진행 점
    const b = bars[SONG[songI]], pul = 0.5 + 0.5 * Math.sin(TK.T * 6);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ell(b.x, b.y, b.w * 0.9, b.h * 0.62); ctx.fillStyle = `rgba(255,236,150,${0.18 + pul * 0.2})`; ctx.fill(); ctx.restore();
    TK.star(b.x, b.y - b.h * 0.72 - Math.abs(Math.sin(TK.T * 5)) * b.w * 0.5, b.w * 0.42, '#ffe066', TK.T);
    const n = SONG.length, gw = Math.min(W * 0.6, n * 12 * TK.U), y = Math.min(b.y + inst[1].s * (port ? 0.95 : 0.85), H - 7 * TK.U);
    for (let i = 0; i < n; i++) { ell(W / 2 - gw / 2 + i * gw / (n - 1), y, 3.2 * TK.U, 3.2 * TK.U); ctx.fillStyle = i < songI ? '#ffe066' : 'rgba(255,255,255,.35)'; ctx.fill(); }
  }
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
