// 티노코코 공룡·고래 그림책 — 넘겨 보는 친구 그림책 (점수·모으기 없음)
//  한 장에 친구 하나: 공룡은 숲, 고래는 바다. 친구를 톡 → 콩 뛰며 이름을 글자마다 읽어 줌.
//  양옆 큰 화살표를 톡(또는 옆으로 쓱) → 다음 친구로 넘어가며 이름을 읽음. 좋아하는 것(공룡·고래)을 켜면 그쪽이 먼저.
(() => {
const { ctx, clamp, rand, sfx } = TK;
const HG = window.H;   // 한글 모듈 (이 파일 안의 H 는 화면 높이)
let list = [], idx = 0, slide = 0, dir = 1, hop = -1, twinHop = [-1, -1], fx = 0, readT = 0;

function makeList() {
  const d = HG.DINOS.filter(HG.hasPic), w = HG.WHALES.filter(HG.hasPic);
  const likeD = HG.likes('공룡'), likeW = HG.likes('고래');
  const a = likeW && !likeD ? [w, d] : [d, w];   // 좋아하는 쪽 먼저, 둘이 번갈아
  const out = []; for (let i = 0; i < Math.max(d.length, w.length); i++) { if (a[0][i]) out.push(a[0][i]); if (a[1][i]) out.push(a[1][i]); }
  list = out.length ? out : ['공룡', '고래'];
  HG.preload(list.slice(0, 3));
}
const cur = () => list[idx];
const isWhale = w => HG.WHALES.includes(w) || w === '고래';
function read() { HG.read(cur()); hop = 0; readT = TK.T; }
function go(d) {
  idx = (idx + d + list.length) % list.length; dir = d; slide = 1; hop = -1;
  HG.preload([list[(idx + 1) % list.length], list[(idx - 1 + list.length) % list.length]]);
  sfx.whoosh && sfx.whoosh(); twinHop[d > 0 ? 1 : 0] = 0;
  setTimeout(read, 250);
}

function layout() {}
const geo = () => {
  const W = TK.W, H = TK.H, port = W < H;
  const ph = Math.min(port ? W * 0.62 : H * 0.5, H * 0.42);
  return { W, H, port, ph, cx: W / 2, base: H * (port ? 0.6 : 0.66), tagY: H * (port ? 0.7 : 0.8), arr: Math.min(W, H) * 0.1 };
};
function hitFriend(x, y) { const g = geo(); return Math.abs(x - g.cx) < g.ph * 0.8 && y > g.base - g.ph * 1.05 && y < g.tagY + g.ph * 0.2; }

let down = null;
TK.input({
  down(p) { down = { x: p.x, y: p.y }; },
  up(p) {
    if (!down) return; const dx = p.x - down.x, dy = p.y - down.y; down = null; const g = geo();
    if (Math.abs(dx) > g.W * 0.12 && Math.abs(dx) > Math.abs(dy)) return go(dx < 0 ? 1 : -1);   // 쓱 넘기기
    if (p.x < g.arr * 2.2) return go(-1);
    if (p.x > g.W - g.arr * 2.2) return go(1);
    if (hitFriend(p.x, p.y)) { read(); TK.spark(p.x, p.y, TK.pick(TK.COLS), 10); sfx.pop && sfx.pop(); return; }
    twinHop[p.x < g.W / 2 ? 0 : 1] = 0;
  },
  key(e) { if (e && e.key === 'ArrowLeft') go(-1); else go(1); },
});

function update(dt) {
  slide = Math.max(0, slide - dt * 3.2);
  if (hop >= 0) { hop += dt * 2.2; if (hop > 1) hop = -1; }
  twinHop.forEach((h, i) => { if (h >= 0) { twinHop[i] = h + dt * 2.4; if (twinHop[i] > 1) twinHop[i] = -1; } });
  fx += dt;
}

function drawArrow(x, y, r, d) {
  const pulse = 1 + Math.sin(TK.T * 3) * 0.04;
  ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
  TK.ell(0, 0, r, r); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill(); ctx.lineWidth = Math.max(2, r * 0.08); ctx.strokeStyle = '#f0c879'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 0.22 * d, -r * 0.42); ctx.lineTo(r * 0.3 * d, 0); ctx.lineTo(-r * 0.22 * d, r * 0.42);
  ctx.lineWidth = r * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ff9a2e'; ctx.stroke();
  ctx.restore();
}
function draw() {
  const g = geo(), { W, H } = g, w = cur(), sea = isWhale(w);
  if (!HG.drawBg(ctx, sea ? 'bg_sea' : 'bg_pk_forest', 0, 0, W, H, 0.5, sea ? 0.45 : 0.6)) { ctx.fillStyle = TK.grad(0, H, sea ? '#9fdcff' : '#bfe9ff', sea ? '#f6dfa4' : '#9fdc7c'); ctx.fillRect(0, 0, W, H); }
  // 친구: 넘길 때 옆에서 미끄러져 들어옴, 고래는 물결처럼 둥실
  const off = TK.ease(slide) * W * 0.6 * dir, hy = TK.hopY(hop, g.ph * 0.18), sway = sea ? Math.sin(TK.T * 1.8) * g.ph * 0.03 : TK.bob(0, g.ph * 0.012, 2.4);
  ctx.save(); ctx.globalAlpha = 1 - slide * 0.8;
  ctx.fillStyle = 'rgba(60,40,20,.16)'; TK.ell(g.cx + off, g.base + g.ph * 0.02, g.ph * 0.55 * (1 - hy / g.ph), g.ph * 0.07); ctx.fill();
  ctx.translate(g.cx + off, g.base - hy - sway);
  const sq = hop >= 0 && hop < 0.15 ? 1 - Math.sin(hop / 0.15 * Math.PI) * 0.08 : 1; ctx.scale(1 / sq, sq);
  HG.drawPic(ctx, w, sea ? g.ph * 0.72 : g.ph); ctx.restore();   /* 고래는 옆으로 길어서 작게 */
  // 이름표
  ctx.save(); ctx.globalAlpha = 1 - slide;
  const n = [...w].length, fs = Math.min(W * 0.84 / (n * 1.02 + 0.7), Math.min(W, H) * 0.11);
  HG.drawTag(ctx, w, g.cx, g.tagY, fs * (n > 4 ? Math.min(2, n / 4.5) : 1), { hi: HG.hi(w) });   // drawTag 가 긴 이름을 줄이므로 미리 되돌려 폭에 맞춤
  ctx.restore();
  drawArrow(g.arr * 1.15, H * 0.5, g.arr, -1); drawArrow(W - g.arr * 1.15, H * 0.5, g.arr, 1);
  // 티노·코코: 아래 양옆에서 구경
  const th = H * (g.port ? 0.16 : 0.26);
  [['tino', W * 0.13], ['coco', W * 0.87]].forEach(([k, x], i) => TK.twin(k, twinHop[i] >= 0 ? 'clap' : (hop >= 0 && hop < 0.6) ? 'wow' : 'idle', x, H * 0.985 - TK.hopY(twinHop[i], th * 0.25) - TK.bob(i * 1.7, th * 0.02), th, { face: i ? 'left' : 'right' }));
  // 몇 번째 장인지 작은 점 (글자 없이)
  const dots = Math.min(list.length, 12), dr = Math.min(W, H) * 0.008, k = Math.floor(idx * dots / list.length);
  for (let i = 0; i < dots; i++) { TK.ell(W / 2 + (i - (dots - 1) / 2) * dr * 3.4, H * 0.955, dr, dr); ctx.fillStyle = i === k ? '#ff9a2e' : 'rgba(255,255,255,.75)'; ctx.fill(); }
  TK.drawParts();
}

window.__g = {
  get idx() { return idx; }, get word() { return cur(); }, get count() { return list.length; },
  next() { go(1); }, show(w) { const i = list.indexOf(w); if (i >= 0) { idx = i; slide = 0; } },
  actions() { return [{ type: 'tap', x: TK.W - geo().arr * 1.15, y: TK.H * 0.5, wait: 900 }]; },
};
window.__demo = () => ({ kind: 'tap', x: TK.W - geo().arr * 1.15, y: TK.H * 0.5, say: '옆으로 넘겨 봐요' });
TK.start({ resize: layout, init() { makeList(); }, update, draw });
})();
