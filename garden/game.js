// 티노코코 꼬마 정원 — 탭(또는 문지르기) 하나로 키우는 정원
//  흙더미를 누르면 위의 작은 구름에서 비가 톡톡 → 새싹 → 잎 → 꽃봉오리 → 꽃·열매가 퐁!("당근!")
//  흙 위를 문질러도 쑥쑥 자란다. 넷 다 자라면 바구니로 쏙쏙 수확 → 축하 → 다음엔 다른 씨앗.
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;
const HG = window.H;   // 한글 모듈 (이 파일 안의 H 는 화면 높이)
const SETS = [['tulip', 'carrot', 'sunflower', 'strawberry'], ['tomato', 'pumpkin', 'tulip2', 'carrot'], ['sunflower', 'strawberry', 'tomato', 'tulip']];
const NAME = { tulip: '튤립', tulip2: '튤립', carrot: '당근', sunflower: '해바라기', strawberry: '딸기', tomato: '토마토', pumpkin: '호박' };
let setIdx = 0, phase = 'play', phaseT = 0, rounds = 0, lastGrow = 0, S = 50;
let plots = [], basket = { x: 0, y: 0, w: 0, items: [] }, flying = [], twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }];

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  S = port ? Math.min(W * 0.13, H * 0.075) : Math.min(W * 0.075, H * 0.13);
  const pos = port ? [[0.3, 0.42], [0.7, 0.42], [0.3, 0.64], [0.7, 0.64]] : [[0.25, 0.66], [0.42, 0.66], [0.58, 0.66], [0.75, 0.66]];
  plots.forEach((p, i) => { p.x = pos[i][0] * W; p.y = pos[i][1] * H; });
  basket.x = W / 2; basket.y = H * 0.94; basket.w = port ? W * 0.38 : W * 0.2;
  twins.forEach((t, i) => { t.h = port ? H * 0.19 : H * 0.36; t.x = i ? W * (port ? 0.85 : 0.92) : W * (port ? 0.15 : 0.08); t.yb = H * 0.98; });
}
function newSet() {
  plots = SETS[setIdx].map(kind => ({ kind, g: 0, stage: 0, wig: 0, rain: 0, pop: 0 }));
  layout();
}
function grow(p, amt) {
  if (phase !== 'play' || p.g >= 4) return;
  p.g = Math.min(4, p.g + amt); p.rain = Math.max(p.rain, 0.6); lastGrow = TK.T;
  const st = Math.floor(p.g + 1e-6);
  if (st > p.stage) {
    p.stage = st; p.pop = 1;
    TK.tone([523.25, 659.25, 783.99, 1046.5][st - 1], 0, 0.4, 'sine', 0.22); TK.tone([523.25, 659.25, 783.99, 1046.5][st - 1] * 2, 0.03, 0.2, 'sine', 0.05);
    if (st === 4) { sfx.sparkle(); HG.read(NAME[p.kind]); TK.spark(p.x, p.y - S * 1.6, TK.pick(TK.COLS), 12, 0.9); const tw = p.x < TK.W / 2 ? twins[0] : twins[1]; tw.hop = 0; sfx.giggle(tw.kind, 0.2); }
  }
}
const plotAt = (x, y) => plots.find(p => Math.abs(x - p.x) < S * 1.1 && y > p.y - S * 3.2 && y < p.y + S * 0.6);

TK.input({
  down(p) {
    const q = plotAt(p.x, p.y);
    if (q && phase === 'play') { if (q.g >= 4) { q.wig = 0.5; HG.read(NAME[q.kind]); } else { grow(q, 1); sfx.splash(); } p.lx = p.x; return; }
    const tw = twins.find(t => Math.abs(p.x - t.x) < t.h * 0.3 && p.y > t.yb - t.h);
    if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); return; }
    TK.ring(p.x, p.y, 14 * TK.U, [255, 255, 255]); sfx.soft();
  },
  move(p) {   // 흙 위를 문지르면 쑥쑥
    if (!p.down) return;
    const q = plotAt(p.x, p.y);
    if (q && phase === 'play' && q.g < 4) { grow(q, Math.min(0.25, Math.abs(p.x - (p.lx || p.x)) / (S * 6) + 0.03)); if (Math.random() < 0.15) sfx.rustle(); }
    p.lx = p.x;
  },
  key() { const q = plots.filter(p => p.g < 4).sort((a, b) => a.g - b.g)[0]; if (q) { grow(q, 1); sfx.splash(); } },
});

function update(dt) {
  phaseT += dt;
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  plots.forEach(p => {
    p.wig = Math.max(0, p.wig - dt); p.pop = Math.max(0, p.pop - dt * 2.5);
    if (p.rain > 0) { p.rain -= dt; if (Math.random() < dt * 30) TK.parts.push({ t: 'drop', x: p.x + rand(-S * 0.6, S * 0.6), y: p.y - S * 3.0, vx: 0, vy: rand(150, 220) * TK.U, r: rand(2.5, 4.5) * TK.U, life: 0.5, max: 0.5, c: [120, 190, 255], g: 300 }); }
  });
  if (phase === 'play' && plots.length && plots.every(p => p.g >= 4)) { phase = 'harvest'; phaseT = 0; }
  if (phase === 'harvest') {
    const k = Math.floor(phaseT / 0.35);
    plots.forEach((p, i) => { if (i <= k && !p.picked) { p.picked = true; flying.push({ kind: p.kind, x0: p.x, y0: p.y - S * 1.6, t: 0 }); sfx.pop(); } });
    if (phaseT > 0.35 * plots.length + 0.6) { phase = 'party'; phaseT = 0; sfx.fanfare(); twins.forEach(t => t.hop = 0); }
  }
  flying.forEach(f => { f.t += dt / 0.6; if (f.t >= 1 && !f.done) { f.done = true; basket.items.push(f.kind); TK.spark(basket.x, basket.y - S, [255, 220, 120], 5, 0.5); } });
  flying = flying.filter(f => !f.done);
  if (phase === 'party') { TK.confetti(dt); if (phaseT > 3.2) { phase = 'play'; phaseT = 0; rounds++; setIdx = (setIdx + 1) % SETS.length; basket.items = []; newSet(); lastGrow = TK.T; sfx.sparkle(); } }
}

// 식물 그리기: 흙 위 (x,y), 단계 st(0~4), 크기 s
function plant(kind, x, y, st, s, sway) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
  const leaf = (lx, ly, r, rot, c = '#5fbf5a') => { ell(lx, ly, r, r * 0.45, rot); ctx.fillStyle = c; ctx.fill(); };
  const stem = (h, c = '#4fa84a') => { ctx.strokeStyle = c; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.1, -h * 0.5, 0, -h); ctx.stroke(); };
  if (st === 1) { stem(s * 0.35); leaf(-s * 0.2, -s * 0.35, s * 0.22, -0.5); leaf(s * 0.2, -s * 0.38, s * 0.22, 0.5); }
  else if (st === 2) { stem(s * 0.9); leaf(-s * 0.3, -s * 0.5, s * 0.32, -0.4); leaf(s * 0.3, -s * 0.65, s * 0.32, 0.4); leaf(-s * 0.2, -s * 0.9, s * 0.22, -0.6); }
  else if (st === 3) {
    stem(s * 1.3); leaf(-s * 0.35, -s * 0.5, s * 0.36, -0.4); leaf(s * 0.35, -s * 0.7, s * 0.36, 0.4);
    const bc = { tulip: '#ff5a7a', tulip2: '#b06cf0', sunflower: '#ffd84a', strawberry: '#ffffff', tomato: '#ffe36b', pumpkin: '#ffb347', carrot: '#7cc576' }[kind];
    ell(0, -s * 1.42, s * 0.2, s * 0.28); ctx.fillStyle = bc; ctx.fill();
  } else if (st === 4) {
    if (kind === 'tulip' || kind === 'tulip2') {
      const c = kind === 'tulip' ? '#ff5a7a' : '#b06cf0';
      stem(s * 1.6); leaf(-s * 0.4, -s * 0.5, s * 0.45, -0.5); leaf(s * 0.4, -s * 0.75, s * 0.45, 0.5);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-s * 0.42, -s * 1.95); ctx.lineTo(-s * 0.22, -s * 1.6); ctx.lineTo(0, -s * 1.95); ctx.lineTo(s * 0.22, -s * 1.6); ctx.lineTo(s * 0.42, -s * 1.95);
      ctx.quadraticCurveTo(s * 0.45, -s * 1.45, 0, -s * 1.45); ctx.quadraticCurveTo(-s * 0.45, -s * 1.45, -s * 0.42, -s * 1.95); ctx.fill();
    } else if (kind === 'carrot') {
      for (let k = -1; k <= 1; k++) leaf(k * s * 0.22, -s * 0.85, s * 0.42, Math.PI / 2 + k * 0.4, '#5fbf5a');
      ctx.beginPath(); ctx.moveTo(-s * 0.32, -s * 0.45); ctx.lineTo(s * 0.32, -s * 0.45); ctx.lineTo(0, s * 0.35); ctx.closePath(); ctx.fillStyle = '#ff8c2a'; ctx.fill();
      ctx.strokeStyle = '#d96a10'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.18 + k * 0.02 * s, -s * 0.25 + k * s * 0.18); ctx.lineTo(-s * 0.05, -s * 0.25 + k * s * 0.18); ctx.stroke(); }
    } else if (kind === 'sunflower') {
      stem(s * 2.0); leaf(-s * 0.45, -s * 0.6, s * 0.5, -0.4); leaf(s * 0.45, -s * 0.95, s * 0.5, 0.4);
      for (let k = 0; k < 12; k++) { const a = k * TK.TAU / 12; ell(Math.cos(a) * s * 0.55, -s * 2.1 + Math.sin(a) * s * 0.55, s * 0.28, s * 0.13, a); ctx.fillStyle = '#ffd84a'; ctx.fill(); }
      ell(0, -s * 2.1, s * 0.42, s * 0.42); ctx.fillStyle = '#8a5a33'; ctx.fill();
      for (const sd of [-1, 1]) { ell(sd * s * 0.13, -s * 2.15, s * 0.05, s * 0.06); ctx.fillStyle = '#222'; ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, -s * 2.08, s * 0.14, 0.2 * Math.PI, 0.8 * Math.PI); ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
    } else if (kind === 'strawberry' || kind === 'tomato') {
      for (let k = 0; k < 5; k++) leaf(Math.cos(k * 1.26) * s * 0.45, -s * 0.6 + Math.sin(k * 1.26) * s * 0.3, s * 0.42, k * 1.26, '#4fae55');
      [[-0.45, -0.55], [0.45, -0.6], [0, -1.0]].forEach(([dx, dy]) => {
        if (kind === 'tomato') { ell(dx * s, dy * s, s * 0.3, s * 0.27); ctx.fillStyle = '#ff4b3e'; ctx.fill(); TK.star(dx * s, dy * s - s * 0.25, s * 0.13, '#3f9a45'); }
        else { ctx.beginPath(); ctx.moveTo(dx * s - s * 0.26, dy * s - s * 0.15); ctx.quadraticCurveTo(dx * s, dy * s - s * 0.3, dx * s + s * 0.26, dy * s - s * 0.15); ctx.lineTo(dx * s, dy * s + s * 0.3); ctx.closePath(); ctx.fillStyle = '#ff3b5c'; ctx.fill();
          for (let k = 0; k < 4; k++) { ell(dx * s + (k % 2 ? 0.08 : -0.08) * s, dy * s + (k < 2 ? -0.05 : 0.08) * s, 1.6, 1.6); ctx.fillStyle = '#ffe36b'; ctx.fill(); } TK.star(dx * s, dy * s - s * 0.2, s * 0.12, '#3f9a45'); }
      });
    } else if (kind === 'pumpkin') {
      leaf(-s * 0.6, -s * 0.9, s * 0.45, -0.3, '#4fae55'); leaf(s * 0.55, -s * 1.0, s * 0.45, 0.3, '#4fae55');
      for (const dx of [-0.35, 0, 0.35]) { ell(dx * s, -s * 0.42, s * 0.42, s * 0.45); ctx.fillStyle = dx ? '#ff9a2e' : '#ffab4a'; ctx.fill(); }
      ctx.fillStyle = '#6b8a3a'; ctx.fillRect(-s * 0.06, -s * 1.0, s * 0.12, s * 0.2);
    }
  }
  ctx.restore();
}
function icon(kind, x, y, s) { plant(kind, x, y + s * (kind === 'sunflower' ? 1.3 : kind === 'carrot' ? 0 : 0.6), 4, s * (kind === 'sunflower' ? 0.55 : 0.75), 0); }
function draw() {
  const W = TK.W, H = TK.H, gy = TK.W < TK.H ? H * 0.3 : H * 0.5;
  ctx.fillStyle = TK.grad(0, gy, '#8fd4ff', '#e2f5ff'); ctx.fillRect(0, 0, W, gy);
  const sr = Math.min(W, H) * 0.06; ell(W * 0.12, H * 0.1, sr, sr); ctx.fillStyle = '#ffd84a'; ctx.fill();
  ctx.fillStyle = TK.grad(gy, H, '#9fdc7c', '#6fbf5a'); ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = '#f6e3c0'; for (let x = 0; x < W; x += 34 * TK.U) { TK.rr(x + 6 * TK.U, gy - 46 * TK.U, 18 * TK.U, 52 * TK.U, 6 * TK.U); ctx.fill(); }   // 울타리
  ctx.fillRect(0, gy - 34 * TK.U, W, 8 * TK.U);
  plots.forEach(p => {
    // 작은 비구름 (다 자란 곳은 사라짐)
    if (p.g < 4) { const cy = p.y - S * 3.0 + Math.sin(TK.T * 2 + p.x) * 3 - (p.wig > 0 ? Math.abs(Math.sin(p.wig * 20)) * S * 0.3 : 0); ctx.fillStyle = p.rain > 0 ? '#c9d8ea' : '#ffffff'; ell(p.x, cy, S * 0.5, S * 0.3); ctx.fill(); ell(p.x - S * 0.4, cy + S * 0.08, S * 0.3, S * 0.22); ctx.fill(); ell(p.x + S * 0.4, cy + S * 0.08, S * 0.3, S * 0.22); ctx.fill(); }
    ell(p.x, p.y, S * 1.0, S * 0.35); ctx.fillStyle = '#8c603c'; ctx.fill();
    ell(p.x, p.y - S * 0.06, S * 0.8, S * 0.22); ctx.fillStyle = '#a8794e'; ctx.fill();
    if (p.picked && phase !== 'play') return;
    const sc = 1 + p.pop * 0.25, sway = Math.sin(TK.T * 1.8 + p.x) * 0.04 + (p.wig > 0 ? Math.sin(p.wig * 40) * 0.1 : 0);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sc, sc); plant(p.kind, 0, 0, p.stage, S, sway); ctx.restore();
    if (p.stage >= 4) HG.drawTag(ctx, NAME[p.kind], p.x, p.y + S * 0.62, S * 0.3, { hi: HG.hi(NAME[p.kind]) });   // 다 자라면 이름표가 피어남
  });
  // 바구니
  const b = basket;
  ctx.fillStyle = '#c98a4a'; ctx.beginPath(); ctx.moveTo(b.x - b.w * 0.5, b.y - b.w * 0.18); ctx.lineTo(b.x + b.w * 0.5, b.y - b.w * 0.18); ctx.lineTo(b.x + b.w * 0.4, b.y + b.w * 0.12); ctx.lineTo(b.x - b.w * 0.4, b.y + b.w * 0.12); ctx.closePath(); ctx.fill();
  b.items.forEach((k, i) => icon(k, b.x - b.w * 0.3 + i * b.w * 0.2, b.y - b.w * 0.2, S * 0.7));
  b.items.forEach((k, i) => { const nm = NAME[k], fs = Math.min(S * 0.24, b.w * 0.36 / ([...nm].length * 1.05)); HG.drawWord(ctx, nm, b.x - b.w * 0.3 + i * b.w * 0.2, b.y - b.w * 0.02 + (i % 2) * fs * 1.15, fs); });   // 바구니 단어 카드 (길이에 맞춰 크기, 두 줄 엇갈림)
  ctx.strokeStyle = '#a86e35'; ctx.lineWidth = 3; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(b.x - b.w * 0.5 + k * b.w * 0.03, b.y - b.w * 0.18 + k * b.w * 0.075); ctx.lineTo(b.x + b.w * 0.5 - k * b.w * 0.03, b.y - b.w * 0.18 + k * b.w * 0.075); ctx.stroke(); }
  flying.forEach(f => { const e = TK.ease(f.t); icon(f.kind, TK.lerp(f.x0, b.x, e), TK.lerp(f.y0, b.y - b.w * 0.2, e) - Math.sin(Math.PI * f.t) * S * 2, S * 0.7); });
  twins.forEach((t, i) => TK.twin(t.kind, phase === 'party' || t.hop >= 0 ? 'happy' : 'idle', t.x, t.yb - TK.hopY(t.hop, t.h * 0.2) - (phase === 'party' ? TK.bob(i * 1.5, t.h * 0.1, 7) : TK.bob(i * 1.5, t.h * 0.02)), t.h, { face: i ? 'left' : 'right' }));
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; },
  actions() { if (phase !== 'play') return []; const p = plots.find(p => p.g < 4); return p ? [{ type: 'tap', x: p.x, y: p.y - S * 0.2, wait: 160 }] : []; },
};
// 별 시범: 가장 덜 자란 흙더미를 톡
window.__demo = () => {
  if (phase !== 'play') return null;
  const p = plots.filter(p => p.g < 4).sort((a, b) => a.g - b.g)[0]; if (!p) return null;
  return { kind: 'tap', x: p.x, y: p.y - S * 0.2, say: '톡톡, 물 주자!' };
};
TK.start({ resize: layout, init() { newSet(); lastGrow = TK.T; }, update, draw });
})();
