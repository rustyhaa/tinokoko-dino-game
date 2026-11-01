// 티노코코 글자 별자리 — 탭 하나로 노는 차분한 밤 놀이 (한글 놀이터)
//  크게 반짝이는 "다음 별"을 탭하면(또는 손가락으로 쓸고 지나가면) 선이 이어지고 음이 하나씩 올라간다.
//  별은 자음을 쓰는 순서(획순) 그대로 놓여 있어서, 다 이으면 ㄱ·ㄴ·ㅇ… 자음이 밤하늘에 빛나고
//  "이응! 오리의 이응" 하고 읽어주며 그 자음으로 시작하는 그림이 함께 나온다. 1단계는 ㄱ·ㄴ·ㅁ·ㅇ만.
//  다른 별을 눌러도 반짝일 뿐. 한참 멈추면 별 시범(frame.js)이 다음 별을 알려준다.
//  긋기 판 (자음 판 두 번에 한 번): 별 대신 연한 자음 위를 손가락으로 따라가면 빛 길이 남는다.
//   반짝이 별이 지금 그을 획의 머리에 있고, 손가락이 획 근처(넉넉하게)를 지나가면 그만큼 빛이 차오른다.
//   멀리 그으면 손끝 반짝이만 남을 뿐(틀림 없음). 머리 별을 톡 해도 조금씩 나아간다.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
let phase = 'play', phaseT = 0, rounds = 0, done = 0, lastTap = 0, box = {}, R = 10;
let jamo = 'ㄱ', strokes = [], flat = [], lines = [], queue = [], fig = null, figN = 0;
let trace = false, tr = [], trS = 0, trail = [], jamoN = 0, lastNote = 0;   // 긋기 판: tr[획] = { pts(촘촘한 점), prog(빛난 점 수) }
// 좋아하는 것 별자리 (세 판마다 하나): 고래·공룡 모양 점 — 한 바퀴 이어 닫힘
const FIG = {
  '고래': [[.08, .55], [.22, .34], [.45, .28], [.68, .36], [.82, .5], [.93, .3], [.98, .62], [.84, .6], [.62, .72], [.32, .72]],
  '공룡': [[.08, .78], [.22, .58], [.3, .32], [.45, .18], [.6, .26], [.55, .42], [.72, .5], [.92, .72], [.62, .78], [.36, .82]],
};
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
  const favs = (H.cfg().fav || []).filter(k => FIG[k]);
  if (rounds % 3 === 2 && favs.length) { fig = favs[figN++ % favs.length]; jamo = null; strokes = [{ pts: FIG[fig], closed: true }]; }
  else { fig = null; if (!queue.length) queue = H.pickJamo(H.jamoSet().length); jamo = queue.shift(); strokes = H.starPoints(jamo); }
  trace = !fig && jamoN++ % 2 === 1;
  tr = trace ? H.STROKES[jamo].map(densify) : []; trS = 0; trail = [];
  flat = []; strokes.forEach((s, si) => s.pts.forEach((p, pi) => flat.push({ p, si, first: pi === 0 })));
  done = 0; lines = [];
}
// 획을 0.035 간격 점으로 (동그라미는 처음 점으로 돌아와 닫음)
function densify(s) {
  const src = s.closed ? s.concat([s[0]]) : s, pts = [src[0]];
  for (let i = 1; i < src.length; i++) { const a = src[i - 1], b = src[i], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.035)); for (let q = 1; q <= k; q++) pts.push([a[0] + (b[0] - a[0]) * q / k, a[1] + (b[1] - a[1]) * q / k]); }
  return { pts, prog: 1 };
}
const TP = q => ({ x: box.x + q[0] * box.w, y: box.y + q[1] * box.h });
const traceDone = () => trS >= tr.length;
const head = () => TP(tr[trS].pts[tr[trS].prog - 1]);
// 손가락이 (x,y)에 있을 때 지금 획을 얼마나 채울지: 머리 앞쪽 몇 칸 안에서 가까운 점까지 (멀면 0)
function traceAt(x, y, force = 0) {
  if (phase !== 'play' || traceDone()) return false;
  const s = tr[trS], tol = Math.max(44, box.w * 0.13);
  let best = -1;
  for (let i = s.prog; i < Math.min(s.pts.length, s.prog + 7); i++) { const p = TP(s.pts[i]); if (TK.dist(x, y, p.x, p.y) < tol) best = i; }
  if (force) best = Math.max(best, Math.min(s.pts.length - 1, s.prog - 1 + force));
  if (best < 0) return false;
  const before = s.prog; s.prog = best + 1; lastTap = TK.T;
  for (let i = before; i < s.prog; i++) if (i % 4 === 0) { const p = TP(s.pts[i]); TK.spark(p.x, p.y, [255, 245, 190], 2, 0.4); }
  if (TK.T - lastNote > 0.09) { lastNote = TK.T; const f = TK.PENTA[(trS * 3 + (s.prog / 5 | 0)) % TK.PENTA.length]; TK.tone(f * 2, 0, 0.35, 'sine', 0.12); }
  if (s.prog >= s.pts.length) {   // 획 하나 끝
    const p = head(); TK.spark(p.x, p.y, [255, 245, 190], 10, 0.8); sfx.ting(TK.PENTA[(trS + 5) % TK.PENTA.length] * 2);
    twins[trS % 2].hop = 0; trS++;
    if (traceDone()) { phase = 'complete'; phaseT = 0; }
  }
  return true;
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
  if (trace) {
    trail.push({ x, y, t: TK.T });
    if (traceAt(x, y)) return;
    if (isDown && !traceDone()) { const h = head(); if (TK.dist(x, y, h.x, h.y) < hitR() * 1.3) { traceAt(x, y, 4); return; } }   // 머리 별 톡 = 조금 나아감
    if (!isDown) return;
  }
  if (!trace && done < N()) { const p = P(done); if (TK.dist(x, y, p.x, p.y) < hitR()) { connect(); return; } }
  if (!isDown) return;
  if (!trace) for (let i = 0; i < N(); i++) { const p = P(i); if (TK.dist(x, y, p.x, p.y) < hitR() * 0.8) { TK.spark(p.x, p.y, [200, 220, 255], 5, 0.5); sfx.soft(); return; } }
  const tw = twins.find(t => Math.abs(x - t.x) < t.h * 0.3 && y > t.yb - t.h);
  if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); H.read(tw.kind === 'tino' ? '티노' : '코코'); return; }
  TK.spark(x, y, [255, 255, 255], 4, 0.4); sfx.soft();
}
TK.input({ down(p) { tapAt(p.x, p.y, true); }, move(p) { if (p.down) tapAt(p.x, p.y, false); }, key() { if (trace) { if (!traceDone()) { const h = head(); traceAt(h.x, h.y, 5); } } else connect(); } });

function update(dt) {
  phaseT += dt;
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  lines.forEach(l => l.t = Math.min(1, l.t + dt / 0.3));
  while (trail.length && (TK.T - trail[0].t > 0.6 || trail.length > 80)) trail.shift();
  if (phase === 'complete' && phaseT > 0.5) { phase = 'party'; phaseT = 0; sfx.fanfare(); setTimeout(() => fig ? H.read(fig) : H.readJamo(jamo), 600); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') {
    if (Math.random() < dt * 25) { const p = trace ? TP(TK.pick(TK.pick(tr).pts)) : P((Math.random() * N()) | 0); TK.spark(p.x, p.y, COL, 2, 0.5); }
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
  if (fig) {   // 고래·공룡 별자리: 다 이으면 안쪽이 은은하게 채워짐
    ctx.beginPath(); FIG[fig].forEach((q, i) => { const x = box.x + q[0] * box.w, y = box.y + q[1] * box.h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
    ctx.fillStyle = alive ? `rgba(120,190,255,${0.25 + 0.1 * Math.sin(TK.T * 4)})` : 'rgba(200,215,255,.06)'; ctx.fill();
  } else H.drawJamo(ctx, jamo, box.x + box.w / 2, box.y + box.h / 2, box.w, alive ? `rgba(255,236,150,${0.55 + 0.2 * Math.sin(TK.T * 4)})` : 'rgba(200,215,255,.10)', 0.12);
  if (trace) drawTrace(alive); else {
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
  }
  if (alive || phase === 'fade') {   // 완성: 자음 이름 + 그 자음으로 시작하는 그림
    const ex = fig || H.example(jamo).w, k = clamp(phaseT / 0.5, 0, 1), port = W < H2;
    const ly = box.y + box.h + (port ? H2 * 0.05 : H2 * 0.06);
    H.drawWord(ctx, fig || H.JAMO_NAME[jamo], W / 2, ly, Math.min(W, H2) * 0.06, { color: '#fff6c8', outline: 'rgba(20,28,68,.9)', hi: -1 });
    if (ex) { ctx.save(); ctx.translate(port ? W / 2 : box.x + box.w + W * 0.1, port ? ly + H2 * 0.16 : box.y + box.h * 0.7); ctx.scale(TK.back(k), TK.back(k)); H.drawPic(ctx, ex, Math.min(W, H2) * 0.16); ctx.restore(); }
  }
  ctx.restore();
  twins.forEach((t, i) => TK.twin(t.kind, alive || t.hop >= 0 ? 'happy' : 'idle', t.x, t.yb - TK.hopY(t.hop, t.h * 0.2) - (alive ? TK.bob(i * 1.5, t.h * 0.1, 6) : TK.bob(i * 1.5, t.h * 0.02)), t.h, { face: i ? 'left' : 'right' }));
  TK.drawParts();
}

// 긋기 판 그리기: 연한 길(넓게) → 빛난 부분 → 머리 별 → 손끝 반짝이
function drawTrace(alive) {
  const lw = box.w * 0.12;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!alive) tr.forEach((s, si) => {   // 아직 안 그은 길: 지금 획은 조금 더 밝게
    ctx.beginPath(); s.pts.forEach((q, i) => { const p = TP(q); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.strokeStyle = si === trS ? `rgba(200,215,255,${0.22 + 0.06 * Math.sin(TK.T * 3)})` : 'rgba(200,215,255,.12)'; ctx.lineWidth = lw; ctx.stroke();
  });
  ctx.strokeStyle = TK.rgba(COL, 0.95); ctx.lineWidth = lw * 0.55; ctx.shadowColor = TK.rgba(COL, 0.9); ctx.shadowBlur = alive ? 22 : 12;
  tr.forEach(s => { if (s.prog < 2) return; ctx.beginPath(); s.pts.slice(0, s.prog).forEach((q, i) => { const p = TP(q); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke(); });
  ctx.shadowBlur = 0;
  if (phase === 'play' && !traceDone()) {
    const h = head(), pr = (TK.T * 1.2) % 1;
    ell(h.x, h.y, R * (1.5 + pr * 2.5), R * (1.5 + pr * 2.5)); ctx.strokeStyle = `rgba(255,240,170,${0.8 * (1 - pr)})`; ctx.lineWidth = 3; ctx.stroke();
    ctx.shadowColor = 'rgba(255,245,180,.95)'; ctx.shadowBlur = 16; TK.star(h.x, h.y, R * (1.6 + 0.25 * Math.sin(TK.T * 6)), '#fff6c8', TK.T * 1.5); ctx.shadowBlur = 0;
  }
  trail.forEach(p => { const a = 1 - (TK.T - p.t) / 0.6; if (a > 0) TK.star(p.x, p.y, R * 0.5 * a + 1, `rgba(255,255,230,${0.7 * a})`, p.t * 7); });
}

window.__g = {
  get trace() { return trace; },
  get phase() { return phase; }, get rounds() { return rounds; }, get done() { return done; }, get jamo() { return jamo; },
  actions() {
    if (trace) { if (phase !== 'play' || traceDone()) return []; const s = tr[trS]; return [{ type: 'path', pts: s.pts.slice(s.prog - 1).map((q, i) => { const p = TP(q); return { x: p.x + Math.sin(i) * 8, y: p.y + Math.cos(i) * 8 }; }), wait: 200 }]; }
    if (phase !== 'play' || done >= N()) return []; const p = P(done); return [{ type: 'tap', x: p.x, y: p.y, wait: 120 }]; },
};
// 별 시범: 다음 별을 톡
window.__demo = () => {
  if (trace) { if (phase !== 'play' || traceDone()) return null; const s = tr[trS]; return { kind: 'path', pts: s.pts.slice(s.prog - 1, s.prog + 14).map(TP), say: '반짝이는 별을 따라 쓱!' }; }
  if (phase !== 'play' || done >= N()) return null;
  const p = P(done); return { kind: 'tap', x: p.x, y: p.y, say: '반짝이는 별을 톡!' };
};
TK.start({ resize: layout, init() { layout(); newJamo(); lastTap = TK.T; }, update, draw });
})();
