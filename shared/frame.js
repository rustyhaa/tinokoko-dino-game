// =====================================================================
// frame.js — 티노코코 놀이터 공통 틀 (모든 게임이 같은 파일을 씀)
//  1) 집 버튼: 1초 꾹 눌러야 나감 (둘레에 원이 차오름). 아이가 톡 치면 안 나감.
//  2) 나갈 때 인사: 티노·코코가 손 흔들며 "안녕!" → 놀이터로.
//  3) 별 시범 + 음성: 처음 들어오면, 그리고 한참 손을 안 대면 반짝이 별이 노는 법을 한 번 보여줌.
//     게임은 window.__demo = () => ({ kind:'tap'|'path'|'hold', x, y, pts, ms, say }) 로 시범 내용을 알려줌.
//  4) 잘 시간: 놀이터에서 정한 시간이 되면 어느 게임에서든 화면이 밤처럼 어두워지고 둘이 잠듦.
//     해 버튼을 1초 꾹 누르면 깨움.
//  5) 태블릿·모바일 보정: iOS 소리·음성 잠금 해제, 두 손가락 확대·더블탭 확대 막기, 안전 영역.
//  6) 놀이터 앱 하나: 사이트 맨 위의 sw.js 하나로 모든 게임을 오프라인 저장. 예전 게임별 설치는 정리.
//  게임 쪽 약속: window.__paused 가 true 면 게임 진행(update)을 멈춘다.
// =====================================================================
(function () {
'use strict';
const HUB = '../games/';
const ASSET = '../shared/assets/';
const now = () => performance.now() / 1000;
const isMuted = () => (window.TK && TK.muted) || !!(document.getElementById('snd') && document.getElementById('snd').classList.contains('off'));

// ---------- 화면 요소 ----------
const style = document.createElement('style');
style.textContent = `
html,body{overscroll-behavior:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;-webkit-text-size-adjust:100%}
#tkfx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
.tkbtn{position:fixed;width:52px;height:52px;border:0;border-radius:50%;padding:0;background:rgba(255,255,255,.82);
  opacity:.62;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.tkbtn svg{width:100%;height:100%;display:block;pointer-events:none}
.tkbtn.on{opacity:1}
#tkhome{top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));z-index:8}
#tksleep{position:fixed;inset:0;z-index:6;display:none;touch-action:none;overflow:hidden;background:rgba(16,20,52,0);opacity:0;transition:opacity 2s ease}
#tksleep.dark{opacity:1}
#tksleep.show{display:block}
#tksleep.dark{background:linear-gradient(#141c44,#2b3a78 70%,#244a48 70%,#1d3d3b)}
#tksleep .moon{position:absolute;top:max(14%,calc(env(safe-area-inset-top) + 70px));right:12%;width:min(16vw,16vh);height:min(16vw,16vh);border-radius:50%;
  box-shadow:inset calc(min(16vw,16vh)*-.28) calc(min(16vw,16vh)*-.06) 0 0 #fff4c2}
#tksleep .sky{position:absolute;width:4px;height:4px;border-radius:50%;background:#fffbe0;animation:tkblink 2.4s ease-in-out infinite}
#tksleep .tw{position:absolute;bottom:6%;height:min(34vh,48vw);transform-origin:50% 100%;animation:tksway 3.2s ease-in-out infinite;filter:brightness(.8)}
#tksleep .tw.t{left:12%;transform:scaleX(-1)}
#tksleep .tw.c{right:12%;animation-delay:-1.6s}
#tksleep .z{position:absolute;color:#fff;font:800 30px/1 system-ui,sans-serif;opacity:0;animation:tkz 3.2s linear infinite}
#tksleep .st{position:absolute;width:14px;height:14px;margin:-7px;border-radius:50%;background:#fff6c2;box-shadow:0 0 14px #fff6c2;animation:tktw 1s ease-out forwards}
#tksun{bottom:max(14px,env(safe-area-inset-bottom));right:max(14px,env(safe-area-inset-right));z-index:7;position:absolute}
#tkbye{position:fixed;inset:0;z-index:9;display:none;background:rgba(255,255,255,0);transition:background .35s}
#tkbye.show{display:block;background:rgba(255,255,255,.88)}
#tkbye img{position:absolute;bottom:-50%;height:min(44vh,60vw);animation:tkup .45s ease-out forwards}
#tkbye img.t{left:18%}
#tkbye img.c{right:18%}
#tkbye img.wave{animation:tkwave .32s ease-in-out infinite alternate;bottom:8%}
@keyframes tksway{0%,100%{rotate:-4deg}50%{rotate:4deg}}
@keyframes tkz{0%{opacity:0;translate:0 0;scale:.6}20%{opacity:.95}100%{opacity:0;translate:30px -120px;scale:1.5}}
@keyframes tktw{0%{opacity:1;scale:.3}100%{opacity:0;scale:2.4}}
@keyframes tkup{to{bottom:8%}}
@keyframes tkblink{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes tkwave{from{rotate:-7deg}to{rotate:7deg}}
`;
document.head.appendChild(style);

const fx = document.createElement('canvas'); fx.id = 'tkfx'; document.body.appendChild(fx);
const g = fx.getContext('2d');
let W = innerWidth, H = innerHeight, U = 1;
function fit() { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; U = Math.min(W, H) / 700; fx.width = W * d; fx.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 200)); fit();

// 집 버튼 + 둘레 진행 원
const RING = 2 * Math.PI * 23;
function ringButton(id, iconSvg, color) {
  const b = document.createElement('button'); b.id = id; b.className = 'tkbtn';
  b.innerHTML = `<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"
    stroke-dasharray="${RING}" stroke-dashoffset="${RING}" transform="rotate(-90 26 26)" class="ring"/>${iconSvg}</svg>`;
  return b;
}
function longPress(el, ms, onDone) {
  const ring = el.querySelector('.ring'); let t0 = 0, raf = 0, active = false;
  const reset = () => { active = false; cancelAnimationFrame(raf); el.classList.remove('on'); ring.style.strokeDashoffset = RING; };
  const tick = () => {
    if (!active) return;
    const p = Math.min(1, (performance.now() - t0) / ms);
    ring.style.strokeDashoffset = RING * (1 - p);
    if (p >= 1) { reset(); onDone(); return; }
    raf = requestAnimationFrame(tick);
  };
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); active = true; t0 = performance.now(); el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (_) {} tick(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, e => { e.stopPropagation(); reset(); }));
  el.addEventListener('click', e => e.stopPropagation());
  el.addEventListener('contextmenu', e => e.preventDefault());
}
const home = ringButton('tkhome', '<path d="M15 27 L26 17 L37 27 M18.5 25 V36 H33.5 V25" fill="none" stroke="#335" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><rect x="23.5" y="29" width="5" height="7" fill="#335"/>', '#ff9a2e');
home.setAttribute('aria-label', '놀이터로 (1초 꾹 누르기)');
document.body.appendChild(home);
longPress(home, 1000, goodbye);

// ---------- 소리 (틀 자체용: 인사·자장가·잠깐 효과) ----------
let fa = null;
function faudio() { if (!fa) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; fa = new C(); } if (fa.state === 'suspended') fa.resume(); return fa; }
function ftone(f, delay, dur, vol, type = 'sine') {
  if (!fa || isMuted()) return;
  const t = fa.currentTime + delay, o = fa.createOscillator(), gn = fa.createGain();
  o.type = type; o.frequency.value = f; gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(fa.destination); o.start(t); o.stop(t + dur + 0.05);
}
function say(text) {
  try {
    const ss = window.speechSynthesis; if (!ss || isMuted()) return;
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 1.0; u.pitch = 1.45;
    const v = ss.getVoices().find(v => /^ko/i.test(v.lang)); if (v) u.voice = v;
    ss.speak(u);
  } catch (e) {}
}

// ---------- 태블릿·모바일 보정 ----------
// iOS Safari 는 손을 뗄 때(touchend/click) 소리·음성을 허락하는 경우가 많아 여러 순간에 한 번씩 깨워 둔다.
let speechReady = false;
function unlock() {
  try {
    if (window.TK && TK.audio) TK.audio();
    if (window.__audioUnlock) window.__audioUnlock();
    faudio();
    if (!speechReady && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); speechReady = true; }
  } catch (e) {}
}
['touchend', 'pointerup', 'click', 'keydown'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));
document.addEventListener('gesturestart', e => e.preventDefault());           // iOS 두 손가락 확대
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.hidden && fa) fa.suspend && fa.suspend(); });

// ---------- 나갈 때 인사 ----------
let leaving = false;
function goodbye() {
  if (leaving) return; leaving = true; window.__paused = true;
  const bye = document.createElement('div'); bye.id = 'tkbye';
  bye.innerHTML = `<img class="t" src="${ASSET}tino_jump_v2.png" alt=""><img class="c" src="${ASSET}coco_laugh_v2.png" alt="">`;
  document.body.appendChild(bye);
  requestAnimationFrame(() => bye.classList.add('show'));
  setTimeout(() => bye.querySelectorAll('img').forEach(i => i.classList.add('wave')), 450);
  faudio(); say('안녕!'); [784, 659.25, 523.25].forEach((f, i) => ftone(f, i * 0.14, 0.3, 0.12, 'triangle'));
  setTimeout(() => { location.href = HUB; }, 1400);
}
addEventListener('pageshow', e => { if (e.persisted) { leaving = false; window.__paused = sleeping; const b = document.getElementById('tkbye'); if (b) b.remove(); } });   // 뒤로 돌아왔을 때

// ---------- 잘 시간 ----------
let sleeping = false, sleepEl = null, zTimer = 0;
function readUntil() { try { const v = JSON.parse(localStorage.getItem('tk-sleep') || 'null'); return v && v.until || 0; } catch (e) { return 0; } }
function startSleep() {
  sleeping = true; window.__paused = true; demo = null;
  if (!sleepEl) {
    sleepEl = document.createElement('div'); sleepEl.id = 'tksleep';
    let sky = ''; for (let i = 0; i < 40; i++) sky += `<i class="sky" style="left:${(i * 37) % 100}%;top:${(i * 53) % 62}%;animation-delay:${(i % 7) * 0.35}s"></i>`;
    sleepEl.innerHTML = sky + `<div class="moon"></div><img class="tw t" src="${ASSET}tino_run_v2.png" alt=""><img class="tw c" src="${ASSET}coco_run_v2.png" alt="">`;
    const sun = ringButton('tksun', '<circle cx="26" cy="26" r="7" fill="#ffb347"/><g stroke="#ffb347" stroke-width="3" stroke-linecap="round"><path d="M26 11v4M26 37v4M11 26h4M37 26h4M15.4 15.4l2.8 2.8M33.8 33.8l2.8 2.8M15.4 36.6l2.8-2.8M33.8 18.2l2.8-2.8"/></g>', '#ffb347');
    sun.setAttribute('aria-label', '깨우기 (1초 꾹 누르기, 부모용)');
    sleepEl.appendChild(sun);
    longPress(sun, 1000, () => { try { localStorage.removeItem('tk-sleep'); } catch (e) {} stopSleep(); });
    sleepEl.addEventListener('pointerdown', e => {   // 자는 동안 아이가 눌러도 작은 별만 반짝
      if (e.target.closest('.tkbtn')) return;
      e.preventDefault(); e.stopPropagation();
      const s = document.createElement('div'); s.className = 'st'; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
      sleepEl.appendChild(s); setTimeout(() => s.remove(), 1000); faudio(); ftone(900 + Math.random() * 400, 0, 0.3, 0.05);
    });
    document.body.appendChild(sleepEl);
  }
  sleepEl.classList.add('show'); requestAnimationFrame(() => requestAnimationFrame(() => sleepEl.classList.add('dark')));
  faudio(); ftone(520, 0, 1.1, 0.12); ftone(660, 0.7, 1.1, 0.1); say('잘 자!');
  [261.63, 261.63, 392, 392, 440, 440, 392, 349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63].forEach((f, i) => ftone(f, 1.8 + i * 0.5, 0.6, 0.07));
  clearInterval(zTimer);
  zTimer = setInterval(() => {
    if (!sleeping) return;
    ['t', 'c'].forEach((k, i) => { const im = sleepEl.querySelector('.tw.' + k); const r = im.getBoundingClientRect(); const z = document.createElement('div'); z.className = 'z'; z.textContent = 'z';
      z.style.left = (r.left + r.width * (i ? 0.35 : 0.6)) + 'px'; z.style.top = (r.top + r.height * 0.05) + 'px'; z.style.animationDelay = (i * 0.6) + 's'; sleepEl.appendChild(z); setTimeout(() => z.remove(), 4000); });
  }, 1600);
}
function stopSleep() {
  sleeping = false; window.__paused = leaving; clearInterval(zTimer);
  if (sleepEl) { sleepEl.classList.remove('dark'); setTimeout(() => { if (!sleeping) sleepEl.classList.remove('show'); }, 300); }
  lastInput = now();
}
function sleepCheck() { const until = readUntil(); if (until && Date.now() >= until && !sleeping) startSleep(); else if (sleeping && !until) stopSleep(); }
setInterval(sleepCheck, 1000);

// ---------- 별 시범 ----------
let demo = null, lastInput = now(), start = now(), firstDone = false, idleRuns = 0;
const onInput = () => { lastInput = now(); idleRuns = 0; demo = null; };
addEventListener('pointerdown', onInput, true); addEventListener('keydown', onInput, true);
function tryDemo() {
  const f = window.__demo; if (typeof f !== 'function') return false;
  let d = null; try { d = f(); } catch (e) { d = null; }
  if (!d) return false;
  if (d.kind === 'path' && (!d.pts || d.pts.length < 2)) return false;
  if (d.kind !== 'path') d.pts = [{ x: d.x, y: d.y }];
  let len = 0; for (let i = 1; i < d.pts.length; i++) len += Math.hypot(d.pts[i].x - d.pts[i - 1].x, d.pts[i].y - d.pts[i - 1].y);
  d.len = len; d.t = 0; d.trail = [];
  d.dur = 0.6 + (d.kind === 'path' ? Math.min(2.2, 0.7 + len / (600 * U)) : d.kind === 'hold' ? 1.6 : 0.4) + 0.6;
  demo = d; say(d.say || '');
  return true;
}
function at(d, q) {   // 경로 위 q(0~1) 위치
  if (d.pts.length === 1 || d.len === 0) return d.pts[0];
  let want = q * d.len;
  for (let i = 1; i < d.pts.length; i++) { const a = d.pts[i - 1], b = d.pts[i], l = Math.hypot(b.x - a.x, b.y - a.y); if (want <= l) { const k = l ? want / l : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; } want -= l; }
  return d.pts[d.pts.length - 1];
}
function star(x, y, r, col, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  g.closePath(); g.fillStyle = col; g.fill(); g.restore();
}
let last = now();
function loop() {
  const t = now(), dt = Math.min(0.05, t - last); last = t;
  g.clearRect(0, 0, W, H);
  if (!demo && !sleeping && !leaving) {
    const idleLimit = idleRuns < 3 ? 10 : 25;
    if ((!firstDone && t - start > 1.6) || (firstDone && t - lastInput > idleLimit)) {
      if (tryDemo()) { firstDone = true; idleRuns++; lastInput = t; }
      else if (!firstDone && t - start > 8) firstDone = true;
    }
  }
  if (demo) {
    const d = demo; d.t += dt;
    const p0 = d.pts[0], R = Math.max(26, 34 * U);   // 폰에서도 잘 보이게
    const ap = Math.min(1, d.t / 0.6), e = 1 - Math.pow(1 - ap, 3);
    let x, y, press = 0, ringR = 0;
    if (d.t < 0.6) { x = p0.x + (1 - e) * 90 * U; y = p0.y + (1 - e) * 110 * U; }
    else {
      const k = d.t - 0.6, body = d.dur - 1.2;
      if (d.kind === 'path') { const q = Math.min(1, k / body); const p = at(d, q); x = p.x; y = p.y; press = 1; }
      else if (d.kind === 'hold') { x = p0.x; y = p0.y; press = 1; ringR = Math.min(1, k / body) * Math.max(60, 120 * U); }
      else { x = p0.x; y = p0.y; press = Math.max(0, 1 - Math.abs(k - 0.2) / 0.2); if (k > 0.2) ringR = (k - 0.2) * 220 * U; }
    }
    const fade = Math.min(1, (d.dur - d.t) / 0.4);
    if (press) { d.trail.push({ x, y, a: 1 }); }
    d.trail.forEach(p => p.a -= dt * 1.6); d.trail = d.trail.filter(p => p.a > 0);
    d.trail.forEach((p, i) => { if (i % 2) star(p.x, p.y, R * 0.35 * p.a, `rgba(255,236,150,${p.a * 0.8 * fade})`, t * 3 + i); });
    if (ringR > 0) { g.beginPath(); g.arc(x, y, ringR, 0, Math.PI * 2); g.strokeStyle = `rgba(255,255,255,${0.85 * fade})`; g.lineWidth = 4; g.stroke(); }
    g.save(); g.shadowColor = 'rgba(255,220,90,.95)'; g.shadowBlur = 22;
    star(x, y, R * (1 - press * 0.18), `rgba(255,214,60,${fade})`, t * 2);
    g.shadowBlur = 0; star(x, y, R * 0.42 * (1 - press * 0.18), `rgba(255,255,255,${0.9 * fade})`, t * 2);
    g.restore();
    if (d.t >= d.dur) demo = null;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- 놀이터 앱: 오프라인 저장 하나로 ----------
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  const root = new URL('../', location.href).href;
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => { if (r.scope !== root && r.scope.startsWith(root)) r.unregister(); })).catch(() => {});
  navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => {});
}

// 자동 확인용
window.__frame = { get demo() { return !!demo; }, get demoSay() { return demo && demo.say; }, get sleeping() { return sleeping; }, get leaving() { return leaving; }, goodbye, sleepCheck };
sleepCheck();   // 이미 잘 시간이 지났으면 들어오자마자 잠든 화면
})();
