// 티노코코 공룡·고래 만나기 — 글자 까꿍 + 공룡·고래 그림책을 합친 놀이 (점수·모으기·실패 없음)
//  숲(공룡)·바다(고래)에 물건 4개(가로 화면은 5개). 물건마다 친구가 하나씩 숨어 살짝 보이며 가끔 꼼지락.
//  물건을 톡 → 물건이 옆으로 비켜나고 친구가 가운데 동그란 빛 속에 크게 까꿍, 이름표를 글자마다 읽어 줌 (H.read + H.hi).
//  친구를 또 톡 → 다시 읽고 콩. 다른 곳을 톡하거나 다 읽고 3.2초 → 친구가 물건 옆에 작은 이름표를 달고 섬.
//  다 만나면 잠깐 축하 → 새 친구들. 두 판마다 숲 ↔ 바다로 쓱 넘어감. 친구는 섞은 주머니에서 다 나올 때까지 겹치지 않게.
//  주소 ?s=forest|sea 로 시작 장면을 고름 (놀이터 지도의 숲·바다).
(() => {
'use strict';
const { ctx, sfx } = TK;
const HG = window.H;   /* 한글 모듈 (이 파일 안의 H 는 화면 높이로 쓰지 않음) */

const SCENES = {
  forest: { bg: 'bg_pk_forest', ax: 0.5, ay: 0.6, objs: ['o_bush', 'o_stump', 'o_mossrock', 'o_log', 'o_mushroom', 'o_tent'], sky: '#bfe9ff', ground: '#9fdc7c', blob: '#6fbf5a' },
  sea: { bg: 'bg_sea', ax: 0.5, ay: 0.45, objs: ['o_rock', 'o_castle', 'o_shell', 'o_weed', 'o_bucket', 'o_lifebuoy'], sky: '#9fdcff', ground: '#f6dfa4', blob: '#c9b48a' },
};
/* 물건 자리 (화면 비율, 물건 밑변 가운데). p = 세로 화면, l = 가로 화면, 숫자 = 물건 수 */
const SLOTS = {
  p4: [[0.27, 0.40], [0.73, 0.36], [0.27, 0.70], [0.73, 0.66]],
  p5: [[0.25, 0.39], [0.75, 0.34], [0.5, 0.54], [0.25, 0.73], [0.75, 0.69]],
  l4: [[0.18, 0.55], [0.39, 0.80], [0.61, 0.80], [0.82, 0.55]],
  l5: [[0.18, 0.53], [0.34, 0.80], [0.5, 0.53], [0.66, 0.80], [0.82, 0.53]],
};

const qs = new URLSearchParams(location.search).get('s');
let scene = qs === 'forest' || qs === 'sea' ? qs : (HG.likes('고래') && !HG.likes('공룡') ? 'sea' : 'forest');
const bags = { forest: [], sea: [] };
let objs = [], focus = null, found = 0, rounds = 0, inScene = 0, phase = 'play', phaseT = 0, slideX = 0, swapped = false;
let G = { port: true, cx: 0, cy: 0, R: 1, slotW: 1 };
let tagRects = [], partyHops = 0;
const other = () => (scene === 'forest' ? 'sea' : 'forest');
/* 놀이 틀: 쌍둥이 자세·톡 반응·축하는 TKP 가 맡음 */
TKP.init({
  id: 'meet', place: scene,
  twins: { port: { x0: 0.14, x1: 0.86, yb: 0.985, h: 0.2 }, land: { x0: 0.07, x1: 0.93, yb: 0.985, h: 0.27 } },
  preload: [SCENES[scene].bg].concat(SCENES[scene].objs, [SCENES[other()].bg]),
  music: 'play',
});

const isWhale = w => HG.WHALES.includes(w) || w === '고래';
function pool(sc) {
  const l = (sc === 'sea' ? HG.WHALES : HG.DINOS).filter(HG.hasPic);
  return l.length ? l : [sc === 'sea' ? '고래' : '공룡'];
}
/* 섞은 주머니: 한 바퀴 다 나올 때까지 같은 친구가 다시 나오지 않음 (한 판 안에서도 겹치지 않게) */
function takeFriends(sc, n) {
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    if (!bags[sc].length) bags[sc] = TK.shuffle(pool(sc));
    const i = bags[sc].findIndex(w => !out.includes(w));
    if (i < 0) { out.push(bags[sc].shift()); continue; }
    out.push(bags[sc].splice(i, 1)[0]);
  }
  return out;
}

function layout() {
  const W = TK.W, H = TK.H, port = W < H, n = objs.length || 4, five = n >= 5;
  const slots = SLOTS[(port ? 'p' : 'l') + (five ? 5 : 4)];
  const s = port ? Math.min(W * (five ? 0.27 : 0.34), H * (five ? 0.135 : 0.16)) : Math.min(W * (five ? 0.11 : 0.125), H * (five ? 0.22 : 0.24));
  objs.forEach((o, i) => { const sl = slots[i % slots.length]; o.x = sl[0] * W; o.y = sl[1] * H; o.s = s; o.side = sl[0] < 0.5 ? -1 : 1; });
  G = {
    port, cx: W / 2, cy: H * (port ? 0.47 : 0.5),
    R: port ? Math.min(W * 0.42, H * 0.25) : Math.min(H * 0.40, W * 0.25),
    slotW: port ? W * 0.44 : W * 0.2,
  };
}
function newRound() {
  const n = TK.W >= TK.H ? 5 : 4, names = TK.shuffle(SCENES[scene].objs).slice(0, n), fr = takeFriends(scene, n);
  HG.preload(fr); HG.preload(bags[scene].slice(0, 5));
  objs = names.map((name, i) => ({ name, friend: fr[i], st: 'hid', inT: -i * 0.09, mv: 0, popT: 0, lv: 0, hop: -1, wig: 0,
    nextWig: TK.T + TK.rand(1.2, 3.5), partyN: 0, readT: 0, doneT: 0, from: null, x: 0, y: 0, s: 1, side: 1 }));
  found = 0; focus = null;
  layout();
}

/* ---------- 친구 자리 (밑변 가운데 x, yb, 키 h) ---------- */
function peekPose(o) {
  const wig = o.wig > 0 ? Math.sin(Math.PI * Math.min(1, o.wig / 0.6)) : 0, h = o.s * (isWhale(o.friend) ? 0.8 : 1.0);
  return { x: o.x + o.side * o.s * 0.14, yb: o.y - o.s * (1.15 + 0.15 * wig) + h, h };
}
function centerPose(o) { const wh = isWhale(o.friend); return { x: G.cx, yb: G.cy + G.R * (wh ? 0.35 : 0.55), h: G.R * (wh ? 0.9 : 1.25) }; }
function slotPose(o) {
  const wh = isWhale(o.friend), h = o.s * (wh ? 0.85 : 1.15), hw = h * (wh ? 0.75 : 0.45);
  /* 친구 그림이 화면 밖으로 나가지 않게 */
  return { x: TK.clamp(o.x - o.side * o.s * 0.12, hw, TK.W - hw), yb: o.y - o.s * 0.04, h };
}
function mix(a, b, t, tk) { return { x: TK.lerp(a.x, b.x, t), yb: TK.lerp(a.yb, b.yb, t), h: TK.lerp(a.h, b.h, tk == null ? t : tk) }; }
function friendPose(o) {
  if (o.st === 'hid') return peekPose(o);
  if (o.st === 'pop') return mix(peekPose(o), centerPose(o), TK.ease(o.popT), TK.back(o.popT));
  if (o.lv < 1) return mix(o.from || centerPose(o), slotPose(o), TK.ease(o.lv));
  return slotPose(o);
}
/* 이름표 글자 크기: 그려질 크기 a 를 폭 maxW 안에 맞추고, drawTag 가 긴 이름을 줄이는 만큼 미리 키워서 넘김 */
function tagSize(w, maxW, cap, floor) {
  const n = [...w].length, a = Math.max(floor || 0, Math.min(cap, maxW / (n * 1.02 + 0.7)));
  return n > 4 ? a / Math.max(0.5, 4.5 / n) : a;
}
/* drawTag 가 실제로 그리는 이름표 폭 (손그림 이름표는 글자 폭의 1.08배) */
function tagWidth(w, size) {
  const n = [...w].length, a = n > 4 ? size * Math.max(0.5, 4.5 / n) : size;
  return (n * a * 1.02 + a * 0.7) * 1.08;
}

/* ---------- 동작 ---------- */
function readFriend(o) { HG.read(o.friend); o.readT = TK.T; o.doneT = 0; }
function open(o) {
  o.st = 'pop'; o.popT = 0; o.mv = 0; o.hop = -1; focus = o;
  readFriend(o);
  sfx.rustle(); sfx.boing();
  TKP.found(o.x, o.y - o.s * 0.8);
}
function dismiss(o) {
  if (!o || o.st !== 'pop') return;
  o.from = friendPose(o); o.st = 'out'; o.lv = 0; o.hop = -1;
  if (focus === o) focus = null;
}
function hitFocus(x, y) { return !!focus && Math.abs(x - G.cx) < G.R * 0.8 && Math.abs(y - G.cy) < G.R * 0.95; }
function objAt(x, y) {
  let best = null, bd = 1e9;
  objs.forEach(o => {
    const moved = o.st !== 'hid', cx = o.x + (moved ? o.side * o.s * 0.2 : 0), hw = o.s * (moved ? 1.0 : 0.78);
    const top = o.y - o.s * (moved ? 1.45 : 1.3), bot = o.y + o.s * 0.22;
    if (Math.abs(x - cx) < hw && y > top && y < bot) { const d = Math.abs(x - cx) + Math.abs(y - (o.y - o.s * 0.55)); if (d < bd) { bd = d; best = o; } }
  });
  return best;
}
function tap(x, y) {
  if (TKP.tap(x, y)) return;
  if (phase !== 'play') { TKP.tapEmpty(x, y); return; }
  if (focus && hitFocus(x, y)) { readFriend(focus); focus.hop = 0; sfx.boing(); TK.spark(x, y, TK.pick(TK.COLS), 10); return; }
  const o = objAt(x, y);
  if (focus) { dismiss(focus); sfx.soft(); }
  if (o && o.st === 'hid') { open(o); return; }
  if (o && o.st === 'out' && o.lv >= 1) { o.hop = 0; readFriend(o); sfx.boing(); TK.spark(o.x, o.y - o.s, TK.pick(TK.COLS), 8); return; }
  TKP.tapEmpty(x, y);
}
TK.input({
  down(p) { tap(p.x, p.y); },
  key() {
    if (phase !== 'play') return;
    if (focus) dismiss(focus);
    const hid = objs.filter(o => o.st === 'hid');
    if (hid.length) open(TK.pick(hid));
  },
});

function nextRound() {
  rounds++; inScene++;
  if (inScene >= 2) { phase = 'slide'; phaseT = 0; swapped = false; sfx.whoosh(); return; }
  newRound(); phase = 'play'; phaseT = 0;
}
function update(dt) {
  TKP.update(dt);
  phaseT += dt;
  objs.forEach(o => {
    o.inT += dt; o.wig = Math.max(0, o.wig - dt);
    if (o.hop >= 0) { o.hop += dt * 2.2; if (o.hop > 1) o.hop = -1; }
    if (o.st === 'hid' && o.inT > 0.4 && TK.T > o.nextWig) { o.wig = 0.6; o.nextWig = TK.T + TK.rand(2.2, 4.8); }
    if (o.st !== 'hid') o.mv = Math.min(1, o.mv + dt / 0.35);
    if (o.st === 'pop') {
      o.popT = Math.min(1, o.popT + dt / 0.45);
      if (o.popT >= 1) {
        const n = [...o.friend].length, h = HG.hi(o.friend), el = TK.T - o.readT;
        if (!o.doneT && el > 0.8 && (h === -1 || el > n * 0.7 + 3)) o.doneT = TK.T;
        if (o.doneT && TK.T - o.doneT > 3.2) dismiss(o);
      }
    } else if (o.st === 'out' && o.lv < 1) {
      o.lv = Math.min(1, o.lv + dt / 0.45);
      if (o.lv >= 1) { found++; sfx.ting(TK.pick([784, 880, 1046.5])); }
    }
  });
  if (phase === 'play' && objs.length && found >= objs.length && !focus) {
    phase = 'party'; phaseT = 0; partyHops = 0;
    TKP.celebrate({ onDone: nextRound });
  }
  /* 축하 동안 서 있는 친구들이 0.18초 간격으로 차례로 hop (두 바퀴, 이름은 다시 읽지 않음) */
  if (phase === 'party') {
    objs.forEach((o, k) => {
      const t0 = 0.3 + k * 0.18, n = (phaseT > t0 ? 1 : 0) + (phaseT > t0 + 1.2 ? 1 : 0);
      if (n > o.partyN) { o.partyN = n; o.hop = 0; }
    });
  }
  if (phase === 'slide') {
    if (phaseT < 0.45) slideX = -TK.ease(phaseT / 0.45) * TK.W;
    else {
      if (!swapped) { swapped = true; scene = other(); inScene = 0; TKP.setPlace(scene); newRound(); }
      slideX = TK.W * (1 - TK.ease((phaseT - 0.45) / 0.45));
      if (phaseT >= 0.9) { slideX = 0; phase = 'play'; phaseT = 0; }
    }
  }
}

/* ---------- 그리기 ---------- */
function drawBack() {
  const sc = SCENES[scene];
  if (!HG.drawBg(ctx, sc.bg, 0, 0, TK.W, TK.H, sc.ax, sc.ay)) { ctx.fillStyle = TK.grad(0, TK.H, sc.sky, sc.ground); ctx.fillRect(0, 0, TK.W, TK.H); }
}
function drawThing(o, x, yb, sc, rot) {
  const h = o.s * sc;
  ctx.save(); ctx.translate(x, yb); if (rot) ctx.rotate(rot);
  if (!HG.drawObj(ctx, o.name, 0, 0, h, h * 1.7)) { ctx.globalAlpha = 0.5; TK.ell(0, -h * 0.4, h * 0.62, h * 0.42); ctx.fillStyle = SCENES[scene].blob; ctx.fill(); }
  ctx.restore();
}
function drawFriend(o, p) {
  ctx.save(); ctx.translate(p.x, p.yb - TK.hopY(o.hop, p.h * 0.2)); HG.drawPic(ctx, o.friend, p.h); ctx.restore();
}
function drawSmallTag(o) {
  const p = slotPose(o), size = tagSize(o.friend, G.slotW, o.s * 0.24, 15), hy = TK.hopY(o.hop, p.h * 0.2);
  const n = [...o.friend].length, fpx = size * (n > 4 ? Math.max(0.5, 4.5 / n) : 1);
  /* 세로 화면은 친구 발 아래(얼굴을 가리지 않게), 가로 화면은 머리 위 */
  const y = G.port ? Math.min(TK.H - fpx * 2, o.y + fpx * 1.1) : Math.max(size * 0.9, p.yb - p.h - hy - size * 0.9), tw = tagWidth(o.friend, size);
  /* 이름표가 화면 밖으로 잘리지 않게 */
  const x = TK.clamp(p.x, tw / 2 + 6, Math.max(tw / 2 + 6, TK.W - tw / 2 - 6));
  tagRects.push({ x, w: tw, y, f: fpx });
  HG.drawTag(ctx, o.friend, x, y, size, { hi: HG.hi(o.friend) });
}
function drawObjects() {
  const order = objs.slice().sort((a, b) => a.y - b.y);
  order.forEach(o => {
    const inK = TK.back(TK.clamp(o.inT / 0.4, 0, 1));
    if (inK <= 0.001) return;
    const mvE = TK.ease(o.mv), ox = TK.clamp(o.x + o.side * o.s * 0.55 * mvE, o.s * 0.5, TK.W - o.s * 0.5), osc = inK * (1 - 0.3 * mvE);
    const rot = o.wig > 0 ? Math.sin(o.wig * 26) * 0.07 * (o.wig / 0.6) : 0;
    if (o.st === 'hid' && o.inT >= 0.4) {
      ctx.save(); ctx.beginPath(); ctx.rect(-TK.W, -TK.H, TK.W * 3, TK.H + o.y - o.s * 0.3); ctx.clip();
      drawFriend(o, peekPose(o)); ctx.restore();
    }
    const settled = o.st === 'out' && o.lv >= 1;
    if (settled) drawFriend(o, slotPose(o));
    ctx.fillStyle = 'rgba(40,30,10,.16)'; TK.ell(ox, o.y, o.s * 0.55 * osc, o.s * 0.1 * osc); ctx.fill();
    drawThing(o, ox, o.y, osc, rot);
  });
  order.forEach(o => { if (o.st === 'out' && o.lv >= 1) drawSmallTag(o); });
}
function drawFocus() {
  objs.filter(o => o.st === 'pop' || (o.st === 'out' && o.lv < 1)).forEach(o => {
    const k = o.st === 'pop' ? TK.ease(o.popT) : 1 - TK.ease(o.lv);
    if (k > 0.01) {
      TK.ell(G.cx, G.cy, G.R * k, G.R * k); ctx.fillStyle = 'rgba(255,250,235,.82)'; ctx.fill();
      ctx.lineWidth = Math.max(3, G.R * 0.03) * k; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.stroke();
    }
    const p = friendPose(o);
    ctx.fillStyle = 'rgba(60,40,20,.14)'; TK.ell(p.x, p.yb + p.h * 0.02, p.h * 0.4, p.h * 0.06); ctx.fill();
    drawFriend(o, p);
    if (o.st === 'pop' && o.popT > 0.5) {
      const size = tagSize(o.friend, Math.min(TK.W * 0.92, G.R * 2.4), G.R * 0.26);
      ctx.save(); ctx.globalAlpha = TK.clamp((o.popT - 0.5) * 2, 0, 1);
      HG.drawTag(ctx, o.friend, G.cx, G.cy + G.R * 0.78, size, { hi: HG.hi(o.friend) });
      ctx.restore();
    }
  });
}
function draw() {
  const sc = SCENES[scene];
  if (slideX) { ctx.fillStyle = TK.grad(0, TK.H, sc.sky, sc.ground); ctx.fillRect(0, 0, TK.W, TK.H); }
  ctx.save(); ctx.translate(slideX, 0);
  tagRects = [];
  drawBack(); drawObjects(); drawFocus();
  ctx.restore();
  TKP.drawTwins();
  TK.drawParts();
}

/* ---------- 자동 확인·별 시범 ---------- */
window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get scene() { return scene; },
  get found() { return found; }, get total() { return objs.length; },
  get objY() { return objs.map(o => o.y); }, get objs() { return objs.map(o => o.name); }, get tagRects() { return tagRects.slice(); },
  get focus() { return focus ? focus.friend : null; }, get friends() { return objs.map(o => o.friend); },
  actions() {
    if (phase !== 'play') return [];
    const hid = objs.filter(o => o.st === 'hid' && !hitFocus(o.x, o.y - o.s * 0.5));
    if (hid.length) { const o = hid[0]; return [{ type: 'tap', x: o.x, y: o.y - o.s * 0.5, wait: 700 }]; }
    if (focus) return [{ type: 'tap', x: TK.W * 0.5, y: TK.H * 0.06, wait: 700 }];
    return [];
  },
};
window.__demo = () => {
  if (phase !== 'play' || focus) return null;
  const hid = objs.filter(o => o.st === 'hid'); if (!hid.length) return null;
  const o = TK.pick(hid);
  return { kind: 'tap', x: o.x, y: o.y - o.s * 0.5, say: '톡! 누가 숨었을까?', sayKey: 'peek' };
};
TK.start({ resize: layout, init() { newRound(); }, update, draw });
})();
