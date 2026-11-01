const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'shots') + '/';
const URL = 'file:///root/workspace/tinokoko-new-game/index.html';
(async () => {
  const browser = await chromium.launch();
  const res = {};
  for (const cfg of [
    { name: 'desk', viewport: { width: 1280, height: 720 } },
    { name: 'mob', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { name: 'tab', viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true },
  ]) {
    const ctx = await browser.newContext(cfg);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: OUT + 'v2_' + cfg.name + '_1_start.png' });
    const tapAt = (x, y) => cfg.hasTouch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
    // touch drag via CDP
    let dragPops = null;
    if (cfg.hasTouch) {
      await tapAt(5, cfg.viewport.height - 5); // audio unlock tap on empty sand
      const cdp = await ctx.newCDPSession(page);
      const before = await page.evaluate(() => __tk.pops);
      const b = await page.evaluate(() => __tk.bubbles.filter(b => b.grow >= 1).slice(0, 3).map(b => ({ x: b.x, y: b.y })));
      const pts = [{ x: 10, y: b[0].y }, ...b];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] });
      for (let i = 1; i < pts.length; i++) {
        for (let k = 1; k <= 10; k++) {
          const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 10, y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 10;
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
        }
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      dragPops = (await page.evaluate(() => __tk.pops)) - before;
    }
    for (let k = 0; k < 200; k++) {
      const st = await page.evaluate(() => {
        const need = __tk.flags.map((f, i) => f ? -1 : i).filter(i => i >= 0);
        const b = __tk.bubbles.find(b => b.grow >= 1 && b.y > 30 && need.includes(b.c));
        return { need: need.length, party: __tk.party, b: b && { x: b.x, y: b.y } };
      });
      if (st.need === 0 || st.party > 0) break;
      if (k === 3) await page.screenshot({ path: OUT + 'v2_' + cfg.name + '_2_mid.png' });
      if (st.b) await tapAt(st.b.x, st.b.y);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(700);
    await page.screenshot({ path: OUT + 'v2_' + cfg.name + '_3_party.png' });
    await page.waitForTimeout(4900);
    await page.screenshot({ path: OUT + 'v2_' + cfg.name + '_4_fade.png' });
    await page.waitForTimeout(2000);
    // 실패 없음 확인: 10초 방치 후에도 방울은 계속 나온다
    await page.waitForTimeout(10000);
    const fin = await page.evaluate(() => ({ party: +__tk.party.toFixed(2), lit: __tk.flags.filter(Boolean).length, parties: __tk.parties, pops: __tk.pops, audio: __tk.audio, bubbles: __tk.bubbles.length }));
    await page.screenshot({ path: OUT + 'v2_' + cfg.name + '_5_idle.png' });
    console.log(cfg.name, JSON.stringify({ dragPops, ...fin, errs }));
    await ctx.close();
  }
  await browser.close();
})();
