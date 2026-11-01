// 티노코코 공룡 발자국 길 — 탭 하나로 노는 한글 놀이 (한글 놀이터)
//  모래밭에 커다란 공룡 발자국이 바다까지 이어져 있고, 발자국마다 글자가 하나씩 찍혀 있다.
//  반짝이는 다음 발자국을 톡 하면 티노(또는 코코)가 그 칸으로 쿵! 뛰고 그 글자를 소리 내 읽는다.
//  톡할 때마다 뒤에 있는 친구가 앞 친구를 훌쩍 넘어 다음 칸으로 — 티노 쿵, 코코 쿵 번갈아(둘이 동등, 판마다 먼저 뛰는 친구 바뀜).
//  끝까지 가면 바다에서 고래가 솟아 물을 뿜고 "공, 룡. 공룡!" 하고 단어를 완성해 읽는다.
//  다른 발자국을 눌러도 살짝 흔들릴 뿐(실패 없음). 한참 멈추면 별 시범(frame.js)이 다음 발자국을 알려준다.
(() => {
const { ctx, ell, clamp, sfx } = TK;
let phase = 'play', phaseT = 0, rounds = 0, lastWord = '', word = null, prints = [], next = 0;
let start = { x: 0, y: 0 }, whale = { x: 0, y: 0, up: 0, kind: '고래' }, sea = {}, ps = 60, ps0 = 60, port = false, hz = 0.42;
const twins = [{ kind: 'tino' }, { kind: 'coco' }];
const clouds = Array.from({ length: 4 }, (_, i) => ({ x: Math.random(), y: 0.06 + Math.random() * 0.14, s: 0.7 + Math.random() * 0.6, v: 0.004 + i * 0.002 }));

function pickWord() {
  const fav = H.favWords().filter(w => w !== lastWord && [...w].length <= 8);
  // 좋아하는 것(공룡 7종·고래 7종)은 두 판에 한 번은 꼭 — 긴 이름이면 발자국도 길어짐
  if (fav.length && rounds % 2 === 0) return H.word(TK.pick(fav));
  const c = H.pick(10, { pic: true, exclude: [lastWord] }).filter(o => o.syl.length >= 2 && o.syl.length <= 3);
  return c[0] || H.word('공룡');
}
// 발자국 자리: 출발 바위 → 바닷가까지 살짝 굽은 길
function place() {
  const W = TK.W, H2 = TK.H, n = word.syl.length;
  port = W < H2;
  hz = port ? 0.3 : 0.42;
  ps0 = port ? Math.min(W * 0.16, H2 * 0.075) : Math.min(W * 0.085, H2 * 0.15);
  ps = ps0 * Math.min(1, (port ? 4.5 : 3.6) / n);   // 발자국이 많으면(긴 이름) 작게 — 친구·고래 크기는 ps0 기준
  if (port) {   // 세로: 위에서 아래로 지그재그 내려가 아래쪽 바다로
    start = { x: W * 0.2, y: H2 * 0.4 }; sea = { x: 0, y: H2 * 0.82, w: W, h: H2 * 0.18 }; whale.x = W * 0.5; whale.y = H2 * 0.97;
    prints.forEach((p, i) => { const t = (i + 1) / n; p.y = TK.lerp(start.y, H2 * 0.74, t); p.x = W * ((i + rounds) % 2 ? 0.3 : 0.7); });
    return;
  }
  start = { x: W * 0.14, y: H2 * 0.76 }; sea = { x: W * 0.78, y: H2 * 0.5, w: W * 0.22, h: H2 * 0.5 }; whale.x = W * 0.89; whale.y = H2 * 0.9;
  const end = { x: W * 0.7, y: H2 * 0.66 };
  prints.forEach((p, i) => {
    const t = (i + 1) / n;
    p.x = TK.lerp(start.x, end.x, t);
    p.y = TK.lerp(start.y, end.y, t) + Math.sin(t * Math.PI * 1.5 + (rounds % 2) * Math.PI) * H2 * 0.07;
  });
}
function newRound() {
  word = pickWord(); lastWord = word.w;
  prints = word.syl.map(s => ({ s, lit: false, wig: -1, glow: 0 }));
  next = 0; whale.up = 0; whale.kind = H.WHALES.includes(word.w) ? word.w : '고래';   // 고래 이름이면 바다에서 그 고래가 솟음
  place();
  const lead = twins[rounds % 2], follow = twins[(rounds + 1) % 2];
  lead.at = -1; follow.at = -2;
  twins.forEach(t => { const p = pos(t.at); t.x = p.x; t.y = p.y; t.jump = -1; t.happy = 0; });
}
// 자리 번호 → 좌표 (-1: 출발 바위, -2: 바위 뒤)
function pos(i) {
  if (i >= 0) return prints[i];
  if (i === -1) return start;
  return port ? { x: start.x + ps0 * 0.4, y: start.y - ps0 * 1.1 } : { x: start.x - ps0 * 0.85, y: start.y - ps0 * 0.55 };
}
const busy = () => twins.some(t => t.jump >= 0);
const mover = () => twins[0].at < twins[1].at ? twins[0] : twins[1];   // 뒤에 있는 친구가 다음에 뜀
const th = () => ps0 * (port ? 1.6 : 1.9);
function hop(t, to) { const a = pos(t.at), b = pos(to); t.fx = a.x; t.fy = a.y; t.tx = b.x; t.ty = b.y; t.at = to; t.jump = 0; }

function step() {
  if (phase !== 'play' || next >= prints.length || busy()) return;
  hop(mover(), next++);
  sfx.boing();
}
function land(t) {   // 뛴 친구가 발자국에 닿음: 쿵 + 글자 소리
  const p = prints[t.at]; if (!p || p.lit) return;
  p.lit = true; p.glow = 1;
  TK.tone(110, 0, 0.25, 'sine', 0.3, 60); TK.noise(0.18, 300, 0.25);
  TK.drops(p.x, p.y, [200, 170, 120], 8, 0.6); TK.spark(p.x, p.y - ps * 0.3, [255, 240, 170], 6, 0.6);
  H.saySyl(p.s);
  if (t.at === prints.length - 1) { phase = 'shore'; phaseT = 0; }
}
function tapAt(x, y) {
  if (phase === 'play') {
    if (next < prints.length) { const p = prints[next]; if (TK.dist(x, y, p.x, p.y) < Math.max(ps * 1.1, 40)) { step(); return; } }
    for (const p of prints) if (TK.dist(x, y, p.x, p.y) < ps * 0.9) { if (p.lit) H.saySyl(p.s); else { p.wig = 0; sfx.soft(); } return; }
  }
  if ((phase === 'party' || phase === 'shore') && TK.dist(x, y, whale.x, whale.y - ps * 1.2) < ps * 2) { H.read(word.w); spout(); return; }
  const t = twins.find(t => Math.abs(x - t.x) < th() * 0.35 && y < t.y + ps * 0.3 && y > t.y - th());
  if (t) { t.happy = 0.6; sfx.giggle(t.kind); TK.hearts(t.x, t.y - th()); H.read(t.kind === 'tino' ? '티노' : '코코'); return; }
  TK.spark(x, y, [255, 255, 255], 4, 0.4); sfx.soft();
}
function spout() { const top = whaleTop(); for (let k = 0; k < 3; k++) TK.drops(top.x, top.y, [150, 210, 255], 10, 1.4); sfx.splash(); }
const whaleSize = () => ps0 * (port ? 2.0 : 2.2);
const whaleTop = () => ({ x: whale.x - whaleSize() * 0.05, y: whale.y - whaleSize() * 0.75 * TK.ease(whale.up) - ps * 0.1 });
TK.input({ down(p) { tapAt(p.x, p.y); }, key() { step(); } });

function update(dt) {
  phaseT += dt;
  clouds.forEach(c => { c.x += c.v * dt; if (c.x > 1.15) c.x = -0.15; });
  twins.forEach(t => {
    if (t.happy > 0) t.happy -= dt;
    if (t.jump >= 0) { t.jump += dt / 0.45; if (t.jump >= 1) { t.jump = -1; t.x = t.tx; t.y = t.ty; if (t.at >= 0) land(t); } else { t.x = TK.lerp(t.fx, t.tx, t.jump); t.y = TK.lerp(t.fy, t.ty, t.jump); } }
  });
  prints.forEach(p => { if (p.wig >= 0) { p.wig += dt / 0.4; if (p.wig > 1) p.wig = -1; } p.glow = Math.max(0, p.glow - dt * 1.5); });
  if (phase === 'shore') {
    whale.up = Math.min(1, whale.up + dt / 0.8);
    if (phaseT > 0.9) { phase = 'party'; phaseT = 0; spout(); sfx.fanfare(); setTimeout(() => H.read(word.w), 500); twins.forEach(t => t.happy = 1.2); }
  }
  if (phase === 'party') {
    TK.confetti(dt * 0.6);
    if (Math.random() < dt * 3) { const top = whaleTop(); TK.drops(top.x, top.y, [150, 210, 255], 4, 1.2); }
    if (phaseT > 5) { phase = 'fade'; phaseT = 0; }
  }
  if (phase === 'fade') { whale.up = Math.max(0, 1 - phaseT / 0.8); if (phaseT > 0.9) { rounds++; phase = 'play'; phaseT = 0; newRound(); sfx.sparkle(); } }
}

function footprint(x, y, s, col, rot) {   // 세 발가락 공룡 발자국 (오른쪽을 향함)
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = col;
  ell(-s * 0.12, 0, s * 0.62, s * 0.5); ctx.fill();
  [-0.55, 0, 0.55].forEach(a => { ell(Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.62, s * 0.3, s * 0.17, a); ctx.fill(); });
  ctx.restore();
}
function draw() {
  const W = TK.W, H2 = TK.H, alive = phase === 'party' || phase === 'shore';
  ctx.fillStyle = TK.grad(0, H2 * hz, '#8fd4ff', '#d8f1ff'); ctx.fillRect(0, 0, W, H2);
  ell(W * 0.12, H2 * 0.12, Math.min(W, H2) * 0.06, Math.min(W, H2) * 0.06); ctx.fillStyle = '#ffe27a'; ctx.fill();
  clouds.forEach(c => { const x = c.x * W, y = c.y * H2, r = Math.min(W, H2) * 0.04 * c.s; ctx.fillStyle = 'rgba(255,255,255,.9)'; [[-1.2, 0.2, 0.8], [0, 0, 1.1], [1.2, 0.25, 0.75]].forEach(([dx, dy, k]) => { ell(x + dx * r, y + dy * r, r * k, r * k * 0.8); ctx.fill(); }); });
  // 먼 산과 야자수
  ctx.fillStyle = '#9cc98a'; ctx.beginPath(); const hy = H2 * hz, mh = H2 * (port ? 0.08 : 0.14); ctx.moveTo(0, hy); ctx.quadraticCurveTo(W * 0.2, hy - mh, W * 0.42, hy - mh * 0.15); ctx.quadraticCurveTo(W * 0.62, hy - mh * 0.8, W * 0.85, hy); ctx.lineTo(W, hy - mh * 0.1); ctx.lineTo(W, hy + 10); ctx.lineTo(0, hy + 10); ctx.fill();
  // 모래밭
  ctx.fillStyle = TK.grad(H2 * hz, H2, '#f6dfa4', '#eac983'); ctx.fillRect(0, H2 * hz, W, H2);
  // 바다
  ctx.fillStyle = TK.grad(sea.y, sea.y + sea.h, '#5cc4f0', '#2f8fd0');
  ctx.beginPath();
  if (port) { ctx.moveTo(0, sea.y); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, sea.y + Math.sin(x * 0.03 + TK.T * 2) * 5); ctx.lineTo(W, H2); ctx.lineTo(0, H2); }
  else { ctx.moveTo(sea.x, H2); for (let y = H2; y >= sea.y; y -= 20) ctx.lineTo(sea.x + Math.sin(y * 0.03 + TK.T * 2) * 6 + (H2 - y) * 0.15, y); ctx.lineTo(W, sea.y); ctx.lineTo(W, H2); }
  ctx.fill();
  // 출발 바위
  ell(start.x - ps * 0.1, start.y - ps * 0.2, ps * 0.85, ps * 0.32); ctx.fillStyle = '#b9a58a'; ctx.fill();
  ell(start.x - ps * 0.2, start.y - ps * 0.3, ps * 0.6, ps * 0.22); ctx.fillStyle = '#cdbb9f'; ctx.fill();
  // 고래 (바다에서 솟음)
  if (whale.up > 0) {
    const ws = whaleSize(), k = TK.ease(whale.up);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, whale.y); ctx.clip();
    ctx.translate(whale.x, whale.y + ws * (1 - k) * 0.9); H.drawPic(ctx, whale.kind, ws); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ell(whale.x, whale.y, ws * 0.6, ws * 0.08); ctx.fill();
  }
  // 발자국
  prints.forEach((p, i) => {
    const isNext = i === next && phase === 'play', wig = p.wig >= 0 ? Math.sin(p.wig * Math.PI * 4) * 0.15 * (1 - p.wig) : 0;
    const a = i > 0 ? Math.atan2(p.y - prints[i - 1].y, p.x - prints[i - 1].x) : Math.atan2(p.y - start.y, p.x - start.x);
    if (isNext) { const pr = (TK.T * 1.2) % 1; ell(p.x, p.y, ps * (0.9 + pr * 0.6), ps * (0.6 + pr * 0.4)); ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - pr)})`; ctx.lineWidth = 4; ctx.stroke(); }
    const sc = (isNext ? 1.08 + 0.05 * Math.sin(TK.T * 6) : 1) + p.glow * 0.15;
    footprint(p.x + 2, p.y + 3, ps * sc, 'rgba(150,110,60,.35)', a + wig);
    footprint(p.x, p.y, ps * sc, p.lit ? '#ffe9a8' : '#d9b574', a + wig);
  });
  // 친구들
  twins.forEach((t, i) => {
    const jumping = t.jump >= 0, y = t.y - (jumping ? Math.sin(Math.PI * t.jump) * ps * 1.4 : TK.bob(i * 1.5, ps * (alive ? 0.25 : 0.04), alive ? 6 : 3.2));
    TK.twin(t.kind, jumping ? 'jump' : alive || t.happy > 0 ? 'happy' : 'idle', t.x - ps * 0.15, y - ps * 0.3, th(), { face: 'right' });   // 발자국 뒤쪽에 서서 글자를 가리지 않음
  });
  const hiP = H.hi(word.w);   // 발자국 글자는 친구들 위에
  prints.forEach((p, i) => {
    if (p.lit) { ctx.shadowColor = 'rgba(255,230,120,.9)'; ctx.shadowBlur = 10 + p.glow * 20; }
    H.drawWord(ctx, p.s, p.x - ps * 0.08, p.y + ps * 0.05, ps * 0.62, { color: p.lit ? '#ff6b3d' : '#6b4a22', outline: 'rgba(255,248,225,.95)', hi: hiP === 'all' || hiP === i ? 'all' : -1 });
    ctx.shadowBlur = 0;
  });
  // 위쪽: 지금 만드는 단어 (찍은 글자만 진하게)
  const ty = H2 * (port ? 0.15 : 0.17), fs = Math.min(W, H2) * (alive ? 0.12 : 0.09) * Math.min(1, 4 / word.syl.length), hi = H.hi(word.w);
  const lit = prints.filter(p => p.lit).length;
  [...word.w].forEach((ch, i) => {
    const gap = fs * 1.02, x = W / 2 - (word.syl.length - 1) * gap / 2 + i * gap;
    if (i < lit) H.drawWord(ctx, ch, x, ty, fs, { color: '#2b3550', hi: hi === 'all' || hi === i ? 'all' : -1 });
    else H.drawWord(ctx, ch, x, ty, fs, { color: 'rgba(43,53,80,.13)', outline: 'rgba(255,255,255,.35)' });
  });
  if (alive || phase === 'fade') {   // 완성: 단어 그림
    const k = clamp(phaseT / 0.5, 0, 1) * (phase === 'fade' ? 1 - phaseT / 0.9 : 1), x = W / 2 + (word.syl.length / 2 + 0.6) * fs * 1.02 + fs * 0.6;
    if (phase !== 'shore' && word.w !== whale.kind) {   /* 고래는 바다에 이미 있으니 한 번만 */ ctx.save(); ctx.translate(Math.min(x, W - fs), ty + fs * 0.75); ctx.scale(TK.back(k), TK.back(k)); H.drawPic(ctx, word.w, fs * 1.5); ctx.restore(); }
  }
  TK.drawParts();
}

window.__g = {
  force(w) { word = H.word(w); lastWord = w; prints = word.syl.map(s => ({ s, lit: false, wig: -1, glow: 0 })); next = 0; whale.up = 0; whale.kind = H.WHALES.includes(w) ? w : '고래'; place(); const a = twins[rounds % 2], b = twins[(rounds + 1) % 2]; a.at = -1; b.at = -2; twins.forEach(t => { const p = pos(t.at); t.x = p.x; t.y = p.y; t.jump = -1; }); },   // 자동 확인용
  get phase() { return phase; }, get rounds() { return rounds; }, get word() { return word && word.w; }, get next() { return next; },
  actions() { if (phase !== 'play' || next >= prints.length || busy()) return []; const p = prints[next]; return [{ type: 'tap', x: p.x, y: p.y, wait: 650 }]; },
};
// 별 시범: 다음 발자국을 톡
window.__demo = () => {
  if (phase !== 'play' || next >= prints.length) return null;
  const p = prints[next]; return { kind: 'tap', x: p.x, y: p.y, say: '반짝이는 발자국을 톡!' };
};
TK.start({ resize() { if (word) { place(); twins.forEach(t => { if (t.jump < 0) { const p = pos(t.at); t.x = p.x; t.y = p.y; } }); } }, init() { newRound(); }, update, draw });
})();
