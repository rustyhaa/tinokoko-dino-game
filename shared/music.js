// =====================================================================
// music.js — 코드로 만드는 잔잔한 배경음악 (음악 파일·라이선스·인터넷 없음)
//  게임이 TKMusic.play('night'|'beach'|'play') 하면 첫 손가락 터치 뒤부터 작게 흐른다.
//  · 아주 작게 (효과음·글자 소리가 주인공), 글자를 읽는 동안은 더 작게 (H.speaking)
//  · 소리 끄기 버튼·잘 시간·화면 가려짐·부모 설정 '배경음악 끔'(localStorage tk-music=0)이면 멈춤
//  · 늘 어울리는 화음(C–Am–F–G)과 오음계만 써서 효과음과 겹쳐도 거슬리지 않게
// =====================================================================
(function () {
'use strict';
const M = window.TKMusic = {};
let ac = null, out = null, style = null, timer = 0, nextT = 0, step = 0, mel = 0;
M.enabled = () => { try { return localStorage.getItem('tk-music') !== '0'; } catch (e) { return true; } };
const muted = () => (window.TK && TK.muted) || !!(document.getElementById('snd') && document.getElementById('snd').classList.contains('off'));
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

function ensure() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C(); out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
  }
  if (ac.state !== 'running' && ac.state !== 'closed') ac.resume();
  return ac;
}
// 아이폰은 손가락을 뗄 때 소리를 허락하는 경우가 많아 여러 순간에 깨움
['touchend', 'pointerup', 'click', 'keydown'].forEach(ev => addEventListener(ev, () => { if (style && M.enabled()) { ensure(); start(); } }, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden && ac && ac.state === 'running') ac.suspend(); });

// 악기 (모두 짧게 사라지는 소리라 겹쳐도 깔끔)
function note(m, t, dur, kind, vol) {
  const o = ac.createOscillator(), g = ac.createGain();
  if (kind === 'bell') {   // 오르골: 사인 + 위 배음, 길게 울림
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.type = 'sine'; o2.frequency.value = hz(m) * 3; g2.gain.setValueAtTime(vol * 0.12, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.5);
    o2.connect(g2); g2.connect(out); o2.start(t); o2.stop(t + dur);
  }
  o.type = kind === 'pluck' ? 'triangle' : 'sine';
  o.frequency.value = hz(m);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (kind === 'pad' ? 0.25 : 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];   // C Am F G
const PENTA = [72, 74, 76, 79, 81, 84];
const STYLES = {
  // 별자리: 느린 오르골 자장가
  night: { bpm: 62, bar(c, i, t, e) { note(c[0] - 12, t, e * 7, 'pad', 0.09); }, step(c, i, t, e) { const arp = [0, 1, 2, 1, 0, 1, 2, 1]; note(c[arp[i]] + 12 + (i === 2 || i === 6 ? 12 : 0), t, 1.6, 'bell', 0.07); } },
  // 발자국 길: 우쿨렐레처럼 통통, 가끔 멜로디
  beach: { bpm: 92, bar(c, i, t, e) { note(c[0] - 12, t, e * 3, 'pad', 0.1); note(c[0] - 12, t + e * 4, e * 3, 'pad', 0.08); },
    step(c, i, t, e) { if (i % 2 === 0) c.forEach((m, k) => note(m, t + k * 0.018, 0.35, 'pluck', i % 4 === 0 ? 0.07 : 0.045));
      if (i % 4 === 3 && Math.random() < 0.6) { mel = Math.max(0, Math.min(PENTA.length - 1, mel + (Math.random() < 0.5 ? -1 : 1))); note(PENTA[mel], t, 0.6, 'bell', 0.05); } } },
  // 짝꿍·까꿍: 마림바처럼 톡톡
  play: { bpm: 100, bar(c, i, t, e) { note(c[0] - 12, t, e * 4, 'pad', 0.09); },
    step(c, i, t, e) { const arp = [0, 2, 1, 2, 0, 2, 1, 2]; note(c[arp[i]] + 12, t, 0.28, 'mallet', 0.06); if (i === 6 && Math.random() < 0.5) note(PENTA[(Math.random() * PENTA.length) | 0], t, 0.5, 'bell', 0.04); } },
};

function tick() {
  if (!ac || !style) return;
  // 소리 크기: 기본 아주 작게, 글자 읽는 중엔 더 작게, 꺼야 할 때 0
  const off = !M.enabled() || muted() || window.__paused || document.hidden;
  const talking = window.H && H.speaking && H.speaking();
  out.gain.setTargetAtTime(off ? 0 : talking ? 0.13 : 0.4, ac.currentTime, talking ? 0.08 : 0.4);   // 효과음의 약 1/3, 읽는 동안 그 1/3
  if (off || ac.state !== 'running') { nextT = 0; return; }
  const S = STYLES[style], e = 60 / S.bpm / 2;   // 8분음표 길이
  if (!nextT || nextT < ac.currentTime - 0.5) nextT = ac.currentTime + 0.1;
  while (nextT < ac.currentTime + 0.4) {
    const bar = Math.floor(step / 8) % 4, i = step % 8, c = CHORDS[bar];
    if (i === 0) S.bar(c, i, nextT, e);
    S.step(c, i, nextT, e);
    nextT += e; step++;
  }
}
function start() { if (!timer) timer = setInterval(tick, 100); }
M.play = s => { style = STYLES[s] ? s : null; step = 0; nextT = 0; if (ac && style) start(); };
// 확인용: 이 스타일을 secs 초 동안 조용히 미리 만들어 AudioBuffer 로 (자동 확인·샘플 파일용)
M._render = (s, secs = 16) => {
  const keep = [ac, out, step], C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  ac = new C(1, 44100 * secs, 44100); out = ac.createGain(); out.gain.value = 1; out.connect(ac.destination);
  const S = STYLES[s], e = 60 / S.bpm / 2; step = 0;
  for (let t = 0.05; t < secs - 1; t += e) { const bar = Math.floor(step / 8) % 4, i = step % 8, c = CHORDS[bar]; if (i === 0) S.bar(c, i, t, e); S.step(c, i, t, e); step++; }
  const r = ac.startRendering(); [ac, out, step] = keep; return r;
};
M.stop = () => { style = null; if (out && ac) out.gain.setTargetAtTime(0, ac.currentTime, 0.2); };
})();
