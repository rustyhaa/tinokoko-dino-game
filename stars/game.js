// 티노코코 글자 별자리 — 탭 하나로 노는 차분한 밤 놀이 (한글 놀이터)
//  크게 반짝이는 "다음 별"을 탭하면(또는 손가락으로 쓸고 지나가면) 선이 이어지고 음이 하나씩 올라간다.
//  별은 자음을 쓰는 순서(획순) 그대로 놓여 있어서, 다 이으면 ㄱ·ㄴ·ㅇ… 자음이 밤하늘에 빛나고
//  "이응! 오리의 이응" 하고 읽어주며 그 자음으로 시작하는 그림이 함께 나온다. 1단계는 ㄱ·ㄴ·ㅁ·ㅇ만.
//  다른 별을 눌러도 반짝일 뿐. 한참 멈추면 별 시범(frame.js)이 다음 별을 알려준다.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
let phase = 'play', phaseT = 0, rounds = 0, done = 0, lastTap = 0, box = {}, R = 10;
let jamo = 'ㄱ', strokes = [], flat = [], lines = [], queue = [];
let twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }];
const bgStars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.8, s: 0.5 + Math.random() * 1.2, ph: Math.random() * 6 }));
const COL = [255, 236, 150];

function layout() {
  const W = TK.W, H2 = TK.H, port = W < H2;
  const sz = port ? Math.min(W * 0.78, H2 * 0.42) : Math.min(W * 0.46, H2 * 0.6);
  box = { x: W / 2 - sz / 2, y: port ? H2 * 0.14 : H2 * 0.08, w: sz, h: sz };
  R = Math.min(W, H2) * 0.022;
  twins.forEach((t, i) => { t.h = port ? H2 * 0.2 : H2 * 0.3; t.x = i ? W * (port ? 0.78 : 0.86) : W * (port ? 0.22 : 0.14); t.yb = H2 * 0.97; });
}
function newJamo() {
  if (!queue.length) queue = H.pickJamo(H.jamoSet().length);
  jamo = queue.shift();
  strokes = H.starPoints(jamo);
  flat = []; strokes.forEach((s, si) => s.pts.forEach((p, pi) => flat.push({ p, si, first: pi === 0 })));
  done = 0; lines = [];
}
const P = i => { const p = flat[i].p; return { x: box.x + p[0] * box.w, y: box.y + p[1] * box.h }; };
const N = () => flat.length;
const hitR = () => Math.max(34, R * 3.2);

function connect() {
  if (phase !== 'play' || done >= N()) return;
  const i = done, f = TK.PENTA[i % TK.PENTA.length];
  TK.tone(f * 2, 0, 0.6, 'sine', 0.22); TK.tone(f * 4, 0.02, 0.3, 'sine', 0.05);
  const p = P(i); TK.spark(p.x, p.y, [255, 245, 190], 8, 0.7);
  if (i > 0 && !flat[i].first) lines.push({ a: i - 1, b: i, t: 0 });   // 같은 획 안에서만 선으로 잇기
  const s = strokes[flat[i].si], lastOfStroke = i === N() - 1 || flat[i + 1].first;
  if (lastOfStroke && s.closed) { const first = flat.findIndex(q => q.si === flat[i].si); lines.push({ a: i, b: first, t: 0 }); }   // 동그라미 닫기
  done++; lastTap = TK.T;
  if (done % 3 === 0) { const tw = twins[(done / 3) % 2 | 0]; tw.hop = 0; }
  if (done === N()) { phase = 'complete'; phaseT = 0; }
}
function tapAt(x, y, isDown) {
  if (phase !== 'play') return;
  if (done < N()) { const p = P(done); if (TK.dist(x, y, p.x, p.y) < hitR()) { connect(); return; } }
  if (!isDown) return;
  for (let i = 0; i < N(); i++) { const p = P(i); if (TK.dist(x, y, p.x, p.y) < hitR() * 0.8) { TK.spark(p.x, p.y, [200, 220, 255], 5, 0.5); sfx.soft(); return; } }
  const tw = twins.find(t => Math.abs(x - t.x) < t.h * 0.3 && y > t.yb - t.h);
  if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); H.read(tw.kind === 'tino' ? '티노' : '코코'); return; }
  TK.spark(x, y, [255, 255, 255], 4, 0.4); sfx.soft();
}
TK.input({ down(p) { tapAt(p.x, p.y, true); }, move(p) { if (p.down) tapAt(p.x, p.y, false); }, key() { connect(); } });

function update(dt) {
  phaseT += dt;
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  lines.forEach(l => l.t = Math.min(1, l.t + dt / 0.3));
  if (phase === 'complete' && phaseT > 0.5) { phase = 'party'; phaseT = 0; sfx.fanfare(); setTimeout(() => H.readJamo(jamo), 600); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') {
    if (Math.random() < dt * 25) { const p = P((Math.random() * N()) | 0); TK.spark(p.x, p.y, COL, 2, 0.5); }
    if (phaseT > 4.2) { phase = 'fade'; phaseT = 0; }
  }
  if (phase === 'fade' && phaseT > 0.8) { phase = 'play'; phaseT = 0; rounds++; newJamo(); lastTap = TK.T; sfx.sparkle(); }
}

function draw() {
  const W = TK.W, H2 = TK.H;
  ctx.fillStyle = TK.grad(0, H2, '#141c44', '#3b4b8c'); ctx.fillRect(0, 0, W, H2);
  bgStars.forEach(s => { const a = 0.35 + 0.55 * Math.abs(Math.sin(TK.T * 1.3 + s.ph)); ell(s.x * W, s.y * H2, s.s * TK.U * 1.5, s.s * TK.U * 1.5); ctx.fillStyle = `rgba(255,255,230,${a})`; ctx.fill(); });
  const mr = Math.min(W, H2) * 0.05, mx = W * 0.9, my = H2 * 0.1;
  ell(mx, my, mr, mr); ctx.fillStyle = '#fff4c2'; ctx.fill(); ell(mx - mr * 0.45, my - mr * 0.2, mr * 0.88, mr * 0.88); ctx.fillStyle = '#18214f'; ctx.fill();
  ctx.fillStyle = '#2f5d5a'; ctx.beginPath(); ctx.moveTo(0, H2); ctx.lineTo(0, H2 * 0.88); ctx.quadraticCurveTo(W * 0.25, H2 * 0.8, W * 0.5, H2 * 0.87); ctx.quadraticCurveTo(W * 0.75, H2 * 0.93, W, H2 * 0.84); ctx.lineTo(W, H2); ctx.fill();
  const alive = phase === 'party', fade = phase === 'fade' ? 1 - phaseT / 0.8 : 1;
  ctx.save(); ctx.globalAlpha = clamp(fade, 0, 1);
  // 연한 안내선: 처음엔 아주 흐리게 자음 모양이 보임 (따라 긋기 느낌)
  H.drawJamo(ctx, jamo, box.x + box.w / 2, box.y + box.h / 2, box.w, alive ? `rgba(255,236,150,${0.55 + 0.2 * Math.sin(TK.T * 4)})` : 'rgba(200,215,255,.10)', 0.12);
  ctx.lineCap = 'round'; ctx.strokeStyle = TK.rgba(COL, 0.95); ctx.lineWidth = Math.max(4, R * 0.55);
  ctx.shadowColor = TK.rgba(COL, 0.9); ctx.shadowBlur = alive ? 18 : 8;
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
  if (alive || phase === 'fade') {   // 완성: 자음 이름 + 그 자음으로 시작하는 그림
    const ex = H.example(jamo).w, k = clamp(phaseT / 0.5, 0, 1), port = W < H2;
    const ly = box.y + box.h + (port ? H2 * 0.05 : H2 * 0.06);
    H.drawWord(ctx, H.JAMO_NAME[jamo], W / 2, ly, Math.min(W, H2) * 0.06, { color: '#fff6c8', outline: 'rgba(20,28,68,.9)', hi: -1 });
    if (ex) { ctx.save(); ctx.translate(port ? W / 2 : box.x + box.w + W * 0.1, port ? ly + H2 * 0.16 : box.y + box.h * 0.7); ctx.scale(TK.back(k), TK.back(k)); H.drawPic(ctx, ex, Math.min(W, H2) * 0.16); ctx.restore(); }
  }
  ctx.restore();
  twins.forEach((t, i) => TK.twin(t.kind, alive || t.hop >= 0 ? 'happy' : 'idle', t.x, t.yb - TK.hopY(t.hop, t.h * 0.2) - (alive ? TK.bob(i * 1.5, t.h * 0.1, 6) : TK.bob(i * 1.5, t.h * 0.02)), t.h, { face: i ? 'left' : 'right' }));
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get done() { return done; }, get jamo() { return jamo; },
  actions() { if (phase !== 'play' || done >= N()) return []; const p = P(done); return [{ type: 'tap', x: p.x, y: p.y, wait: 120 }]; },
};
// 별 시범: 다음 별을 톡
window.__demo = () => {
  if (phase !== 'play' || done >= N()) return null;
  const p = P(done); return { kind: 'tap', x: p.x, y: p.y, say: '반짝이는 별을 톡!' };
};
TK.start({ resize: layout, init() { layout(); newJamo(); lastTap = TK.T; }, update, draw });
})();
