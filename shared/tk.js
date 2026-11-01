// =====================================================================
// tk.js — 티노코코 미니게임 공통 엔진 (바닐라 JS, 외부 라이브러리 없음)
//  화면·루프 / 소리(WebAudio + 브라우저 음성) / 스프라이트 / 효과 / 여러 손가락 입력 /
//  소리 끄기 버튼 / 홈 화면 앱 등록 / 친구 그림.
//  모든 게임이 ../shared/tk.js 하나를 함께 쓴다. 집 버튼·별 시범·잘 시간·앱 등록은 frame.js 담당.
// =====================================================================
(function () {
'use strict';
const TK = window.TK = {};
const TAU = TK.TAU = Math.PI * 2;
TK.rand = (a, b) => a + Math.random() * (b - a);
TK.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
TK.lerp = (a, b, t) => a + (b - a) * t;
TK.ease = t => 1 - Math.pow(1 - TK.clamp(t, 0, 1), 3);
TK.back = t => { t = TK.clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
TK.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
TK.pick = a => a[(Math.random() * a.length) | 0];
TK.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
TK.COLS = [[255,90,95],[255,159,67],[255,214,50],[76,210,100],[58,167,255],[100,100,225],[176,92,240]];
TK.rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ---------- 캔버스 ----------
const cv = document.getElementById('c');
const ctx = TK.ctx = cv.getContext('2d');
TK.W = innerWidth; TK.H = innerHeight; TK.U = 1; TK.T = 0;
let game = null;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  TK.W = innerWidth; TK.H = innerHeight;
  cv.width = Math.round(TK.W * dpr); cv.height = Math.round(TK.H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  TK.U = Math.min(TK.W, TK.H) / 700;
  if (game && game.resize) game.resize();
}
addEventListener('resize', resize);
TK.start = g => {
  game = g; resize();
  if (g.init) g.init();
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!window.__paused) {   // 잘 시간·나가는 중에는 멈춤 (frame.js)
      TK.T += dt; TK.dt = dt;
      if (game.update) game.update(dt);
      updateParts(dt);
    }
    if (game.draw) game.draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

// ---------- 그리기 도우미 ----------
TK.ell = (x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, 0.01), Math.max(ry, 0.01), rot, 0, TAU); };
TK.star = (x, y, r, col, rot = 0) => {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore();
};
TK.rr = (x, y, w, h, r) => {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};
TK.heart = (x, y, r, col) => {
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  ctx.fillStyle = col; ctx.fill();
};
TK.grad = (y0, y1, c0, c1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };

// ---------- 소리 ----------
let ac = null, master = null;
TK.muted = false;
TK.audio = () => {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C(); master = ac.createGain(); master.gain.value = TK.muted ? 0 : 0.6; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
};
TK.audioState = () => ac ? ac.state : 'none';
TK.suspend = () => { if (ac && ac.state === 'running') ac.suspend(); };   // 화면이 가려질 때 (frame.js). 다음 톡에서 TK.audio()가 다시 켬
const tone = TK.tone = (f, delay = 0, dur = 0.3, type = 'sine', vol = 0.3, f2 = 0) => {
  if (!ac) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
};
let noiseBuf = null;
const noise = TK.noise = (dur = 0.1, f = 2000, vol = 0.2, delay = 0, f2 = 0, q = 1.2) => {
  if (!ac) return;
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = ac.currentTime + delay, s = ac.createBufferSource(); s.buffer = noiseBuf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f, t);
  if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
};
TK.PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
TK.sfx = {
  pop: () => { noise(0.05, 2600, 0.22); tone(TK.pick(TK.PENTA.slice(3, 8)), 0, 0.3, 'sine', 0.22); },
  boing: () => { tone(260, 0, 0.35, 'sine', 0.26, 820); tone(520, 0.02, 0.2, 'triangle', 0.08, 1300); },
  ting: (f = 1046.5) => { tone(f, 0, 0.5, 'sine', 0.2); tone(f * 2, 0.02, 0.25, 'sine', 0.06); },
  soft: () => tone(TK.rand(900, 1300), 0, 0.22, 'sine', 0.06),
  down: () => tone(600, 0, 0.25, 'sine', 0.12, 250),
  whoosh: () => noise(0.35, 600, 0.12, 0, 2400),
  splash: () => noise(0.3, 1200, 0.14, 0, 400),
  rustle: () => noise(0.16, 1800, 0.12),
  squeak: () => tone(TK.rand(1300, 1700), 0, 0.07, 'sine', 0.05, TK.rand(1800, 2300)),
  clap: () => { noise(0.06, 3000, 0.35); noise(0.06, 3000, 0.3, 0.14); },
  horn: () => { tone(196, 0, 0.7, 'sawtooth', 0.08); tone(247, 0, 0.7, 'square', 0.04); tone(196, 0.8, 0.9, 'sawtooth', 0.08); },
  giggle: (kind, delay = 0) => { const b = kind === 'tino' ? 500 : 640; for (let i = 0; i < 4; i++) tone(b * (1.1 - i * 0.07), delay + i * 0.09, 0.08, 'triangle', 0.2, b * (1.3 - i * 0.07)); },
  fanfare: () => { [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => { tone(f, i * 0.13, 0.45, 'triangle', 0.22); tone(f / 2, i * 0.13, 0.3, 'sine', 0.12); }); },
  sparkle: () => { noise(0.4, 6000, 0.07); [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.3, 'sine', 0.11)); },
};
TK.say = text => {
  try {
    const ss = window.speechSynthesis; if (!ss || TK.muted) return;
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 1.0; u.pitch = 1.45;
    const v = ss.getVoices().find(v => /^ko/i.test(v.lang)); if (v) u.voice = v;
    ss.speak(u);
  } catch (e) {}
};

// ---------- 스프라이트 (원본 PNG 수정 없이 화면에서만 크기·반전) ----------
const SPR = {};
['tino_run_v2', 'tino_jump_v2', 'coco_run_v2', 'coco_jump_v2', 'coco_laugh_v2'].forEach(n => {
  const im = new Image(); im.src = '../shared/assets/' + n + '.png'; SPR[n] = im;
});
TK.sprite = (name, x, yb, h, o = {}) => {
  const im = SPR[name]; if (!im || !im.complete || !im.naturalWidth) return 0;
  const w = h * im.naturalWidth / im.naturalHeight;
  ctx.save(); ctx.translate(x, yb); if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.sx || 1) * (o.flip || 1), o.sy || 1);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
  return w;
};
// 자세: idle(달리기 그림, face 로 방향) / jump(점프) / happy(티노 점프, 코코 웃음)
// run 그림은 원본이 왼쪽을 봄 → face:'right' 면 화면에서만 뒤집음
TK.twin = (kind, pose, x, yb, h, o = {}) => {
  let name;
  if (pose === 'idle') name = kind + '_run_v2';
  else if (pose === 'jump') name = kind + '_jump_v2';
  else name = kind === 'tino' ? 'tino_jump_v2' : 'coco_laugh_v2';
  const flip = pose === 'idle' && (o.face || (kind === 'tino' ? 'right' : 'left')) === 'right' ? -1 : 1;
  return TK.sprite(name, x, yb, h, Object.assign({}, o, { flip }));
};
// 통통: 평소 작게 콩콩 / hop(0..1 진행) 크게 한 번
TK.bob = (ph, amp, speed = 3.2) => Math.abs(Math.sin(TK.T * speed + ph)) * amp;
TK.hopY = (p, amp) => p >= 0 && p <= 1 ? Math.sin(Math.PI * p) * amp : 0;

// ---------- 효과 ----------
const parts = TK.parts = [];
TK.spark = (x, y, c, n = 10, spd = 1) => { for (let i = 0; i < n; i++) { const a = TK.rand(0, TAU), v = TK.rand(100, 260) * TK.U * spd; parts.push({ t: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * TK.U, r: TK.rand(7, 12) * TK.U, life: 0.8, max: 0.8, c, rot: TK.rand(0, TAU), vr: TK.rand(-6, 6), g: 300 }); } };
TK.hearts = (x, y, n = 6) => { for (let i = 0; i < n; i++) parts.push({ t: 'heart', x: x + TK.rand(-20, 20) * TK.U, y, vx: TK.rand(-40, 40) * TK.U, vy: -TK.rand(60, 130) * TK.U, r: TK.rand(9, 14) * TK.U, life: 1.1, max: 1.1, c: i % 2 ? [255, 120, 160] : [255, 170, 190], delay: i * 0.05 }); };
TK.ring = (x, y, r, c, grow = 120) => parts.push({ t: 'ring', x, y, r, life: 0.5, max: 0.5, c, grow });
TK.drops = (x, y, c, n = 8, spd = 1) => { for (let i = 0; i < n; i++) parts.push({ t: 'drop', x, y, vx: TK.rand(-80, 80) * TK.U * spd, vy: -TK.rand(120, 260) * TK.U * spd, r: TK.rand(3, 7) * TK.U, life: 0.8, max: 0.8, c, g: 700 }); };
TK.foam = (x, y, n = 3) => { for (let i = 0; i < n; i++) parts.push({ t: 'foam', x: x + TK.rand(-14, 14) * TK.U, y: y + TK.rand(-14, 14) * TK.U, vx: TK.rand(-20, 20) * TK.U, vy: -TK.rand(10, 50) * TK.U, r: TK.rand(5, 13) * TK.U, life: TK.rand(0.8, 1.6), max: 1.6, c: [255, 255, 255] }); };
TK.confetti = dt => { if (Math.random() < dt * 40) parts.push({ t: 'conf', x: TK.rand(0, TK.W), y: -10, vx: TK.rand(-30, 30) * TK.U, vy: TK.rand(70, 150) * TK.U, w: TK.rand(8, 14) * TK.U, rot: TK.rand(0, TAU), vr: TK.rand(-6, 6), life: 3.5, max: 3.5, c: TK.pick(TK.COLS) }); };
TK.clearParts = () => { parts.length = 0; };
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
    if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (p.g) p.vy += p.g * TK.U * dt;
    if (p.vr) p.rot += p.vr * dt;
    if (p.t === 'conf') p.vx += Math.sin(TK.T * 3 + p.rot) * 20 * dt;
    if (p.t === 'ring') p.r += p.grow * TK.U * dt;
  }
}
TK.drawParts = () => {
  parts.forEach(p => {
    if (p.delay > 0) return;
    const a = TK.clamp(p.life / p.max, 0, 1);
    if (p.t === 'spark') TK.star(p.x, p.y, p.r * (0.6 + a * 0.4), TK.rgba(p.c, Math.min(1, a * 1.5)), p.rot);
    else if (p.t === 'heart') TK.heart(p.x, p.y, p.r, TK.rgba(p.c, Math.min(1, a * 1.6)));
    else if (p.t === 'ring') { TK.ell(p.x, p.y, p.r, p.r); ctx.strokeStyle = TK.rgba(p.c, a); ctx.lineWidth = 4 * a + 1; ctx.stroke(); }
    else if (p.t === 'drop') { TK.ell(p.x, p.y, p.r, p.r); ctx.fillStyle = TK.rgba(p.c, a); ctx.fill(); }
    else if (p.t === 'foam') { TK.ell(p.x, p.y, p.r, p.r); ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`; ctx.fill(); ctx.strokeStyle = `rgba(190,220,255,${0.8 * a})`; ctx.lineWidth = 1.5; ctx.stroke(); }
    else if (p.t === 'conf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = TK.rgba(p.c, Math.min(1, a * 2)); ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); ctx.restore(); }
  });
};

// ---------- 입력: 여러 손가락 · 마우스 · 아무 키 ----------
// 게임은 TK.input({ down(p), move(p), up(p), key() }) 로 받는다. p = { id, x, y, down(눌린 상태) }
const ptrs = TK.pointers = new Map();
let handlers = {};
TK.input = h => { handlers = h; };
const pk = e => e.pointerType + e.pointerId;
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); TK.audio();
  if (window.__paused) return;
  const p = { id: pk(e), x: e.clientX, y: e.clientY, down: true, x0: e.clientX, y0: e.clientY, t0: TK.T };
  ptrs.set(p.id, p);
  if (handlers.down) handlers.down(p);
});
cv.addEventListener('pointermove', e => {
  let p = ptrs.get(pk(e));
  if (!p) { if (e.pointerType !== 'mouse') return; p = { id: pk(e), x: e.clientX, y: e.clientY, down: false }; }
  p.x = e.clientX; p.y = e.clientY;
  if (handlers.move) handlers.move(p);
});
const release = e => { const p = ptrs.get(pk(e)); if (!p) return; p.x = e.clientX; p.y = e.clientY; p.down = false; ptrs.delete(p.id); if (handlers.up) handlers.up(p); };
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
cv.addEventListener('contextmenu', e => e.preventDefault());
let lastKey = -1;
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab' || /^F\d/.test(e.key)) return;
  e.preventDefault(); TK.audio();
  if (window.__paused || TK.T - lastKey < 0.3) return; lastKey = TK.T;
  if (handlers.key) handlers.key(e);
});

// ---------- 부모용 최소 UI: 소리 켜고 끄기 ----------
const st = document.createElement('style');
st.textContent = `#snd{position:fixed;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));width:44px;height:44px;
border-radius:50%;border:0;background:rgba(255,255,255,.8);padding:8px;opacity:.6;cursor:pointer;z-index:2}
#snd svg{width:100%;height:100%;display:block}#snd .x{display:none}#snd.off .x{display:inline}#snd.off .w{display:none}`;
document.head.appendChild(st);
const snd = document.createElement('button');
snd.id = 'snd'; snd.setAttribute('aria-label', '소리 켜기/끄기');
snd.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#335"/><path class="w" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/><path class="x" d="M16 9l5 6M21 9l-5 6"/></svg>';
document.body.appendChild(snd);
snd.addEventListener('pointerdown', e => e.stopPropagation());
snd.addEventListener('click', () => { TK.muted = !TK.muted; snd.classList.toggle('off', TK.muted); TK.audio(); if (master) master.gain.value = TK.muted ? 0 : 0.6; snd.blur(); });


// ---------- 친구들 (밑변 가운데가 원점, 키 h) ----------
TK.FRIENDS = ['crab', 'fish', 'starfish', 'jelly', 'bunny', 'frog', 'chick', 'butterfly', 'owl', 'skystar'];
TK.drawFriend = (kind, h) => {
  const s = h / 2, ell = TK.ell, star = TK.star, T = TK.T;
  const eyes = (dx, y, r = s * 0.12) => { for (const sd of [-1, 1]) { ell(sd * dx, y, r, r * 1.1); ctx.fillStyle = '#fff'; ctx.fill(); ell(sd * dx, y + r * 0.1, r * 0.55, r * 0.6); ctx.fillStyle = '#222'; ctx.fill(); } };
  const smile = (y, w) => { ctx.beginPath(); ctx.arc(0, y - w * 0.4, w, 0.2 * Math.PI, 0.8 * Math.PI); ctx.strokeStyle = '#4a2a2a'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round'; ctx.stroke(); };
  if (kind === 'crab') {
    ctx.strokeStyle = '#d9483b'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * 0.5, -s * 0.9); ctx.lineTo(sd * s * 0.9, -s * 1.5); ctx.stroke(); ell(sd * s * 0.95, -s * 1.65, s * 0.3, s * 0.22, sd * 0.6); ctx.fillStyle = '#ef5a4c'; ctx.fill(); }
    ell(0, -s * 0.7, s * 0.85, s * 0.6); ctx.fillStyle = '#ef5a4c'; ctx.fill();
    eyes(s * 0.32, -s * 0.85); smile(-s * 0.45, s * 0.2);
  } else if (kind === 'fish') {
    ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.lineTo(-s * 0.45, -s * 0.05); ctx.lineTo(s * 0.45, -s * 0.05); ctx.closePath(); ctx.fillStyle = '#ff8c42'; ctx.fill();
    ell(0, -s * 1.0, s * 0.62, s * 0.8); ctx.fillStyle = '#ffa552'; ctx.fill();
    eyes(s * 0.25, -s * 1.15); smile(-s * 0.8, s * 0.15);
  } else if (kind === 'starfish' || kind === 'skystar') {
    if (kind === 'skystar') { ctx.shadowColor = 'rgba(255,240,150,.9)'; ctx.shadowBlur = 20; }
    star(0, -s * 1.0, s * 1.0, kind === 'skystar' ? '#ffe680' : '#ff8fb1', Math.sin(T * 3) * 0.1);
    ctx.shadowBlur = 0; eyes(s * 0.2, -s * 1.05, s * 0.09); smile(-s * 0.8, s * 0.12);
  } else if (kind === 'jelly') {
    ctx.strokeStyle = 'rgba(190,140,255,.9)'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
    for (let k = -1.5; k <= 1.5; k++) { ctx.beginPath(); ctx.moveTo(k * s * 0.3, -s * 0.8); ctx.quadraticCurveTo(k * s * 0.3 + Math.sin(T * 6 + k) * s * 0.25, -s * 0.4, k * s * 0.3, 0); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, -s * 0.8, s * 0.75, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = 'rgba(205,160,255,.95)'; ctx.fill();
    eyes(s * 0.25, -s * 1.15, s * 0.1); smile(-s * 0.95, s * 0.12);
  } else if (kind === 'bunny') {
    for (const sd of [-1, 1]) { ell(sd * s * 0.28, -s * 1.75, s * 0.18, s * 0.5, sd * 0.15); ctx.fillStyle = '#fff'; ctx.fill(); ell(sd * s * 0.28, -s * 1.75, s * 0.08, s * 0.35, sd * 0.15); ctx.fillStyle = '#ffc0cf'; ctx.fill(); }
    ell(0, -s * 0.9, s * 0.65, s * 0.6); ctx.fillStyle = '#fff'; ctx.fill();
    eyes(s * 0.25, -s * 1.0, s * 0.1); ell(0, -s * 0.8, s * 0.07, s * 0.05); ctx.fillStyle = '#ff8fa3'; ctx.fill(); smile(-s * 0.65, s * 0.12);
  } else if (kind === 'frog') {
    for (const sd of [-1, 1]) { ell(sd * s * 0.4, -s * 1.35, s * 0.28, s * 0.28); ctx.fillStyle = '#5fc46a'; ctx.fill(); }
    ell(0, -s * 0.75, s * 0.85, s * 0.6); ctx.fillStyle = '#5fc46a'; ctx.fill();
    eyes(s * 0.4, -s * 1.35, s * 0.15);
    ctx.beginPath(); ctx.arc(0, -s * 0.85, s * 0.45, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = '#2f7a3a'; ctx.lineWidth = s * 0.07; ctx.stroke();
  } else if (kind === 'chick') {
    ell(0, -s * 0.8, s * 0.7, s * 0.75); ctx.fillStyle = '#ffd84a'; ctx.fill();
    ell(-s * 0.6, -s * 0.75, s * 0.2, s * 0.32, 0.4); ctx.fill(); ell(s * 0.6, -s * 0.75, s * 0.2, s * 0.32, -0.4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.9); ctx.lineTo(s * 0.12, -s * 0.9); ctx.lineTo(0, -s * 0.72); ctx.closePath(); ctx.fillStyle = '#ff9a3c'; ctx.fill();
    eyes(s * 0.25, -s * 1.1, s * 0.1);
  } else if (kind === 'butterfly') {
    const f = 0.7 + 0.3 * Math.abs(Math.sin(T * 9));
    for (const sd of [-1, 1]) {
      ell(sd * s * 0.5 * f, -s * 1.25, s * 0.5 * f, s * 0.45); ctx.fillStyle = sd < 0 ? '#ff8fd0' : '#8fb8ff'; ctx.fill();
      ell(sd * s * 0.4 * f, -s * 0.65, s * 0.35 * f, s * 0.3); ctx.fill();
    }
    TK.rr(-s * 0.1, -s * 1.6, s * 0.2, s * 1.2, s * 0.1); ctx.fillStyle = '#5a3d2b'; ctx.fill();
    eyes(s * 0.06, -s * 1.55, s * 0.06);
  } else if (kind === 'owl') {
    ell(0, -s * 0.95, s * 0.75, s * 0.9); ctx.fillStyle = '#9c6b42'; ctx.fill();
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * 0.6, -s * 1.6); ctx.lineTo(sd * s * 0.35, -s * 1.95); ctx.lineTo(sd * s * 0.15, -s * 1.65); ctx.fillStyle = '#9c6b42'; ctx.fill(); }
    ell(0, -s * 0.7, s * 0.45, s * 0.5); ctx.fillStyle = '#e2c49a'; ctx.fill();
    for (const sd of [-1, 1]) { ell(sd * s * 0.28, -s * 1.25, s * 0.26, s * 0.26); ctx.fillStyle = '#fff'; ctx.fill(); ell(sd * s * 0.28, -s * 1.25, s * 0.13, s * 0.13); ctx.fillStyle = '#222'; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 1.08); ctx.lineTo(s * 0.08, -s * 1.08); ctx.lineTo(0, -s * 0.92); ctx.closePath(); ctx.fillStyle = '#ffb347'; ctx.fill();
  }
};
})();
