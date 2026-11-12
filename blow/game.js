// 티노코코 내 이름 방울 — 꾹(또는 톡) 하나로 노는 이름 놀이
//  화면을 누르면 비눗방울이 생겨 둥실 떠오른다 (꾹 누르면 크게, 톡 하면 보통). 방울마다 이름 글자가 하나씩 들어 있다.
//  떠가는 방울을 톡 터뜨리면 그 글자가 아래 이름 칸 제자리로 쏙 — 다 모이면 "티노." 하고 이름을 완성해 읽는다.
//  이름 차례: 부모가 넣은 아이 이름 → 티노 → 코코 → 엄마 → 아빠 → (반복). 실패 없음: 놓친 방울의 글자는 다음 방울에 다시 담긴다.
//  부모 설정 '불어서 방울'(tk-blowmic=1)을 켜면 마이크에 "후~" 불어서도 방울이 생긴다 (소리 크기만 보고 녹음·저장 안 함).
(() => {
const { ctx, ell, rand, clamp, sfx, tone } = TK;
const HG = window.H;   // 한글 모듈 (이 파일 안의 H 는 화면 높이)
let phase = 'play', phaseT = 0, rounds = 0, RMAX = 100, RMIN = 14, nameIdx = 0;
let target = '티노', syl = [], got = [], fly = [], growing = new Map(), bubbles = [], twins = [{ kind: 'tino', hop: -1 }, { kind: 'coco', hop: -1 }];
const names = () => (HG.cfg().names || []).map(s => (s || '').trim()).filter(Boolean).slice(0, 2).concat(['티노', '코코', '엄마', '아빠']);

function layout() {
  const W = TK.W, H = TK.H, port = W < H;
  RMAX = Math.min(W, H) * (port ? 0.2 : 0.16); RMIN = 12 * TK.U + 6;
  twins.forEach((t, i) => { t.h = port ? H * 0.17 : H * 0.3; t.x = i ? W * (port ? 0.85 : 0.9) : W * (port ? 0.15 : 0.1); t.yb = H * 0.97; });
}
function newName() {
  const list = names(); target = list[nameIdx++ % list.length]; syl = [...target]; got = syl.map(() => false); fly = [];
}
// 다음 방울에 담을 글자: 아직 안 모였고, 다른 방울에 담겨 날아가는 중이 아닌 것 중 앞에서부터
function nextSyl() {
  for (let i = 0; i < syl.length; i++) if (!got[i] && !bubbles.some(b => b.si === i) && !fly.some(f => f.si === i)) return i;
  return -1;
}
// 아래 이름 칸 자리
const slotSize = () => Math.min(TK.W / (syl.length + 1.5), TK.H * 0.13);
const slotPos = i => { const s = slotSize(), x0 = TK.W / 2 - (syl.length - 1) * s * 0.6; return { x: x0 + i * s * 1.2, y: TK.H * 0.86 }; };
const hue = () => Math.floor(rand(0, 360));
function release(g) {
  const si = phase === 'play' ? nextSyl() : -1;
  const r = Math.max(g.r, RMAX * 0.5);   // 글자가 보일 만큼은 크게
  bubbles.push({ x: g.x, y: g.y, r, vy: -rand(38, 60) * TK.U - r * 0.2, vx: rand(-18, 18) * TK.U, ph: rand(0, 6.28), h: g.h, si, age: 0 });
  sfx.whoosh(); tone(400 + r * 3, 0, 0.25, 'sine', 0.1, 900 + r * 4);
  const tw = g.x < TK.W / 2 ? twins[0] : twins[1]; tw.hop = 0;
}
function popBubble(b) {
  bubbles.splice(bubbles.indexOf(b), 1);
  sfx.pop(); TK.ring(b.x, b.y, b.r, [255, 255, 255], 80);
  for (let k = 0; k < 10; k++) { const a = rand(0, 6.28); TK.parts.push({ t: 'drop', x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 80 * TK.U, vy: Math.sin(a) * 80 * TK.U, r: rand(2, 4) * TK.U, life: 0.5, max: 0.5, c: [200, 230, 255], g: 200 }); }
  if (b.si >= 0 && !got[b.si]) { fly.push({ si: b.si, x: b.x, y: b.y, fx: b.x, fy: b.y, t: 0 }); HG.saySyl(syl[b.si]); }
}
const bubbleAt = (x, y) => bubbles.filter(b => TK.dist(x, y, b.x, b.y) < b.r + 14 * TK.U).sort((a, c) => a.r - c.r)[0];

TK.input({
  down(p) {
    const b = bubbleAt(p.x, p.y);
    if (b) { popBubble(b); return; }
    const tw = twins.find(t => Math.abs(p.x - t.x) < t.h * 0.3 && p.y > t.yb - t.h);
    if (tw) { tw.hop = 0; sfx.giggle(tw.kind); TK.hearts(tw.x, tw.yb - tw.h); HG.read(tw.kind === 'tino' ? '티노' : '코코'); return; }
    growing.set(p.id, { x: p.x, y: p.y, r: RMIN, h: hue(), t: 0 });
    tone(500, 0, 0.12, 'sine', 0.06, 700);
  },
  move(p) { const g = growing.get(p.id); if (g) { g.x = p.x; g.y = p.y; } },
  up(p) { const g = growing.get(p.id); if (g) { growing.delete(p.id); release(g); } },
  key() { release({ x: rand(TK.W * 0.25, TK.W * 0.75), y: TK.H * 0.6, r: rand(RMAX * 0.6, RMAX * 0.9), h: hue() }); },
});

// ---------- 후~ 불기 (부모 설정에서 켰을 때만, 첫 터치 뒤 마이크 허락을 물음) ----------
let mic = null, blowT = 0, blowG = null;
const micOn = () => { try { return localStorage.getItem('tk-blowmic') === '1'; } catch (e) { return false; } };
function startMic() {
  if (mic || !micOn() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  mic = { pending: true };
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } }).then(st => {
    const ac = TK.audio(); const src = ac.createMediaStreamSource(st), an = ac.createAnalyser(); an.fftSize = 512; src.connect(an);
    mic = { an, buf: new Float32Array(an.fftSize), st };
  }).catch(() => { mic = { denied: true }; });
}
addEventListener('pointerup', startMic, { once: true });
function micLevel() {
  if (!mic || !mic.an) return 0;
  mic.an.getFloatTimeDomainData(mic.buf); let s = 0; for (const v of mic.buf) s += v * v; return Math.sqrt(s / mic.buf.length);
}
document.addEventListener('visibilitychange', () => { if (document.hidden && mic && mic.st) { mic.st.getTracks().forEach(t => t.stop()); mic = null; addEventListener('pointerup', startMic, { once: true }); } });

function update(dt) {
  phaseT += dt;
  twins.forEach(t => { if (t.hop >= 0) { t.hop += dt / 0.5; if (t.hop > 1) t.hop = -1; } });
  // 불기: 소리가 크면 방울이 커지고, 조용해지면 날아감
  const lv = micLevel();
  if (lv > 0.12 && phase === 'play') { blowT += dt; if (blowT > 0.12 && !blowG) blowG = { x: rand(TK.W * 0.25, TK.W * 0.75), y: TK.H * 0.68, r: RMIN, h: hue(), t: 0 }; }
  else { blowT = 0; if (blowG) { release(blowG); blowG = null; } }
  [...growing.values()].concat(blowG ? [blowG] : []).forEach(g => {
    const before = g.r;
    g.r = Math.min(RMAX, g.r + (RMAX - RMIN) * dt / 1.4); g.t += dt;
    if (Math.floor(g.t / 0.18) !== Math.floor((g.t - dt) / 0.18) && g.r < RMAX) tone(420 + g.r * 4, 0, 0.1, 'sine', 0.05);
    if (before < RMAX * 0.6 && g.r >= RMAX * 0.6) TK.spark(g.x, g.y - g.r, [255, 255, 255], 6, 0.5);
  });
  bubbles.forEach(b => { b.age += dt; b.x += (b.vx + Math.sin(b.age * 1.5 + b.ph) * 25 * TK.U) * dt; b.y += b.vy * dt; b.x = clamp(b.x, b.r, TK.W - b.r); });
  bubbles = bubbles.filter(b => b.y > -b.r * 2);   // 놓친 방울의 글자는 다음 방울에 다시 담김(nextSyl)
  // 글자가 이름 칸으로 날아감
  fly.forEach(f => {
    f.t += dt / 0.6; const s = slotPos(f.si), e = TK.ease(f.t);
    f.x = TK.lerp(f.fx, s.x, e); f.y = TK.lerp(f.fy, s.y, e) - Math.sin(Math.PI * clamp(f.t, 0, 1)) * TK.H * 0.08;
    if (f.t >= 1 && !got[f.si]) { got[f.si] = true; TK.spark(s.x, s.y, TK.pick(TK.COLS), 8, 0.7); TK.tone(TK.PENTA[(f.si * 2) % TK.PENTA.length] * 2, 0, 0.3, 'sine', 0.15); }
  });
  fly = fly.filter(f => f.t < 1);
  if (phase === 'play' && got.length && got.every(Boolean)) { phase = 'party'; phaseT = 0; sfx.fanfare(); setTimeout(() => { HG.read(target); TK.wordPop(target, TK.W / 2, TK.H * 0.5); }, 400); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') {
    if (Math.random() < dt * 14) bubbles.push({ x: rand(0, TK.W), y: TK.H + 30, r: rand(RMAX * 0.15, RMAX * 0.4), vy: -rand(90, 160) * TK.U, vx: rand(-20, 20) * TK.U, ph: rand(0, 6.28), h: hue(), si: -1, age: 0 });
    if (phaseT > 4) { phase = 'play'; phaseT = 0; rounds++; bubbles = bubbles.filter(b => b.si < 0); newName(); TK.flash(); sfx.sparkle(); }
  }
}

function drawBubble(x, y, r, h, age, ch) {
  const wob = 1 + Math.sin(age * 5) * 0.03;
  if (ch) HG.drawWord(ctx, ch, x, y + r * 0.05, r * 0.85, { color: '#ff6b3d', outline: 'rgba(255,255,255,.95)' });
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.7, `hsla(${h},90%,75%,.18)`); g.addColorStop(1, `hsla(${(h + 60) % 360},90%,70%,.55)`);
  ell(x, y, r * wob, r / wob); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.04); ctx.strokeStyle = `hsla(${(h + 120) % 360},80%,85%,.9)`; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.75, -2.6, -1.9); ctx.lineWidth = r * 0.08; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
}
function draw() {
  const W = TK.W, H = TK.H, gy = H * 0.74;
  if (!HG.drawBg(ctx, 'bg_sky', 0, 0, W, H, 0.5, 1)) {   // 손그림 하늘·풀밭 (없으면 코드 그림)
  ctx.fillStyle = TK.grad(0, gy, '#8fd4ff', '#e2f5ff'); ctx.fillRect(0, 0, W, gy);
  const sr = Math.min(W, H) * 0.06; ell(W * 0.12, H * 0.1, sr, sr); ctx.fillStyle = '#ffd84a'; ctx.fill();
  for (let k = 0; k < 3; k++) { const x = ((TK.T * 10 * (k + 1) + k * 300) % (W + 300)) - 150, y = H * (0.12 + k * 0.08), s = Math.min(W, H) * 0.05; ctx.fillStyle = 'rgba(255,255,255,.9)'; ell(x, y, s * 1.4, s * 0.7); ctx.fill(); ell(x - s * 0.8, y + s * 0.15, s * 0.8, s * 0.55); ctx.fill(); }
  ctx.fillStyle = TK.grad(gy, H, '#9fdc7c', '#6fbf5a'); ctx.beginPath(); ctx.moveTo(0, gy); ctx.quadraticCurveTo(W * 0.5, gy - H * 0.05, W, gy); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  }
  twins.forEach((t, i) => TK.twin(t.kind, phase === 'party' || t.hop >= 0 ? 'happy' : 'idle', t.x, t.yb - TK.hopY(t.hop, t.h * 0.2) - (phase === 'party' ? TK.bob(i * 1.5, t.h * 0.1, 7) : TK.bob(i * 1.5, t.h * 0.02)), t.h, { face: i ? 'left' : 'right', hop: t.hop }));
  // 이름 칸: 모인 글자는 진하게, 아직이면 연한 빈 칸
  const s = slotSize(), hi = HG.hi(target);
  syl.forEach((ch, i) => {
    const p = slotPos(i), on = got[i];
    TK.rr(p.x - s * 0.55, p.y - s * 0.55, s * 1.1, s * 1.1, s * 0.25); ctx.fillStyle = on ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.35)'; ctx.fill();
    ctx.lineWidth = Math.max(2, s * 0.05); ctx.strokeStyle = on ? '#f0c879' : 'rgba(255,255,255,.7)'; ctx.stroke();
    if (on) HG.drawWord(ctx, ch, p.x, p.y + s * 0.03, s * 0.75, { hi: hi === 'all' || hi === i ? 'all' : -1, outline: 'rgba(0,0,0,0)' });
  });
  if (phase === 'party' && HG.hasPic(target)) { const k = clamp(phaseT / 0.5, 0, 1); ctx.save(); ctx.translate(W / 2, slotPos(0).y - s * 0.7); ctx.scale(TK.back(k), TK.back(k)); HG.drawPic(ctx, target, s * 2.2); ctx.restore(); }
  fly.forEach(f => HG.drawWord(ctx, syl[f.si], f.x, f.y, s * 0.75, { color: '#ff6b3d' }));
  bubbles.forEach(b => drawBubble(b.x, b.y, b.r, b.h, b.age, b.si >= 0 && !got[b.si] ? syl[b.si] : null));
  growing.forEach(g => drawBubble(g.x, g.y, g.r, g.h, g.t, null));
  if (blowG) drawBubble(blowG.x, blowG.y, blowG.r, blowG.h, blowG.t, null);
  TK.drawParts();
}

window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get target() { return target; }, get got() { return got.slice(); }, get bubbles() { return bubbles.length; },
  actions() {
    if (phase !== 'play') return [];
    const b = bubbles.find(b => b.si >= 0 && b.y > b.r && b.age > 0.5);
    if (b) return [{ type: 'tap', x: b.x, y: b.y, wait: 250 }];
    if (bubbles.some(b => b.si >= 0)) return [];
    return [{ type: 'hold', x: rand(TK.W * 0.3, TK.W * 0.7), y: TK.H * rand(0.45, 0.6), ms: 600, wait: 300 }];
  },
};
// 별 시범: 방울이 떠 있으면 톡, 없으면 꾹
window.__demo = () => {
  if (phase !== 'play') return null;
  const b = bubbles.find(b => b.si >= 0 && b.y > b.r);
  return b ? { kind: 'tap', x: b.x, y: b.y, say: '방울을 톡' } : { kind: 'hold', x: TK.W / 2, y: TK.H * 0.5, say: '꾹 누르면 방울이 나와요' };
};
TK.start({ resize: layout, init() { layout(); newName(); }, update, draw });
})();
