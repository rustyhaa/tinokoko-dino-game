const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'shots') + '/';
const B = 'http://localhost:8770/';
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, permissions: ['microphone'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const R = {};
  await p.goto(B + 'games/'); await p.waitForTimeout(800);
  // 1) 아이 이름, 단계, 이번 주 글자
  await p.fill('#name0', '하늘'); await p.fill('#name1', '바다');
  await p.click('#stageSeg button[data-v="1"]');
  await p.click('#focusSeg button[data-v="ㅎ"]'); await p.click('#focusSeg button[data-v="ㅂ"]');
  R.cfg = await p.evaluate(() => localStorage.getItem('tk-hangul'));
  // 2) 녹음 (가짜 마이크): '하늘' 선택 → 녹음 → 자동 정지
  await p.click('#voiceBox summary');
  await p.selectOption('#recKey', '하늘');
  await p.click('#recBtn'); await p.waitForTimeout(3600);
  R.recState = await p.textContent('#recState');
  R.voicesHub = await p.evaluate(() => Array.from(H.voices.keys()));
  await p.screenshot({ path: OUT + 'hg_hub.png', fullPage: true });
  // 3) 1단계: 자음 짝꿍은 그림 모드, 별자리는 쉬운 자음만
  await p.goto(B + 'shapes/'); await p.waitForTimeout(1200);
  R.shapesStage1 = await p.evaluate(() => __g.mode);
  await p.screenshot({ path: OUT + 'hg_shapes_word.png' });
  await p.goto(B + 'stars/'); await p.waitForTimeout(800);
  const js = []; for (let i = 0; i < 6; i++) { js.push(await p.evaluate(() => __g.jamo)); await p.evaluate(() => { for (let k = 0; k < 40; k++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); }); await p.waitForTimeout(80); }
  R.starsJamoStage1 = await p.evaluate(() => H.jamoSet());
  // 4) 이름 방울: 아이 이름이 단어로 나오는지, 녹음이 게임에서도 보이는지
  await p.goto(B + 'blow/'); await p.waitForTimeout(1500);
  R.wordsHasChild = await p.evaluate(() => H.words().filter(w => w.child).map(w => w.w));
  R.voicesInGame = await p.evaluate(() => Array.from(H.voices.keys()));
  R.focusPick = await p.evaluate(() => { const c = {}; for (let i = 0; i < 300; i++) H.pick(1).forEach(o => c[o.cho] = (c[o.cho] || 0) + 1); return c; });
  // 5) 3단계: 실로폰 가나다, 자음 짝꿍 자음 모드
  await p.goto(B + 'games/'); await p.click('#stageSeg button[data-v="3"]');
  await p.goto(B + 'band/'); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + 'hg_band_gana.png' });
  await p.goto(B + 'shapes/'); await p.waitForTimeout(1200);
  R.shapesStage3 = await p.evaluate(() => __g.mode);
  // 6) 오늘 본 글자 기록
  await p.goto(B + 'games/'); await p.click('#todayBox summary'); await p.waitForTimeout(300);
  R.today = (await p.textContent('#todayList')).slice(0, 160);
  R.errs = errs;
  console.log(JSON.stringify(R, null, 1));
  await b.close();
})();
