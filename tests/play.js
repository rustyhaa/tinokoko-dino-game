// 공통 자동 플레이: 게임이 알려주는 다음 동작(__g.actions)을 실제 마우스/터치로 수행해 한 판을 끝까지 진행
const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'shots') + '/';
const games = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const all = {};
  for (const g of games) {
    for (const cfg of [{ name: 'land', viewport: { width: 1280, height: 720 } }, { name: 'port', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]) {
      const ctx = await b.newContext(cfg); const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await p.goto(`file:///home/user/tinokoko-dino-game/${g}/index.html`); await p.waitForTimeout(1500);
      await p.screenshot({ path: OUT + `${g}_${cfg.name}_1.png` });
      const cdp = cfg.hasTouch ? await ctx.newCDPSession(p) : null;
      const down = async (x, y) => cdp ? cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }) : (await p.mouse.move(x, y), p.mouse.down());
      const move = async (x, y) => cdp ? cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] }) : p.mouse.move(x, y);
      const up = async () => cdp ? cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) : p.mouse.up();
      let steps = 0, sawParty = false, midShot = false; const t0 = Date.now();
      while (Date.now() - t0 < 90000) {
        const st = await p.evaluate(() => ({ rounds: __g.rounds, phase: __g.phase, acts: __g.actions() }));
        if (st.phase === 'party' && !sawParty) { sawParty = true; await p.waitForTimeout(700); await p.screenshot({ path: OUT + `${g}_${cfg.name}_3party.png` }); }
        if (st.rounds >= 1 && st.phase !== 'party') break;
        if (!st.acts.length) { await p.waitForTimeout(200); continue; }
        for (const a of st.acts) {
          steps++;
          if (a.type === 'tap') { await down(a.x, a.y); await p.waitForTimeout(60); await up(); }
          else if (a.type === 'hold') { await down(a.x, a.y); await p.waitForTimeout(a.ms); await up(); }
          else if (a.type === 'path') { await down(a.pts[0].x, a.pts[0].y); for (const q of a.pts.slice(1)) { await move(q.x, q.y); await p.waitForTimeout(16); } await up(); }
          await p.waitForTimeout(a.wait || 150);
        }
        if (steps >= 3 && !midShot) { midShot = true; await p.screenshot({ path: OUT + `${g}_${cfg.name}_2mid.png` }); }
      }
      await p.waitForTimeout(1500);
      await p.screenshot({ path: OUT + `${g}_${cfg.name}_4next.png` });
      const fin = await p.evaluate(() => ({ rounds: __g.rounds, phase: __g.phase }));
      all[`${g}/${cfg.name}`] = { steps, sawParty, ...fin, secs: Math.round((Date.now() - t0) / 1000), audio: await p.evaluate(() => TK.audioState()), errs };
      await ctx.close();
    }
  }
  console.log(JSON.stringify(all, null, 0)); await b.close();
})();
