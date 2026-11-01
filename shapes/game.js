// 티노코코 자음 짝꿍 — 끌어다 놓기 하나로 노는 모양 맞추기 (한글 놀이터)
//  2단계 이상: 아래 쟁반의 자음 블록(ㄱ·ㄴ·ㅁ·ㅇ…)을 위쪽 같은 모양 그림자에 끌어 놓으면 딱 붙고
//              "기역! 고래의 기역" 하고 읽어주며 그 자음으로 시작하는 그림이 옆에 나온다.
//  1단계(듣고 보기): 그림을 같은 그림자에 맞추면 단어를 "나, 비. 나비!" 하고 읽어준다.
//  엉뚱한 그림자에 놓으면 쟁반으로 스르륵 돌아갈 뿐. 넷 다 채우면 그림들이 살아 움직이고 다음 묶음으로.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
let mode = 'jamo', phase = 'play', phaseT = 0, rounds = 0, S = 50;
let slots = [], pieces = [], twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }];
const JCOL = ['#ff5a5f', '#ff9f43', '#3aa7ff', '#4cd264', '#b06cf0', '#ff7aa8'];

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  S = port ? Math.min(W * 0.14, H * 0.08) : Math.min(W * 0.06, H * 0.12);
  const sp = port ? [[0.3, 0.18], [0.7, 0.18], [0.3, 0.4], [0.7, 0.4]] : [[0.24, 0.3], [0.42, 0.3], [0.6, 0.3], [0.78, 0.3]];
  const pp = port ? [[0.3, 0.7], [0.7, 0.7], [0.3, 0.87], [0.7, 0.87]] : [[0.26, 0.76], [0.42, 0.76], [0.58, 0.76], [0.74, 0.76]];
  slots.forEach((s, i) => { s.x = sp[i][0] * W; s.y = sp[i][1] * H; });
  pieces.forEach(p => { p.hx = pp[p.home][0] * W; p.hy = pp[p.home][1] * H; if (p.st === 'home') { p.x = p.hx; p.y = p.hy; } if (p.st === 'placed') { p.x = slots[p.slot].x; p.y = slots[p.slot].y; } });
  twins[0].x = port ? W * 0.13 : W * 0.08; twins[1].x = port ? W * 0.87 : W * 0.92;
  twins.forEach(t => { t.h = port ? H * 0.15 : H * 0.42; t.yb = port ? H * 0.6 : H * 0.98; });
}
function newSet() {
  mode = H.cfg().stage >= 2 ? 'jamo' : 'word';
  const keys = mode === 'jamo' ? H.pickJamo(4) : H.pick(4, { pic: true }).map(o => o.w);
  slots = TK.shuffle(keys).map(key => ({ key, x: 0, y: 0 }));
  const homes = TK.shuffle([0, 1, 2, 3]);
  pieces = keys.map((key, i) => ({ key, home: homes[i], slot: slots.findIndex(s => s.key === key), st: 'appear', t: 0, x: 0, y: 0, ptr: null, wig: 0, pulse: 0, col: JCOL[i % JCOL.length], ex: mode === 'jamo' ? H.example(key).w : key }));
  layout();
  pieces.forEach(p => { p.x = p.hx; p.y = p.hy; });
}
function readPiece(p) { if (mode === 'jamo') H.readJamo(p.key); else H.read(p.key); }
function snap(p) {
  p.st = 'fly'; p.t = 0; p.fx = p.x; p.fy = p.y; p.ptr = null;
  sfx.ting(TK.pick([1046.5, 1174.7, 1318.5, 1568])); readPiece(p);
  const tw = slots[p.slot].x < TK.W / 2 ? twins[0] : twins[1]; tw.hop = 0;
}
const pieceAt = (x, y) => pieces.filter(p => p.st === 'home' && TK.dist(x, y, p.x, p.y) < S * 1.25).sort((a, b) => TK.dist(x, y, a.x, a.y) - TK.dist(x, y, b.x, b.y))[0];
const nearOwn = (p, k) => TK.dist(p.x, p.y, slots[p.slot].x, slots[p.slot].y) < S * k;

TK.input({
  down(p) {
    if (phase !== 'play') return;
    const q = pieceAt(p.x, p.y);
    if (q) { q.st = 'drag'; q.ptr = p.id; q.ox = q.x - p.x; q.oy = q.y - p.y; sfx.rustle(); return; }
    const placed = pieces.find(q => q.st === 'placed' && TK.dist(p.x, p.y, q.x, q.y) < S * 1.3);
    if (placed) { placed.pulse = 1; readPiece(placed); return; }
    const tw = twins.find(t => Math.abs(p.x - t.x) < t.h * 0.3 && p.y > t.yb - t.h && p.y < t.yb);
    if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); H.read(tw.kind === 'tino' ? '티노' : '코코'); return; }
    TK.ring(p.x, p.y, 14 * TK.U, [255, 200, 120]); sfx.soft();
  },
  move(p) {
    const q = pieces.find(q => q.st === 'drag' && q.ptr === p.id); if (!q) return;
    q.x = p.x + q.ox; q.y = p.y + q.oy;
    if (nearOwn(q, 1.0)) snap(q);   // 제 그림자 가까이 오면 자석처럼 딱
  },
  up(p) {
    const q = pieces.find(q => q.st === 'drag' && q.ptr === p.id); if (!q) return;
    if (nearOwn(q, 1.7)) snap(q); else { q.st = 'back'; q.t = 0; q.fx = q.x; q.fy = q.y; q.ptr = null; sfx.down(); }
  },
  key() { const q = pieces.find(q => q.st === 'home'); if (q && phase === 'play') snap(q); },
});

function update(dt) {
  phaseT += dt;
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  pieces.forEach(p => {
    p.wig = Math.max(0, p.wig - dt); p.pulse = Math.max(0, p.pulse - dt * 2);
    if (p.st === 'appear') { p.t += dt / 0.4; if (p.t >= 1) p.st = 'home'; }
    if (p.st === 'fly' || p.st === 'back') {
      p.t += dt / (p.st === 'fly' ? 0.25 : 0.4);
      const to = p.st === 'fly' ? slots[p.slot] : { x: p.hx, y: p.hy }, e = TK.ease(p.t);
      p.x = TK.lerp(p.fx, to.x, e); p.y = TK.lerp(p.fy, to.y, e);
      if (p.t >= 1) { if (p.st === 'fly') { p.st = 'placed'; p.pulse = 1; p.shown = TK.T; TK.spark(p.x, p.y, TK.pick(TK.COLS), 10, 0.8); } else p.st = 'home'; }
    }
  });
  if (phase === 'play' && pieces.length && pieces.every(p => p.st === 'placed')) { phase = 'party'; phaseT = 0; sfx.fanfare(); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') { TK.confetti(dt); if (phaseT > 3.6) { phase = 'play'; phaseT = 0; rounds++; newSet(); sfx.sparkle(); } }
}

// 조각 하나 그리기 (가운데 x,y). sil: 그림자
function piece(p, x, y, sc, sil, alive) {
  ctx.save(); ctx.translate(x, y);
  if (alive) { ctx.rotate(Math.sin(TK.T * 6 + x) * 0.1); const b = 1 + 0.08 * Math.sin(TK.T * 8 + y); ctx.scale(b, b); }
  ctx.scale(sc, sc);
  if (mode === 'jamo') {
    if (!sil) { TK.rr(-S, -S, S * 2, S * 2, S * 0.35); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = p.col; ctx.stroke(); }
    H.drawJamo(ctx, p.key, 0, 0, S * 1.6, sil ? '#c9c1cf' : p.col, sil ? 0.2 : 0.17);   // 그림자는 불투명 연한 색 (획 겹침이 진해지지 않게)
  } else {
    if (sil) H.drawSil(ctx, p.key, 0, S * 0.95, S * 1.9, 'rgba(70,55,85,.4)');
    else { ctx.translate(0, S * 0.95); H.drawPic(ctx, p.key, S * 1.9); }
  }
  ctx.restore();
}
function drawBg() {
  const W = TK.W, H2 = TK.H, port = W < H2;
  ctx.fillStyle = '#fff3d6'; ctx.fillRect(0, 0, W, H2);
  ctx.strokeStyle = 'rgba(214,170,110,.18)'; ctx.lineWidth = 3;
  for (let y = 20; y < H2; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + 8, W * 0.6, y - 8, W, y + 4); ctx.stroke(); }
  const b = port ? { x: W * 0.06, y: H2 * 0.09, w: W * 0.88, h: H2 * 0.42 } : { x: W * 0.15, y: H2 * 0.08, w: W * 0.7, h: H2 * 0.46 };
  TK.rr(b.x, b.y, b.w, b.h, 22 * TK.U); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#f0c879'; ctx.lineWidth = 8 * TK.U; ctx.stroke();
  const t = port ? { x: W * 0.08, y: H2 * 0.61, w: W * 0.84, h: H2 * 0.35 } : { x: W * 0.18, y: H2 * 0.6, w: W * 0.64, h: H2 * 0.32 };
  TK.rr(t.x, t.y, t.w, t.h, 26 * TK.U); ctx.fillStyle = '#c99060'; ctx.fill();
  TK.rr(t.x + 10 * TK.U, t.y + 10 * TK.U, t.w - 20 * TK.U, t.h - 20 * TK.U, 20 * TK.U); ctx.fillStyle = '#e2b07c'; ctx.fill();
}
function draw() {
  drawBg();
  const alive = phase === 'party';
  slots.forEach((s, i) => {
    const p = pieces.find(p => p.slot === i);
    if (!p || p.st !== 'placed') piece(p || { key: s.key }, s.x, s.y, 1, true);
    // 이름표: 자음은 이름(기역), 그림은 단어 — 맞추면 진하게, 그전엔 흐리게
    const label = mode === 'jamo' ? H.JAMO_NAME[s.key] : s.key, done = p && p.st === 'placed';
    if (mode === 'word' || done) H.drawWord(ctx, label, s.x, s.y + S * 1.15, S * 0.36, { hi: done ? H.hi(label === s.key ? s.key : label) : -1, color: done ? '#2b3550' : 'rgba(43,53,80,.35)' });
  });
  pieces.filter(p => p.st === 'placed').forEach(p => {
    piece(p, p.x, p.y, 1 + p.pulse * 0.2, false, alive);
    if (mode === 'jamo' && p.ex) {   // 이 자음으로 시작하는 그림이 옆에 톡
      const k = clamp((TK.T - p.shown) / 0.4, 0, 1);   // 블록 오른쪽 아래 모서리에 작게 (옆 칸과 안 겹치게)
      ctx.save(); ctx.translate(p.x + S * 0.62, p.y + S * 0.98); ctx.scale(TK.back(k), TK.back(k)); H.drawPic(ctx, p.ex, S * 0.8); ctx.restore();
    }
  });
  twins.forEach((t, i) => TK.twin(t.kind, phase === 'party' || t.hop >= 0 ? 'happy' : 'idle', t.x, t.yb - TK.hopY(t.hop, t.h * 0.2) - (phase === 'party' ? TK.bob(i * 1.5, t.h * 0.1, 7) : TK.bob(i * 1.5, t.h * 0.02)), t.h, { face: i ? 'left' : 'right' }));
  pieces.filter(p => p.st !== 'placed').forEach(p => {
    const sc = p.st === 'appear' ? TK.back(p.t) : p.st === 'drag' ? 1.15 : 1, wg = p.wig > 0 ? Math.sin(p.wig * 40) * 0.15 : 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wg);
    if (p.st === 'drag') { ell(S * 0.1, S * 1.1, S * 0.8, S * 0.2); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); }
    piece(p, 0, 0, sc, false); ctx.restore();
  });
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get mode() { return mode; },
  actions() {
    if (phase !== 'play') return [];
    const p = pieces.find(p => p.st === 'home'); if (!p) return [];
    const s = slots[p.slot], pts = [];
    for (let k = 0; k <= 14; k++) pts.push({ x: TK.lerp(p.x, s.x, k / 14), y: TK.lerp(p.y, s.y, k / 14) });
    return [{ type: 'path', pts, wait: 350 }];
  },
};
// 별 시범: 조각 하나를 제 그림자까지 끌고 가기
window.__demo = () => {
  if (phase !== 'play') return null;
  const p = pieces.find(p => p.st === 'home'); if (!p) return null;
  const s = slots[p.slot];
  return { kind: 'path', pts: [{ x: p.x, y: p.y }, { x: s.x, y: s.y }], say: '같은 모양에 쏙!' };
};
TK.start({ resize: layout, init() { newSet(); }, update, draw });
})();
