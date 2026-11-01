// =====================================================================
// hangul.js — 한글 놀이터 공통 모듈 (모든 게임이 같은 파일을 씀)
//  · 단어 사전 30개 (받침 없는 쉬운 단어 위주) + 그림(코드로 그림)
//  · 자음 14개 획 데이터 (직접 만든 좌표 → 기기마다 모양이 같음, 따라 긋기 순서 그대로)
//  · 글자 그리기 + 음절 하나씩 커지며 읽기 ("나, 비. 나비!")
//  · 음성: 부모가 녹음한 목소리가 있으면 그것으로, 없으면 기기 한국어 음성
//  · 부모 설정(아이 이름·단계·이번 주 글자)과 오늘 본 글자 기록 — 이 기기 브라우저에만 저장
//  게임은 window.H 로 쓴다. 그리기 함수는 ctx 를 받아 엔진(tk.js)이 없어도 동작한다.
// =====================================================================
(function () {
'use strict';
const H = window.H = {};
const SRC = document.currentScript ? document.currentScript.src : location.href;
const SHARED = new URL('.', SRC).href;
const TAU = Math.PI * 2;
H.FONT = '"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic","Nanum Gothic",sans-serif';
const now = () => performance.now() / 1000;

// ---------- 부모 설정 ----------
// stage 1: 듣고 보기 / 2: + 자음 모양 (기본) / 3: + 가나다
const DEF = { names: ['', ''], stage: 2, focus: [] };
H.cfg = () => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem('tk-hangul') || '{}')); } catch (e) { return Object.assign({}, DEF); } };
H.saveCfg = c => { try { localStorage.setItem('tk-hangul', JSON.stringify(c)); } catch (e) {} };

// ---------- 자모 ----------
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const DOUBLE = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
H.cho = s => { const c = (s || '').charCodeAt(0) - 0xAC00; if (!(c >= 0 && c <= 11171)) return ''; const j = CHO[Math.floor(c / 588)]; return DOUBLE[j] || j; };
H.JAMO = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
H.JAMO_NAME = { 'ㄱ': '기역', 'ㄴ': '니은', 'ㄷ': '디귿', 'ㄹ': '리을', 'ㅁ': '미음', 'ㅂ': '비읍', 'ㅅ': '시옷', 'ㅇ': '이응', 'ㅈ': '지읒', 'ㅊ': '치읓', 'ㅋ': '키읔', 'ㅌ': '티읕', 'ㅍ': '피읖', 'ㅎ': '히읗' };
H.GANA = ['가', '나', '다', '라', '마', '바', '사'];
const EASY = ['ㄱ', 'ㄴ', 'ㅁ', 'ㅇ'], BASIC = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'];
// 지금 단계에서 쓰는 자음 묶음 (이번 주 글자는 항상 포함)
H.jamoSet = () => { const c = H.cfg(); const base = c.stage <= 1 ? EASY : c.stage === 2 ? BASIC : H.JAMO; return Array.from(new Set([...(c.focus || []), ...base])); };
// 자음 n개 고르기: 이번 주 글자를 먼저
H.pickJamo = n => { const c = H.cfg(), f = (c.focus || []).slice(), rest = shuffle(H.jamoSet().filter(j => !f.includes(j))); return shuffle(f.concat(rest)).sort((a, b) => (f.includes(b) ? 1 : 0) - (f.includes(a) ? 1 : 0)).slice(0, n); };

// 획 데이터: 0~1 상자 안 좌표, 획 순서대로. closed=true 는 동그라미(ㅇ)
const C = (cx, cy, r, n = 12) => Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 - i * TAU / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
H.STROKES = {
  'ㄱ': [[[.15, .18], [.82, .18], [.82, .86]]],
  'ㄴ': [[[.2, .14], [.2, .82], [.86, .82]]],
  'ㄷ': [[[.18, .18], [.82, .18]], [[.18, .18], [.18, .82], [.86, .82]]],
  'ㄹ': [[[.18, .15], [.8, .15], [.8, .48]], [[.2, .48], [.8, .48]], [[.2, .48], [.2, .85], [.86, .85]]],
  'ㅁ': [[[.2, .18], [.2, .85]], [[.2, .18], [.82, .18], [.82, .85]], [[.2, .85], [.82, .85]]],
  'ㅂ': [[[.22, .14], [.22, .86]], [[.78, .14], [.78, .86]], [[.22, .48], [.78, .48]], [[.22, .86], [.78, .86]]],
  'ㅅ': [[[.5, .14], [.14, .86]], [[.5, .42], [.86, .86]]],
  'ㅇ': [Object.assign(C(.5, .52, .34), { closed: true })],
  'ㅈ': [[[.16, .18], [.84, .18]], [[.5, .18], [.14, .86]], [[.5, .46], [.86, .86]]],
  'ㅊ': [[[.5, .04], [.5, .15]], [[.16, .25], [.84, .25]], [[.5, .25], [.14, .9]], [[.5, .5], [.86, .9]]],
  'ㅋ': [[[.15, .18], [.82, .18], [.82, .86]], [[.2, .5], [.8, .5]]],
  'ㅌ': [[[.2, .18], [.82, .18]], [[.2, .5], [.8, .5]], [[.2, .18], [.2, .84], [.86, .84]]],
  'ㅍ': [[[.14, .18], [.86, .18]], [[.36, .18], [.36, .82]], [[.64, .18], [.64, .82]], [[.14, .82], [.86, .82]]],
  'ㅎ': [[[.5, .03], [.5, .13]], [[.16, .23], [.84, .23]], [Object.assign(C(.5, .6, .26), { closed: true })][0]],
};
// 별자리용: 긴 선분 사이에 점을 채운 획 목록 [{pts, closed}]
H.starPoints = j => H.STROKES[j].map(s => {
  if (s.closed) return { pts: s.filter((_, i) => i % 2 === 0), closed: true };   // 동그라미는 점 6개
  const out = [s[0]];
  for (let i = 1; i < s.length; i++) { const a = s[i - 1], b = s[i], k = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.3)); for (let q = 1; q <= k; q++) out.push([a[0] + (b[0] - a[0]) * q / k, a[1] + (b[1] - a[1]) * q / k]); }
  return { pts: out, closed: false };
});
// 자음 그리기: 가운데 (x,y), 상자 크기 size. color 생략 시 칠하지 않음
H.drawJamo = (ctx, j, x, y, size, color, width = 0.17) => {
  ctx.save(); ctx.translate(x - size / 2, y - size / 2);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = size * width; ctx.strokeStyle = color;
  H.STROKES[j].forEach(s => { ctx.beginPath(); s.forEach((p, i) => i ? ctx.lineTo(p[0] * size, p[1] * size) : ctx.moveTo(p[0] * size, p[1] * size)); if (s.closed) ctx.closePath(); ctx.stroke(); });
  ctx.restore();
};

// ---------- 단어 사전 ----------
// cat: name 이름 / animal 동물 / food 먹을 것 / thing 물건·자연. 받침 없는 단어 위주
H.WORDS = [
  ['티노', 'name'], ['코코', 'name'], ['엄마', 'name'], ['아빠', 'name'],
  ['나비', 'animal'], ['토끼', 'animal'], ['개구리', 'animal'], ['해파리', 'animal'], ['게', 'animal'],
  ['오리', 'animal'], ['하마', 'animal'], ['고래', 'animal'], ['사자', 'animal'], ['거미', 'animal'],
  ['사과', 'food'], ['바나나', 'food'], ['포도', 'food'], ['우유', 'food'], ['토마토', 'food'], ['오이', 'food'], ['피자', 'food'], ['치즈', 'food'], ['도토리', 'food'],
  ['모자', 'thing'], ['바지', 'thing'], ['나무', 'thing'], ['해', 'thing'], ['기차', 'thing'], ['라디오', 'thing'], ['지구', 'thing'],
].map(([w, cat]) => ({ w, cat, syl: [...w], cho: H.cho(w) }));
// 아이 이름(부모가 넣은 것)도 단어로
H.words = () => {
  const names = (H.cfg().names || []).map(s => (s || '').trim()).filter(Boolean).slice(0, 2);
  return names.map(w => ({ w, cat: 'name', syl: [...w], cho: H.cho(w), child: true })).concat(H.WORDS);
};
H.word = w => H.words().find(o => o.w === w) || { w, cat: 'thing', syl: [...w], cho: H.cho(w) };
// 단어 n개 고르기: 이번 주 글자로 시작하는 단어는 3배, 아이 이름은 2배 자주
H.pick = (n, o = {}) => {
  const f = H.cfg().focus || [];
  let pool = H.words().filter(x => (!o.cat || [].concat(o.cat).includes(x.cat)) && !(o.exclude || []).includes(x.w) && (!o.pic || H.hasPic(x.w)));
  const out = [];
  while (out.length < n && pool.length) {
    const wts = pool.map(x => (f.includes(x.cho) ? 3 : 1) * (x.child ? 2 : 1));
    let r = Math.random() * wts.reduce((a, b) => a + b, 0), i = 0;
    while (r > wts[i]) r -= wts[i++];
    out.push(pool[i]); pool = pool.filter((_, k) => k !== i);
  }
  return out;
};
H.example = j => { const c = H.WORDS.filter(x => x.cho === j && x.cat !== 'name'); return (c.length ? c : H.WORDS.filter(x => x.cho === j))[0] || { w: '', syl: [] }; };
// 친구 그림 종류 → 이름
H.FRIEND_NAME = { crab: '게', fish: '물고기', starfish: '불가사리', jelly: '해파리', bunny: '토끼', frog: '개구리', chick: '병아리', butterfly: '나비', owl: '부엉이', skystar: '별' };

// ---------- 그림 (밑변 가운데가 원점, 키 h) ----------
const IMG = {};
['tino_jump_v2', 'coco_laugh_v2'].forEach(n => { const im = new Image(); im.src = SHARED + 'assets/' + n + '.png'; IMG[n] = im; });
function sprite(ctx, n, h) { const im = IMG[n]; if (!im.complete || !im.naturalWidth) return; const w = h * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, -w / 2, -h, w, h); }
const PICS = {};
const P = (names, fn) => names.split(' ').forEach(n => PICS[n] = fn);
H.hasPic = w => !!PICS[w];
H.drawPic = (ctx, w, h) => {
  const f = PICS[w] || PICS['*'];
  const s = h / 2, T = now();
  const ell = (x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, .01), Math.max(ry, .01), rot, 0, TAU); };
  const fill = (c) => { ctx.fillStyle = c; ctx.fill(); };
  const eyes = (dx, y, r = s * .1) => { for (const sd of [-1, 1]) { ell(sd * dx, y, r, r * 1.1); fill('#fff'); ell(sd * dx, y + r * .1, r * .55, r * .6); fill('#222'); } };
  const smile = (y, w2) => { ctx.beginPath(); ctx.arc(0, y - w2 * .4, w2, .2 * Math.PI, .8 * Math.PI); ctx.strokeStyle = '#4a2a2a'; ctx.lineWidth = s * .06; ctx.lineCap = 'round'; ctx.stroke(); };
  const star = (x, y, r, c, rot = 0) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); fill(c); ctx.restore(); };
  ctx.save(); f({ ctx, s, h, T, w, ell, fill, eyes, smile, star }); ctx.restore();
};
P('티노', ({ ctx, h }) => sprite(ctx, 'tino_jump_v2', h));
P('코코', ({ ctx, h }) => sprite(ctx, 'coco_laugh_v2', h));
P('엄마 아빠', o => { const { ctx, s, ell, fill, eyes, smile } = o, mom = o.w === '엄마';
  ell(0, -s * .45, s * .75, s * .45); fill(mom ? '#ff9fb8' : '#7fb8ff');                 // 옷
  if (mom) { ell(0, -s * 1.3, s * .72, s * .72); fill('#5a3d2b'); }                       // 긴 머리
  ell(0, -s * 1.25, s * .58, s * .6); fill('#ffd9b8'); eyes(s * .22, -s * 1.3, s * .09); smile(-s * 1.05, s * .14);
  if (!mom) { ctx.beginPath(); ctx.arc(0, -s * 1.3, s * .62, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = s * .2; ctx.strokeStyle = '#3a2a20'; ctx.stroke();
    ctx.strokeStyle = '#333'; ctx.lineWidth = s * .05; for (const sd of [-1, 1]) { ell(sd * s * .22, -s * 1.3, s * .15, s * .13); ctx.stroke(); } } });
P('나비', ({ ctx, s, T, ell, fill, eyes }) => { const f = .7 + .3 * Math.abs(Math.sin(T * 9)); for (const sd of [-1, 1]) { ell(sd * s * .5 * f, -s * 1.25, s * .5 * f, s * .45); fill(sd < 0 ? '#ff8fd0' : '#8fb8ff'); ell(sd * s * .4 * f, -s * .65, s * .35 * f, s * .3); ctx.fill(); } ell(0, -s, s * .1, s * .6); fill('#5a3d2b'); eyes(s * .06, -s * 1.5, s * .06); });
P('토끼', ({ s, ell, fill, eyes, smile }) => { for (const sd of [-1, 1]) { ell(sd * s * .28, -s * 1.75, s * .18, s * .5, sd * .15); fill('#fff'); ell(sd * s * .28, -s * 1.75, s * .08, s * .35, sd * .15); fill('#ffc0cf'); } ell(0, -s * .9, s * .65, s * .6); fill('#fff'); eyes(s * .25, -s, s * .1); ell(0, -s * .8, s * .07, s * .05); fill('#ff8fa3'); smile(-s * .65, s * .12); });
P('개구리', ({ ctx, s, ell, fill, eyes }) => { for (const sd of [-1, 1]) { ell(sd * s * .4, -s * 1.35, s * .28, s * .28); fill('#5fc46a'); } ell(0, -s * .75, s * .85, s * .6); fill('#5fc46a'); eyes(s * .4, -s * 1.35, s * .15); ctx.beginPath(); ctx.arc(0, -s * .85, s * .45, .15 * Math.PI, .85 * Math.PI); ctx.strokeStyle = '#2f7a3a'; ctx.lineWidth = s * .07; ctx.stroke(); });
P('해파리', ({ ctx, s, T, fill, eyes, smile }) => { ctx.strokeStyle = 'rgba(190,140,255,.9)'; ctx.lineWidth = s * .12; ctx.lineCap = 'round'; for (let k = -1.5; k <= 1.5; k++) { ctx.beginPath(); ctx.moveTo(k * s * .3, -s * .8); ctx.quadraticCurveTo(k * s * .3 + Math.sin(T * 6 + k) * s * .25, -s * .4, k * s * .3, 0); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, -s * .8, s * .75, Math.PI, TAU); ctx.closePath(); fill('rgba(205,160,255,.95)'); eyes(s * .25, -s * 1.15, s * .1); smile(-s * .95, s * .12); });
P('게', ({ ctx, s, ell, fill, eyes, smile }) => { ctx.strokeStyle = '#d9483b'; ctx.lineWidth = s * .12; ctx.lineCap = 'round'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * .5, -s * .9); ctx.lineTo(sd * s * .9, -s * 1.5); ctx.stroke(); ell(sd * s * .95, -s * 1.65, s * .3, s * .22, sd * .6); fill('#ef5a4c'); } ell(0, -s * .7, s * .85, s * .6); fill('#ef5a4c'); eyes(s * .32, -s * .85); smile(-s * .45, s * .2); });
P('오리', ({ ctx, s, ell, fill, eyes }) => { ell(0, -s * .55, s * .8, s * .5); fill('#ffd84a'); ell(-s * .35, -s * 1.25, s * .45, s * .45); fill('#ffd84a'); ctx.beginPath(); ctx.moveTo(-s * .75, -s * 1.25); ctx.lineTo(-s * 1.15, -s * 1.12); ctx.lineTo(-s * .75, -s * 1.02); fill('#ff9a3c'); ell(-s * .45, -s * 1.35, s * .08, s * .09); fill('#222'); ell(s * .5, -s * .7, s * .3, s * .18, -.4); fill('#f2c230'); });
P('하마', ({ s, ell, fill, eyes }) => { ell(0, -s * .55, s * .9, s * .55); fill('#a99bd6'); ell(0, -s * 1.15, s * .7, s * .55); fill('#b8abe3'); ell(0, -s * .95, s * .6, s * .35); fill('#c9bff0'); for (const sd of [-1, 1]) { ell(sd * s * .2, -s * .95, s * .07, s * .09); fill('#6d5fa0'); ell(sd * s * .5, -s * 1.62, s * .14, s * .12); fill('#a99bd6'); } eyes(s * .28, -s * 1.38, s * .1); });
P('고래', ({ ctx, s, T, ell, fill, eyes, smile }) => { ctx.beginPath(); ctx.moveTo(s * .7, -s * .7); ctx.quadraticCurveTo(s * 1.1, -s * 1.1 - Math.sin(T * 3) * s * .1, s * 1.15, -s * 1.3); ctx.lineTo(s * .95, -s * .75); fill('#4a86d9'); ell(-s * .1, -s * .7, s * .9, s * .6); fill('#5b9bf0'); ell(-s * .2, -s * .5, s * .6, s * .3); fill('#cfe4ff'); eyes(s * .2, -s * .85, s * .09); smile(-s * .55, s * .14); for (let k = -1; k <= 1; k++) { ell(-s * .4 + k * s * .12, -s * 1.5 - Math.abs(k) * s * .1, s * .06, s * .12); fill('#9fd0ff'); } });
P('사자', ({ s, ell, fill, eyes, smile }) => { for (let k = 0; k < 12; k++) { const a = k * TAU / 12; ell(Math.cos(a) * s * .62, -s * 1.05 + Math.sin(a) * s * .62, s * .3, s * .3); fill('#d9822b'); } ell(0, -s * 1.05, s * .6, s * .6); fill('#ffc85a'); eyes(s * .22, -s * 1.15, s * .09); ell(0, -s * .95, s * .1, s * .07); fill('#7a4a20'); smile(-s * .78, s * .14); ell(0, -s * .2, s * .5, s * .25); fill('#ffc85a'); });
P('거미', ({ ctx, s, ell, fill, eyes, smile }) => { ctx.strokeStyle = '#333'; ctx.lineWidth = s * .08; ctx.lineCap = 'round'; for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sd * s * .4, -s * .9 + k * s * .15); ctx.quadraticCurveTo(sd * s * 1.0, -s * 1.3 + k * s * .3, sd * s * 1.1, -s * .2 + k * s * .1); ctx.stroke(); } ell(0, -s * .85, s * .55, s * .55); fill('#555'); eyes(s * .2, -s * .95, s * .12); smile(-s * .65, s * .14); });
P('사과', ({ ctx, s, ell, fill, eyes }) => { ctx.fillStyle = '#8a5a33'; ctx.fillRect(-s * .05, -s * 1.85, s * .1, s * .35); ell(s * .25, -s * 1.75, s * .25, s * .12, -.5); fill('#5fbf5a'); ell(-s * .33, -s * .85, s * .58, s * .7); fill('#ff5a5f'); ell(s * .33, -s * .85, s * .58, s * .7); fill('#ff5a5f'); eyes(s * .2, -s * .9, s * .08); });
P('바나나', ({ ctx, s, fill }) => { ctx.beginPath(); ctx.moveTo(-s * .9, -s * 1.3); ctx.quadraticCurveTo(-s * .5, -s * .1, s * .9, -s * .5); ctx.quadraticCurveTo(-s * .2, -s * .45, -s * .7, -s * 1.4); ctx.closePath(); fill('#ffd84a'); ctx.fillStyle = '#7a5a20'; ctx.fillRect(-s * .95, -s * 1.5, s * .15, s * .2); });
P('포도', ({ ctx, s, ell, fill }) => { [[0, -1.3], [-.3, -1.3], [.3, -1.3], [-.15, -1], [.15, -1], [-.45, -1], [.45, -1], [0, -.7], [-.3, -.7], [.3, -.7], [0, -.4]].forEach(([x, y]) => { ell(x * s, y * s, s * .2, s * .2); fill('#8a5ad9'); }); ctx.fillStyle = '#6b8a3a'; ctx.fillRect(-s * .04, -s * 1.75, s * .08, s * .3); ell(s * .25, -s * 1.65, s * .22, s * .1, -.3); fill('#5fbf5a'); });
P('우유', ({ ctx, s, fill }) => { ctx.fillStyle = '#fff'; ctx.fillRect(-s * .5, -s * 1.5, s * 1.0, s * 1.5); ctx.strokeStyle = '#9ac4f0'; ctx.lineWidth = s * .05; ctx.strokeRect(-s * .5, -s * 1.5, s * 1.0, s * 1.5); ctx.beginPath(); ctx.moveTo(-s * .5, -s * 1.5); ctx.lineTo(0, -s * 1.95); ctx.lineTo(s * .5, -s * 1.5); ctx.closePath(); fill('#cfe4ff'); ctx.stroke(); ctx.fillStyle = '#5b9bf0'; ctx.fillRect(-s * .5, -s * .9, s * 1.0, s * .3); });
P('토마토', ({ s, ell, fill, star, eyes }) => { ell(0, -s * .75, s * .8, s * .72); fill('#ff4b3e'); star(0, -s * 1.42, s * .32, '#3f9a45'); eyes(s * .22, -s * .8, s * .08); });
P('오이', ({ ctx, s, fill, ell }) => { ctx.save(); ctx.rotate(-.5); ell(0, -s * .8, s * .35, s * 1.0); fill('#4fae55'); for (let k = 0; k < 5; k++) { ell(0, -s * 1.5 + k * s * .35, s * .05, s * .05); fill('#c9f0b8'); } ctx.restore(); });
P('피자', ({ ctx, s, ell, fill }) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * .8, -s * 1.7); ctx.quadraticCurveTo(0, -s * 2.0, s * .8, -s * 1.7); ctx.closePath(); fill('#ffd36b'); ctx.beginPath(); ctx.moveTo(-s * .8, -s * 1.7); ctx.quadraticCurveTo(0, -s * 2.0, s * .8, -s * 1.7); ctx.lineWidth = s * .18; ctx.strokeStyle = '#d9934a'; ctx.stroke(); [[-.2, -1.3], [.2, -1.1], [0, -.7], [-.25, -.85]].forEach(([x, y]) => { ell(x * s, y * s, s * .12, s * .12); fill('#ff5a5f'); }); });
P('치즈', ({ ctx, s, ell, fill }) => { ctx.beginPath(); ctx.moveTo(-s * .9, 0); ctx.lineTo(s * .9, 0); ctx.lineTo(s * .9, -s * .9); ctx.lineTo(-s * .9, -s * .5); ctx.closePath(); fill('#ffd84a'); ctx.beginPath(); ctx.moveTo(-s * .9, -s * .5); ctx.lineTo(s * .9, -s * .9); ctx.lineTo(s * .2, -s * 1.3); ctx.closePath(); fill('#ffe680'); [[-.4, -.25], [.3, -.4], [.6, -.15]].forEach(([x, y]) => { ell(x * s, y * s, s * .12, s * .1); fill('#e8b820'); }); });
P('도토리', ({ ctx, s, ell, fill }) => { ell(0, -s * .7, s * .55, s * .7); fill('#c98a4a'); ctx.beginPath(); ctx.ellipse(0, -s * 1.15, s * .62, s * .38, 0, Math.PI, TAU); ctx.closePath(); fill('#8a5a33'); ctx.fillStyle = '#5a3d2b'; ctx.fillRect(-s * .05, -s * 1.7, s * .1, s * .25); });
P('모자', ({ ctx, s, ell, fill }) => { ell(0, -s * .25, s * .95, s * .22); fill('#e9644f'); ctx.beginPath(); ctx.ellipse(0, -s * .3, s * .58, s * .75, 0, Math.PI, TAU); ctx.closePath(); fill('#ff7a62'); ctx.fillStyle = '#ffd84a'; ctx.fillRect(-s * .58, -s * .55, s * 1.16, s * .18); });
P('바지', ({ ctx, s, fill }) => { ctx.beginPath(); ctx.moveTo(-s * .65, -s * 1.8); ctx.lineTo(s * .65, -s * 1.8); ctx.lineTo(s * .75, 0); ctx.lineTo(s * .12, 0); ctx.lineTo(0, -s * 1.1); ctx.lineTo(-s * .12, 0); ctx.lineTo(-s * .75, 0); ctx.closePath(); fill('#3d7fb8'); ctx.fillStyle = '#2f6496'; ctx.fillRect(-s * .65, -s * 1.8, s * 1.3, s * .2); });
P('나무', ({ ctx, s, ell, fill }) => { ctx.fillStyle = '#9c6b42'; ctx.fillRect(-s * .15, -s * .9, s * .3, s * .9); ell(0, -s * 1.3, s * .8, s * .7); fill('#4fae55'); [[-.3, -1.4], [.3, -1.2], [0, -1.65]].forEach(([x, y]) => { ell(x * s, y * s, s * .09, s * .09); fill('#ff5a5f'); }); });
P('해', ({ ctx, s, T, ell, fill, eyes }) => { for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + T * .5; ctx.save(); ctx.translate(0, -s); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(s * .6, -s * .15); ctx.lineTo(s * .95, 0); ctx.lineTo(s * .6, s * .15); ctx.closePath(); fill('#ff9f43'); ctx.restore(); } ell(0, -s, s * .6, s * .6); fill('#ffd84a'); eyes(s * .2, -s * 1.05, s * .08); });
P('기차', ({ ctx, s, ell, fill }) => { ctx.fillStyle = '#e9504f'; ctx.fillRect(-s * .95, -s * 1.1, s * 1.3, s * .8); ctx.fillStyle = '#3aa7ff'; ctx.fillRect(s * .35, -s * .9, s * .6, s * .6); ctx.fillStyle = '#333'; ctx.fillRect(-s * .7, -s * 1.55, s * .3, s * .45); ctx.fillStyle = '#d8f1ff'; ctx.fillRect(-s * .55, -s * .95, s * .45, s * .3); for (const x of [-.6, 0, .6]) { ell(x * s, -s * .22, s * .22, s * .22); fill('#444'); } ell(-s * .55, -s * 1.75, s * .15, s * .1); fill('rgba(200,200,200,.8)'); });
P('라디오', ({ ctx, s, ell, fill }) => { ctx.fillStyle = '#f0a04b'; ctx.fillRect(-s * .9, -s * 1.3, s * 1.8, s * 1.1); ell(-s * .35, -s * .75, s * .35, s * .35); fill('#6b4a2a'); ctx.fillStyle = '#fff3d6'; ctx.fillRect(s * .1, -s * 1.1, s * .6, s * .35); ell(s * .4, -s * .5, s * .1, s * .1); fill('#6b4a2a'); ctx.strokeStyle = '#555'; ctx.lineWidth = s * .05; ctx.beginPath(); ctx.moveTo(s * .5, -s * 1.3); ctx.lineTo(s * .8, -s * 1.85); ctx.stroke(); });
P('지구', ({ ctx, s, ell, fill, eyes, smile }) => { ell(0, -s, s * .85, s * .85); fill('#4aa3e8'); ell(-s * .3, -s * 1.3, s * .32, s * .2, .4); fill('#5fbf5a'); ell(s * .35, -s * .7, s * .3, s * .22, -.3); fill('#5fbf5a'); ell(-s * .2, -s * .55, s * .2, s * .12); fill('#5fbf5a'); eyes(s * .25, -s * 1.05, s * .08); smile(-s * .8, s * .14); });
P('*', ({ s, star }) => { star(0, -s, s * .95, '#ffd84a'); star(0, -s, s * .45, '#fff3b0'); });

// 그림자: 그림을 한 색으로 (모양 맞추기용)
const off = document.createElement('canvas'), octx = off.getContext('2d');
H.drawSil = (ctx, w, x, yb, h, color) => {
  const W2 = Math.ceil(h * 1.6), H2 = Math.ceil(h * 1.15);
  off.width = W2; off.height = H2; octx.clearRect(0, 0, W2, H2);
  octx.save(); octx.translate(W2 / 2, H2 - h * .05); H.drawPic(octx, w, h); octx.restore();
  octx.globalCompositeOperation = 'source-in'; octx.fillStyle = color; octx.fillRect(0, 0, W2, H2); octx.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, x - W2 / 2, yb - H2 + h * .05);
};

// ---------- 글자 그리기 ----------
// 가운데 (x,y)에 단어를 음절별로 그림. hi: 강조할 음절 번호, 'all' 이면 전부 반짝
H.drawWord = (ctx, w, x, y, size, o = {}) => {
  const syl = [...w], gap = size * 1.02, x0 = x - (syl.length - 1) * gap / 2;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  syl.forEach((ch, i) => {
    const on = o.hi === 'all' || o.hi === i, sc = on ? 1.25 : 1;
    ctx.font = `800 ${Math.round(size * sc)}px ${H.FONT}`;
    ctx.lineWidth = Math.max(3, size * .16); ctx.lineJoin = 'round'; ctx.strokeStyle = o.outline || 'rgba(255,255,255,.95)';
    ctx.strokeText(ch, x0 + i * gap, y);
    ctx.fillStyle = on ? (o.hiColor || '#ff6b3d') : (o.color || '#2b3550');
    ctx.fillText(ch, x0 + i * gap, y);
  });
  ctx.restore();
  return syl.length * gap;
};
// 이름표(둥근 카드 위 글자)
H.drawTag = (ctx, w, x, y, size, o = {}) => {
  const n = [...w].length, wd = n * size * 1.02 + size * .7, ht = size * 1.45;
  ctx.save(); ctx.beginPath(); const r = ht / 2; ctx.moveTo(x - wd / 2 + r, y - ht / 2); ctx.arcTo(x + wd / 2, y - ht / 2, x + wd / 2, y + ht / 2, r); ctx.arcTo(x + wd / 2, y + ht / 2, x - wd / 2, y + ht / 2, r); ctx.arcTo(x - wd / 2, y + ht / 2, x - wd / 2, y - ht / 2, r); ctx.arcTo(x - wd / 2, y - ht / 2, x + wd / 2, y - ht / 2, r); ctx.closePath();
  ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; ctx.fill(); ctx.lineWidth = Math.max(2, size * .08); ctx.strokeStyle = o.border || '#f0c879'; ctx.stroke(); ctx.restore();
  H.drawWord(ctx, w, x, y + size * .03, size, Object.assign({ outline: 'rgba(0,0,0,0)' }, o));
};

// ---------- 음성 ----------
const muted = () => (window.TK && TK.muted) || !!(document.getElementById('snd') && document.getElementById('snd').classList.contains('off'));
H.voices = new Map();   // 부모 녹음: 글자 → 재생 주소
let curAudio = null;
function tts(text, rate = 0.92) {
  try {
    const ss = window.speechSynthesis; if (!ss) return;
    ss.cancel(); if (curAudio) { curAudio.pause(); curAudio = null; }
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = rate; u.pitch = 1.3;
    const v = ss.getVoices().find(v => /^ko/i.test(v.lang)); if (v) u.voice = v;
    ss.speak(u);
  } catch (e) {}
}
function play(key) {
  const url = H.voices.get(key); if (!url) return false;
  try { if (window.speechSynthesis) speechSynthesis.cancel(); if (curAudio) curAudio.pause(); curAudio = new Audio(url); curAudio.play().catch(() => {}); return true; } catch (e) { return false; }
}
H.say = (text, key) => { if (muted()) return; if (!play(key || text)) tts(text); };
// 단어 읽기: "나, 비. 나비!" (부모 녹음이 있으면 그 목소리로 단어만)
H.reading = null;
H.read = (w, pre = '') => {
  const syl = [...w];
  H.reading = { w, t0: now(), n: syl.length };
  H.log('w', w);
  if (muted()) return;
  if (play(w)) return;
  tts(pre + (syl.length > 1 ? syl.join(', ') + '. ' + w + '!' : w + '!'), 0.85);
};
// 지금 강조할 음절 (게임이 그릴 때 물어봄)
H.hi = w => {
  const r = H.reading; if (!r || r.w !== w) return -1;
  const t = now() - r.t0, per = 0.55;
  if (t < r.n * per) return Math.floor(t / per);
  if (t < r.n * per + 1.4) return 'all';
  return -1;
};
// 자음 읽기: "기역! 고래의 기역"
H.readJamo = j => {
  H.log('j', j); if (muted()) return;
  if (play(j)) return;
  const ex = H.example(j).w;
  tts(H.JAMO_NAME[j] + '! ' + (ex ? ex + '의 ' + H.JAMO_NAME[j] : ''), 0.9);
};
H.saySyl = s => { H.log('s', s); if (!muted() && !play(s)) tts(s, 0.9); };

// ---------- 부모 녹음 (IndexedDB, 이 기기에만) ----------
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => { try { const r = indexedDB.open('tk-voice', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
  return dbp;
}
const tx = (mode, fn) => db().then(d => new Promise((res, rej) => { const t = d.transaction('clips', mode), st = t.objectStore('clips'); const out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
H.recLoad = () => db().then(d => new Promise(res => { const t = d.transaction('clips', 'readonly'), st = t.objectStore('clips'), req = st.openCursor(); req.onsuccess = () => { const c = req.result; if (c) { H.voices.set(c.key, URL.createObjectURL(c.value)); c.continue(); } else res(H.voices); }; req.onerror = () => res(H.voices); })).catch(() => H.voices);
H.recSave = (key, blob) => tx('readwrite', st => st.put(blob, key)).then(() => { H.voices.set(key, URL.createObjectURL(blob)); });
H.recDel = key => tx('readwrite', st => st.delete(key)).then(() => { H.voices.delete(key); });
H.recLoad();

// ---------- 오늘 본 글자 (부모 화면에서만 보여줌) ----------
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
H.todayLog = () => { try { const v = JSON.parse(localStorage.getItem('tk-hangul-log') || 'null'); return v && v.day === today() ? v : { day: today(), w: {}, j: {}, s: {} }; } catch (e) { return { day: today(), w: {}, j: {}, s: {} }; } };
H.log = (kind, key) => { try { const v = H.todayLog(); v[kind][key] = (v[kind][key] || 0) + 1; localStorage.setItem('tk-hangul-log', JSON.stringify(v)); } catch (e) {} };

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
H.shuffle = shuffle;
})();
