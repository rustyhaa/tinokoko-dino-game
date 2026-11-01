const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'shots') + '/';
const U = g => `file:///home/user/tinokoko-dino-game/${g}/index.html`;
(async () => {
  const b = await chromium.launch(); const R = {};
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const tapLoop = async (until, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { const st = await p.evaluate(() => ({ r: __g.rounds, ph: __g.phase, a: __g.actions() })); if (await p.evaluate(until)) return true; for (const a of st.a) { if (a.type === 'tap') await p.touchscreen.tap(a.x, a.y); await p.waitForTimeout(a.wait || 120); } if (!st.a.length) await p.waitForTimeout(150); } return false; };
  // 별자리: 세 번째 판이 고래 별자리
  await p.goto(U('stars')); await p.waitForTimeout(800);
  await tapLoop(() => __g.rounds >= 2 && __g.phase === 'play', 40000);
  R.thirdIsFig = await p.evaluate(() => __g.jamo === null);
  await tapLoop(() => __g.phase === 'party', 20000); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + 'fav_stars.png' });
  // 정원: 공룡알이 있는 판, 다 키우기
  await p.goto(U('garden')); await p.waitForTimeout(800);
  await p.evaluate(() => { for (let i = 0; i < 2; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); });
  await p.waitForTimeout(300);
  for (let i = 0; i < 9; i++) { const a = await p.evaluate(() => __g.actions()); if (a[0]) await p.touchscreen.tap(a[0].x, a[0].y); await p.waitForTimeout(170); }
  await p.screenshot({ path: OUT + 'fav_garden_mid.png' });
  await tapLoop(() => __g.phase === 'harvest', 20000);
  await p.screenshot({ path: OUT + 'fav_garden_done.png' });
  // 목욕: 장난감 고래 누르기
  await p.goto(U('bath')); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + 'fav_bath.png' });
  // 실로폰: 첫 친구가 공룡
  await p.goto(U('band')); await p.waitForTimeout(600);
  await tapLoop(() => __g.band >= 2, 20000); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + 'fav_band.png' });
  // 단어 빈도: 좋아하는 것 켜짐/꺼짐 비교
  R.favOn = await p.evaluate(() => { let n = 0; for (let i = 0; i < 500; i++) if (H.favWords().includes(H.pick(1, { cat: 'animal' })[0].w)) n++; return n; });
  await p.evaluate(() => { const c = H.cfg(); c.fav = []; H.saveCfg(c); });
  R.favOff = await p.evaluate(() => { let n = 0; for (let i = 0; i < 500; i++) if (['공룡', '티라노', '고래', '범고래'].includes(H.pick(1, { cat: 'animal' })[0].w)) n++; return n; });
  R.exampleG = await p.evaluate(() => { const c = H.cfg(); c.fav = ['공룡', '고래']; H.saveCfg(c); return [H.example('ㄱ').w, H.example('ㅂ').w, H.example('ㅌ').w]; });
  R.errs = errs; console.log(JSON.stringify(R)); await b.close();
})();
