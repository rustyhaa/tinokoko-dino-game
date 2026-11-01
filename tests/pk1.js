const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'shots') + '/';
const URL = 'file:///home/user/tinokoko-dino-game/peekaboo/index.html';
(async () => {
  const b = await chromium.launch(); const R = {};
  for (const cfg of [{ name: 'land', viewport: { width: 1280, height: 720 } }, { name: 'port', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]) {
    const ctx = await b.newContext(cfg); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const tap = (x, y) => cfg.hasTouch ? p.touchscreen.tap(x, y) : p.mouse.click(x, y);
    await p.goto(URL); await p.waitForTimeout(700);
    await p.screenshot({ path: OUT + `pk_${cfg.name}_1_intro.png` });
    await p.waitForTimeout(1700);
    await p.screenshot({ path: OUT + `pk_${cfg.name}_2_play.png` });
    const r = { phase: await p.evaluate(() => __pk.phase), scene: await p.evaluate(() => __pk.scene) };
    // 친구 하나 열기
    const fr = await p.evaluate(() => { const o = __pk.objs.find(o => o.content !== 'tino' && o.content !== 'coco'); return { x: o.x, y: o.y - o.s * 0.6, c: o.content }; });
    await tap(fr.x, fr.y); await p.waitForTimeout(450);
    await p.screenshot({ path: OUT + `pk_${cfg.name}_3_friend.png` });
    r.friendOpened = await p.evaluate(() => __pk.objs.filter(o => o.st === 'hold').map(o => o.content));
    await p.waitForTimeout(2200);
    r.friendClosedAgain = await p.evaluate(() => __pk.objs.every(o => o.content === 'tino' || o.content === 'coco' || o.st === 'idle'));
    // 힌트
    await p.evaluate(() => __pk.hintNow()); await p.waitForTimeout(1200);
    await p.screenshot({ path: OUT + `pk_${cfg.name}_4_hint.png` });
    // 티노 찾기
    const tn = await p.evaluate(() => { const o = __pk.objs.find(o => o.content === 'tino'); return { x: o.x, y: o.y - o.s * 0.6 }; });
    await tap(tn.x, tn.y); await p.waitForTimeout(700);
    r.foundAfterTino = await p.evaluate(() => __pk.found);
    await p.screenshot({ path: OUT + `pk_${cfg.name}_5_tino.png` });
    const cc = await p.evaluate(() => { const o = __pk.objs.find(o => o.content === 'coco'); return { x: o.x, y: o.y - o.s * 0.6 }; });
    await tap(cc.x, cc.y); await p.waitForTimeout(1200);
    r.phaseAfterBoth = await p.evaluate(() => __pk.phase);
    await p.screenshot({ path: OUT + `pk_${cfg.name}_6_party.png` });
    await p.waitForTimeout(3600);
    r.sceneNext = await p.evaluate(() => __pk.scene + '/' + __pk.phase);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: OUT + `pk_${cfg.name}_7_next.png` });
    // 세 번째 장면까지
    for (let k = 0; k < 2; k++) {
      await p.waitForTimeout(300);
      for (const who of ['tino', 'coco']) { const q = await p.evaluate(w => { const o = __pk.objs.find(o => o.content === w); return { x: o.x, y: o.y - o.s * 0.6 }; }, who); await tap(q.x, q.y); await p.waitForTimeout(600); }
      if (k === 0) { await p.waitForTimeout(4600); await p.waitForTimeout(2300); await p.screenshot({ path: OUT + `pk_${cfg.name}_8_night.png` }); r.third = await p.evaluate(() => __pk.scene); }
      else { await p.waitForTimeout(7000); r.loopBack = await p.evaluate(() => __pk.scene); }
    }
    // 키보드
    if (!cfg.hasTouch) { await p.waitForTimeout(500); for (let i = 0; i < 8; i++) { await p.keyboard.press('a'); await p.waitForTimeout(400); } r.keyboardOpened = await p.evaluate(() => __pk.objs.filter(o => o.st !== 'idle').length); }
    r.audio = await p.evaluate(() => __pk.audio); r.errs = errs; R[cfg.name] = r; await ctx.close();
  }
  console.log(JSON.stringify(R)); await b.close();
})();
