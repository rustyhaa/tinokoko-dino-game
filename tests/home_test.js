const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'shots') + '/';
const B = 'http://localhost:8772/';
(async () => {
  const b = await chromium.launch(); const R = {};
  for (const [name, dev] of [['runnerPhone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ['runnerTab', { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(dev); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(B); await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + `home_${name}.png` });
    const hb = await p.evaluate(() => { const r = document.getElementById('tkhome').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
    // 화면 위 다른 요소(점수 등)에 가려지는지
    R[name + 'homeTopEl'] = await p.evaluate(() => { const r = document.getElementById('tkhome').getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el && el.id || el && el.tagName; });
    // 게임 입력 누수 확인: 집 버튼 톡이 점프 상태를 바꾸지 않는지 (러너는 캔버스 포인터로 점프)
    await p.touchscreen.tap(hb.x, hb.y);
    await p.waitForURL(/\/games\/$/, { timeout: 4000 }).then(() => R[name + 'tapHome'] = 'games').catch(async () => { R[name + 'tapHome'] = 'stayed ' + p.url(); });
    R[name + 'errs'] = errs; await ctx.close();
  }
  // 러너 기본 조작이 그대로인지: 탭으로 게임 시작/점프가 에러 없이 동작
  {
    const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(B); await p.waitForTimeout(1200);
    await p.keyboard.press('Space'); await p.waitForTimeout(400); await p.mouse.click(500, 400); await p.waitForTimeout(400);
    await p.screenshot({ path: OUT + 'home_runner_play.png' });
    R.runnerKeysOk = errs.length === 0; R.runnerErrs = errs; await ctx.close();
  }
  // 놀이터에서 게임 하나 들어가 집 버튼 확인 (게임 폴더 경로도 정상인지)
  {
    const ctx = await b.newContext({ viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(B + 'bath/'); await p.waitForTimeout(1400);
    const hb = await p.evaluate(() => { const r = document.getElementById('tkhome').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.touchscreen.tap(hb.x, hb.y); await p.waitForURL(/\/games\/$/, { timeout: 4000 }).then(() => R.bathTapHome = 'games').catch(() => R.bathTapHome = 'stayed');
    R.bathErrs = errs; await ctx.close();
  }
  console.log(JSON.stringify(R)); await b.close();
})();
