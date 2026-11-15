// =====================================================================
// play.js — 지도 놀이 공통 "놀이 틀" (window.TKP)
//  쌍둥이 자세·톡 반응·발견 반응·한 판 축하·나가는 장소 기억·고정 문구 말하기를 한 번만 구현해 여러 놀이가 같이 씀.
//  TKP.init() 을 부르기 전에는 아무 일도 하지 않음 (전역 리스너도 init 안에서만 건다).
//  로드 순서: tk.js → hangul.js → music.js → play.js → game.js → frame.js
//  계약 문서: docs/renewal/master-plan.md c 절, 구현 메모: docs/renewal/wp0-notes.md
// =====================================================================
(function () {
'use strict';
const TKP = window.TKP = {};
const TKr = () => window.TK, HGr = () => window.H;
const pnow = () => performance.now() / 1000;

/* 고정 문구표: 문구를 바꾸면 음성 파일도 다시 만들어야 함 (키 'p:<키>') */
TKP.PHRASES = {
  yay: '우와!', yay2: '와아, 신난다!', peek: '톡! 누가 숨었을까?', jump: '톡 하면 폴짝 뛰어요',
  rub: '쓱쓱 문질러 봐!', clean: '깨끗해졌다!', water: '톡톡, 물 주자!', drum: '둥둥 두드려 봐!',
  sweep: '쓱 쓸어 봐!', star: '반짝이는 별을 톡!', trace: '반짝이는 별을 따라 쓱!', finish: '결승선이다!'
};
const KIND = ['tino', 'coco'];
const NAME = ['티노', '코코'];

let opt = null, idlePose = 'happy', lastInput = pnow(), place = '';
let cele = null, yayFlip = 0;
const sayAt = {};
/* 쌍둥이 상태: hop(0~1 진행, -1 없음) · amp(hop 높이 배율) · rq(자세 덮어쓰기 대기열) · hint(point 남은 초) · 마지막 그린 값 */
const tw = [0, 1].map(() => ({ hop: -1, amp: 1, rq: [], hint: 0, readAt: -9, pose: 'happy', x: 0, yb: 0, h: 0, w: 0, drawn: false }));

TKP.inited = false;
TKP.busy = false;
TKP.ready = Promise.resolve();

const dbg = window.__tkp = { inited: false, id: '', phase: 'play', celebrations: 0, founds: 0, lastSay: '', twins: [{ pose: '', x: 0, yb: 0, h: 0 }, { pose: '', x: 0, yb: 0, h: 0 }], ready: false };

function setPlaceKey(k) { try { sessionStorage.setItem('tk-last-place', k); } catch (e) {} }

TKP.init = function (o) {
  o = o || {};
  opt = o; idlePose = o.idlePose || 'happy';
  place = o.place || o.id || '';
  TKP.inited = dbg.inited = true; dbg.id = o.id || '';
  if (place) setPlaceKey(place);
  lastInput = pnow();
  if (!TKP._wired) {
    TKP._wired = true;
    const inp = () => { lastInput = pnow(); };
    addEventListener('pointerdown', inp, true); addEventListener('keydown', inp, true);
    addEventListener('tk:demo', e => {
      const d = (e && e.detail) || {}; if (typeof d.x !== 'number') return;
      let i = TKP.side(d.x);
      if (tw[0].drawn && tw[1].drawn) i = Math.abs(d.x - tw[0].x) <= Math.abs(d.x - tw[1].x) ? 0 : 1;
      tw[i].hint = 1.8;
    });
  }
  /* 놀이 그림을 미리 읽음: 전부 읽히거나 900ms 가 지나면 ready */
  const names = (o.preload || []).slice(), t0 = pnow();
  dbg.ready = false;
  TKP.ready = new Promise(res => {
    const H = HGr();
    if (!names.length || !H || !H.lazyImg) { dbg.ready = true; res(); return; }
    const tick = () => {
      const left = names.filter(n => !H.lazyImg(n));
      if (!left.length || pnow() - t0 > 0.9) { dbg.ready = true; res(); return; }
      setTimeout(tick, 40);
    };
    tick();
  });
  if (o.music && window.TKMusic && TKMusic.play) { try { TKMusic.play(o.music); } catch (e) {} }
  return TKP;
};

TKP.side = x => (x < (TKr() ? TK.W : innerWidth) / 2 ? 0 : 1);
TKP.setPlace = k => { place = k; setPlaceKey(k); };
TKP.idle = () => pnow() - lastInput;

/* ---------- 자세 ---------- */
TKP.pose = i => {
  const t = tw[i];
  let p;
  if (cele && window.TK) p = TK.partyPose(i);
  else if (t.rq.length) p = t.rq[0].pose;
  else if (t.hint > 0) p = 'point';
  else p = idlePose;
  return { pose: p, hop: t.hop, lift: t.hop >= 0 && window.TK ? TK.hopY(t.hop, (t.h || 0) * 0.22 * t.amp) : 0 };
};

TKP.react = (i, pose, sec) => {
  if (i === 'both') { TKP.react(0, pose, sec); TKP.react(1, pose, sec); return; }
  tw[i].rq = [{ pose, t: sec == null ? 1.2 : sec }];
};

function hop(i, amp) { tw[i].hop = 0; tw[i].amp = amp || 1; }

TKP.update = dt => {
  tw.forEach(t => {
    if (t.hop >= 0) { t.hop += dt / 0.45; if (t.hop > 1) t.hop = -1; }
    if (t.rq.length) { t.rq[0].t -= dt; if (t.rq[0].t <= 0) t.rq.shift(); }
    if (t.hint > 0) t.hint -= dt;
  });
  if (cele) stepCele(dt);
};

/* ---------- 그리기 ---------- */
TKP.drawTwin = (i, x, yb, h, o) => {
  o = o || {};
  const T = window.TK; if (!T) return 0;
  const t = tw[i], P = TKP.pose(i);
  t.h = h;
  const pose = o.pose || P.pose;
  const lift = (!o.pose || cele) && t.hop >= 0 ? T.hopY(t.hop, h * 0.22 * t.amp) : 0;
  const bob = cele ? T.bob(i, h * 0.1, 7) : (o.pose ? 0 : T.bob(i * 1.5, h * 0.02));
  const a = { hop: t.hop };
  ['rot', 'alpha', 'face', 'sx', 'sy'].forEach(k => { if (o[k] != null) a[k] = o[k]; });
  const w = T.twin(KIND[i], pose, x, yb - lift - bob, h, a);
  /* 놀이가 translate/scale 을 걸어 그렸어도 화면 좌표로 기록 */
  let wx = x, wy = yb, wh = h;
  try {
    const m = T.ctx.getTransform(), cv = T.ctx.canvas, d = cv && T.W ? cv.width / T.W : 1;
    wx = (m.a * x + m.c * yb + m.e) / d; wy = (m.b * x + m.d * yb + m.f) / d; wh = h * Math.abs(m.d) / d;
  } catch (e) {}
  t.pose = pose; t.x = wx; t.yb = wy; t.h = wh; t.w = (w || wh * 0.8); t.drawn = true;
  const D = dbg.twins[i]; D.pose = pose; D.x = wx; D.yb = wy; D.h = wh;
  return w;
};

function layout() {
  const T = TK, L = opt && opt.twins; if (!L) return null;
  return T.H >= T.W ? L.port : L.land;
}
TKP.drawTwins = () => {
  const l = layout(); if (!l || !window.TK) return;
  const W = TK.W, Hh = TK.H;
  TKP.drawTwin(0, W * l.x0, Hh * l.yb, Hh * l.h);
  TKP.drawTwin(1, W * l.x1, Hh * l.yb, Hh * l.h);
};

TKP.twinAt = (x, y) => {
  for (let i = 0; i < 2; i++) {
    const t = tw[i]; if (!t.drawn) continue;
    if (Math.abs(x - t.x) < t.w * 0.45 && y > t.yb - t.h && y < t.yb) return i;
  }
  return -1;
};

/* ---------- 톡 ---------- */
TKP.tapTwin = i => {
  const t = tw[i], T = window.TK; if (!T) return;
  hop(i, 1);
  T.sfx.giggle(KIND[i]);
  T.hearts(t.x, t.yb - t.h * 1.0, 6);
  TKP.react(i, 'clap', 0.8);
  const n = pnow();
  if (n - t.readAt > 1.5) { t.readAt = n; if (window.H) H.read(NAME[i]); }
};
TKP.tapEmpty = (x, y) => {
  const T = window.TK; if (!T) return;
  T.ring(x, y, 14 * T.U, [255, 255, 255]);
  T.sfx.soft();
  hop(TKP.side(x), 0.5);
};
TKP.tap = (x, y) => {
  const T = window.TK; if (!T || !TKP.inited) return false;
  const i = TKP.twinAt(x, y);
  if (i >= 0) { TKP.tapTwin(i); return true; }
  if (cele) { T.spark(x, y, T.COLS[(Math.random() * T.COLS.length) | 0], 6); T.sfx.soft(); return true; }
  return false;
};

TKP.found = (x, y, o) => {
  o = o || {};
  const T = window.TK; if (!T) return;
  T.spark(x, y, T.COLS[(Math.random() * T.COLS.length) | 0], 12);
  const s = o.side != null ? o.side : TKP.side(x);
  tw[s].rq = [{ pose: o.pose || 'wow', t: 0.9 }, { pose: 'clap', t: 1.2 }];
  hop(1 - s, 1);
  dbg.founds++;
};

/* ---------- 말하기 ---------- */
TKP.say = key => {
  if ((window.TK && TK.muted) || !window.H) return;
  const text = TKP.PHRASES[key]; if (!text) return;
  const n = pnow(); if (sayAt[key] != null && n - sayAt[key] < 4) return;
  sayAt[key] = n; dbg.lastSay = key;
  H.say(text, 'p:' + key);
};

/* ---------- 축하 ---------- */
TKP.celebrate = o => {
  o = o || {};
  const T = window.TK; if (!T || cele) return;
  const dur = o.big ? 4.2 : 3.0;
  cele = { t: 0, dur, big: !!o.big, word: !!o.word, onDone: o.onDone, ev: [false, false, false, false, false, false, false] };
  TKP.busy = true; dbg.phase = 'cele'; dbg.celebrations++;
  T.sfx.fanfare();
  hop(0, 1); hop(1, 1);
};
function sparkSky() { const T = TK; T.spark(T.rand(T.W * 0.1, T.W * 0.9), T.rand(T.H * 0.08, T.H * 0.4), T.COLS[(Math.random() * T.COLS.length) | 0], 14); }
function stepCele(dt) {
  const T = TK, c = cele; c.t += dt;
  T.confetti(dt);
  const at = (k, s, fn) => { if (!c.ev[k] && c.t >= s) { c.ev[k] = true; fn(); } };
  at(0, 0, sparkSky); at(1, 0.6, sparkSky); at(2, 1.2, sparkSky);
  at(3, 0.25, () => { if (!c.word) { TKP.say(yayFlip++ % 2 ? 'yay2' : 'yay'); } });
  at(4, 0.4, () => { if (c.big) T.sfx.clap(); });
  at(5, c.dur - 0.4, () => T.flash());
  at(6, c.dur - 0.25, () => { const f = c.onDone; c.onDone = null; if (f) { try { f(); } catch (e) { console.warn('celebrate onDone', e); } } });
  if (c.t >= c.dur) { cele = null; TKP.busy = false; dbg.phase = 'play'; }
}
})();
