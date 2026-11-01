const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'shots') + '/';
const B = 'http://localhost:8770/';
const GAMES = ['peekaboo', 'rainbow-bubbles', 'bath', 'boat', 'shapes', 'stars', 'garden', 'band', 'blow'];
const DEV = {
  iphoneSE: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  iphone14: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  galaxyS: { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 },
  ipadP: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  ipadL: { viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  galaxyTab: { viewport: { width: 800, height: 1280 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const R = { demo: {}, home: {}, sleep: {}, hub: {}, pwa: {}, errs: [] };
(async () => {
  const b = await chromium.launch();
  const page = async (dev) => { const ctx = await b.newContext(DEV[dev]); const p = await ctx.newPage(); p.on('pageerror', e => R.errs.push(dev + ': ' + e)); return { ctx, p }; };
  // 1) 9개 게임 × 기기 6종: 별 시범이 뜨는지, 집 버튼 위치·크기, 레이아웃 스크린샷
  for (const dev of Object.keys(DEV)) {
    const { ctx, p } = await page(dev);
    for (const g of GAMES) {
      await p.goto(B + g + '/');
      let seen = null; const t0 = Date.now();
      while (Date.now() - t0 < 5000) { const s = await p.evaluate(() => window.__frame && __frame.demoSay); if (s) { seen = s; break; } await p.waitForTimeout(150); }
      if (dev === 'iphone14' || dev === 'ipadL') { await p.waitForTimeout(500); await p.screenshot({ path: OUT + `fr_${dev}_${g}.png` }); }
      const hb = await p.evaluate(() => { const r = document.getElementById('tkhome').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; });
      R.demo[`${dev}/${g}`] = (seen || 'NONE') + ` home@${hb.join(',')}`;
    }
    await ctx.close();
  }
  // 2) 집 버튼: 톡 방식으로 바뀌어 home_test.js 에서 따로 확인
  // 3) 잘 시간: 잠듦 → 게임 멈춤·입력 무시 → 해 버튼 1초 꾹으로 깨움
  for (const [dev, g] of [['ipadL', 'peekaboo'], ['iphone14', 'rainbow-bubbles'], ['galaxyTab', 'bath']]) {
    const { ctx, p } = await page(dev); const cdp = await ctx.newCDPSession(p);
    await p.goto(B + g + '/'); await p.evaluate(() => localStorage.setItem('tk-sleep', JSON.stringify({ min: 10, until: Date.now() - 1000 })));
    await p.reload(); await p.waitForTimeout(3500);
    const sleeping = await p.evaluate(() => __frame.sleeping);
    await p.screenshot({ path: OUT + `fr_sleep_${g}.png` });
    const snap = () => p.evaluate(() => window.__pk ? __pk.objs.map(o => o.st).join() : window.__tk ? __tk.pops : window.__g ? __g.phase + __g.rounds + JSON.stringify(__g.spots.map(s => s.d)) : '');
    const before = await snap();
    const cx = DEV[dev].viewport.width / 2, cy = DEV[dev].viewport.height * 0.55;
    for (let i = 0; i < 4; i++) { await p.touchscreen.tap(cx + i * 30, cy); await p.waitForTimeout(150); }
    await p.keyboard.press('a'); await p.waitForTimeout(300);
    const unchanged = (await snap()) === before;
    const sun = await p.evaluate(() => { const r = document.getElementById('tksun').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.touchscreen.tap(sun.x, sun.y); await p.waitForTimeout(400);
    const stillAfterTap = await p.evaluate(() => __frame.sleeping);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...sun, id: 9 }] }); await p.waitForTimeout(1250);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(800);
    R.sleep[`${dev}/${g}`] = { sleeping, gameFrozen: unchanged, sunTapNoWake: stillAfterTap, wokeAfterHold: !(await p.evaluate(() => __frame.sleeping)), cleared: await p.evaluate(() => localStorage.getItem('tk-sleep') === null) };
    await ctx.close();
  }
  // 4) 놀이터 화면: 도움말, 잘 시간 설정
  for (const dev of ['iphoneSE', 'ipadP']) {
    const { ctx, p } = await page(dev);
    await p.goto(B + 'games/'); await p.waitForTimeout(800);
    await p.click('.help >> nth=2'); await p.click('#sleepSeg button[data-min="20"]');
    await p.screenshot({ path: OUT + `fr_hub_${dev}.png`, fullPage: true });
    const sx = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    R.hub[dev] = { tipOpen: await p.evaluate(() => !document.querySelectorAll('.tip')[2].hidden), sleepSaved: await p.evaluate(() => JSON.parse(localStorage.getItem('tk-sleep')).min), stateText: await p.textContent('#sleepState'), noSideScroll: sx };
    await ctx.close();
  }
  // 5) 앱 하나·오프라인·예전 게임별 등록 정리
  {
    const { ctx, p } = await page('ipadL');
    await p.goto(B + 'bath/'); await p.waitForTimeout(400);
    await p.evaluate(() => navigator.serviceWorker.register('sw.js', { scope: './' }));   // 예전처럼 게임 폴더에 따로 등록된 상태를 흉내
    await p.waitForTimeout(800);
    R.pwa.oldRegBefore = await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => r.scope.replace(location.origin, '')));
    await p.goto(B + 'games/'); await p.waitForTimeout(500);
    R.pwa.rootActive = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.scope.replace(location.origin, '') + ' ' + !!r.active; });
    await p.goto(B + 'bath/'); await p.waitForTimeout(1500);
    R.pwa.regsAfter = await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => r.scope.replace(location.origin, '')));
    R.pwa.manifest = await p.evaluate(async () => { const j = await (await fetch('../games/manifest.webmanifest')).json(); return j.name + '|' + j.start_url + '|' + j.scope + '|' + j.display; });
    await ctx.setOffline(true);
    for (const g of GAMES.concat(['games'])) {
      const ok = await p.goto(B + g + '/').then(r => r && r.ok()).catch(() => false); await p.waitForTimeout(700);
      const sprites = await p.evaluate(async () => { let n = 0; for (const s of ['tino_run_v2', 'coco_laugh_v2']) { const r = await fetch('../shared/assets/' + s + '.png').catch(() => null); if (r && r.ok) n++; } return n; });
      R.pwa['offline/' + g] = ok + ' sprites:' + sprites;
    }
    await ctx.close();
  }
  console.log(JSON.stringify(R, null, 1)); await b.close();
})();
