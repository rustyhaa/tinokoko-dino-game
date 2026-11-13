// 리뉴얼 확인: 놀이터 지도·부모 화면, 공룡·고래 만나기(숲·바다) — 세로 360x740, 가로 800x400
//  저장소 루트에서 서버를 먼저: python3 -m http.server 8090
//  실행: node docs/renewal/smoke.js   (스크린샷은 docs/renewal/shots/)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const B = process.env.BASE || 'http://localhost:8090/';
const OUT = path.join(__dirname, 'shots') + '/';
fs.mkdirSync(OUT, { recursive: true });
const VIEWS = [{ name: 'port', viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }, { name: 'land', viewport: { width: 800, height: 400 }, isMobile: true, hasTouch: true }];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const R = {};
  for (const v of VIEWS) {
    // ---------- 1) 놀이터 지도 ----------
    {
      const ctx = await b.newContext(v); const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(String(e)));
      await p.goto(B + 'games/'); await p.waitForTimeout(1200);
      await p.screenshot({ path: OUT + `hub_map_${v.name}.png` });
      const places = await p.evaluate(() => Array.from(document.querySelectorAll('.place')).map(a => { const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top), off: a.classList.contains('off') }; }));
      const minSide = Math.min(...places.map(q => Math.min(q.w, q.h)));
      const inView = places.every(q => q.x >= -2 && q.y >= -2 && q.x + q.w <= v.viewport.width + 2 && q.y + q.h <= v.viewport.height + 2);
      // 짧게 톱니 톡: 부모 화면이 열리면 안 됨
      const g = await p.evaluate(() => { const r = document.getElementById('gear').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.waitForTimeout(200); await p.mouse.up(); await p.waitForTimeout(300);
      const shortOpened = await p.evaluate(() => !document.getElementById('parent').hidden);
      // 책상(꺼짐) 톡: 이동하면 안 됨
      const desk = places.find(q => q.href === '../stars/');
      await p.mouse.click(desk.x + desk.w / 2, desk.y + desk.h / 2); await p.waitForTimeout(700);
      const stayedOnDesk = p.url().endsWith('/games/');
      // 1초 꾹: 부모 화면
      await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.waitForTimeout(500);
      await p.screenshot({ path: OUT + `hub_gear_hold_${v.name}.png` });
      await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(300);
      const longOpened = await p.evaluate(() => !document.getElementById('parent').hidden);
      await p.screenshot({ path: OUT + `hub_parent_${v.name}.png` });
      // 책상 켜기 → 저장 확인 → 지도로
      await p.click('#deskSeg button[data-v="1"]');
      const deskCfg = await p.evaluate(() => JSON.parse(localStorage.getItem('tk-hangul') || '{}').desk);
      await p.click('#more summary'); await p.click('#old summary'); await p.waitForTimeout(200);
      await p.screenshot({ path: OUT + `hub_parent_full_${v.name}.png`, fullPage: true });
      const moreKeys = await p.evaluate(() => [localStorage.getItem('tk-more'), localStorage.getItem('tk-old')]);
      const ids = await p.evaluate(() => ['name0', 'name1', 'favSeg', 'stageSeg', 'stageNote', 'focusSeg', 'deskSeg', 'voiceBox', 'recKey', 'recBtn', 'playBtn', 'delBtn', 'recState', 'ttsBtn', 'ttsState', 'weekBox', 'weekList', 'todayBox', 'todayList', 'bday', 'bdayClear', 'seasonSeg', 'musicSeg', 'blowSeg', 'sleepSeg', 'sleepState', 'more', 'old', 'backMap'].filter(id => !document.getElementById(id)));
      const cards = await p.evaluate(() => Array.from(document.querySelectorAll('ul.games a')).map(a => a.getAttribute('href')));
      await p.click('#backMap'); await p.waitForTimeout(300);
      const backOk = await p.evaluate(() => document.getElementById('parent').hidden && !document.getElementById('pDesk').classList.contains('off'));
      await p.screenshot({ path: OUT + `hub_map_desk_on_${v.name}.png` });
      // 숲 톡 → 0.45초 뒤 meet/?s=forest
      const forest = places.find(q => q.href === '../meet/?s=forest');
      await p.mouse.click(forest.x + forest.w / 2, forest.y + forest.h / 2); await p.waitForTimeout(150);
      await p.screenshot({ path: OUT + `hub_tap_${v.name}.png` });
      await p.waitForURL(/meet\/\?s=forest/, { timeout: 3000 }).catch(() => {});
      const navUrl = p.url();
      await p.goto(B + 'games/#parent'); await p.waitForTimeout(500);
      const hashOpens = await p.evaluate(() => !document.getElementById('parent').hidden);
      const noSideScroll = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      R[`hub/${v.name}`] = { minSide, inView, shortOpened, stayedOnDesk, longOpened, deskCfg, moreKeys, missingIds: ids, cards: cards.length, backOk, navUrl: navUrl.replace(B, ''), hashOpens, noSideScroll, errs };
      await ctx.close();
    }
    // ---------- 2) 공룡·고래 만나기 ----------
    for (const s of ['forest', 'sea']) {
      const ctx = await b.newContext(v); const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
      await p.goto(B + `meet/?s=${s}`); await p.waitForTimeout(1500);
      await p.screenshot({ path: OUT + `meet_${s}_${v.name}_1start.png` });
      const cdp = await ctx.newCDPSession(p);
      const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await p.waitForTimeout(60); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
      const st0 = await p.evaluate(() => ({ scene: __g.scene, total: __g.total, friends: __g.friends }));
      let steps = 0, popShot = false, partyShot = false; const t0 = Date.now();
      while (Date.now() - t0 < 60000) {
        const st = await p.evaluate(() => ({ rounds: __g.rounds, phase: __g.phase, focus: __g.focus, acts: __g.actions() }));
        if (st.phase === 'party' && !partyShot) { partyShot = true; await p.waitForTimeout(600); await p.screenshot({ path: OUT + `meet_${s}_${v.name}_3party.png` }); }
        if (st.rounds >= 1 && st.phase === 'play') break;
        if (!st.acts.length) { await p.waitForTimeout(200); continue; }
        for (const a of st.acts) {
          steps++; await tap(a.x, a.y);
          if (!popShot) { popShot = true; await p.waitForTimeout(1100); await p.screenshot({ path: OUT + `meet_${s}_${v.name}_2pop.png` }); }
          await p.waitForTimeout(a.wait || 300);
        }
      }
      await p.waitForTimeout(1200);
      await p.screenshot({ path: OUT + `meet_${s}_${v.name}_4next.png` });
      const fin = await p.evaluate(() => ({ rounds: __g.rounds, phase: __g.phase, scene: __g.scene, friends: __g.friends, demo: !!(window.__demo && window.__demo()) }));
      R[`meet_${s}/${v.name}`] = { start: st0, steps, partyShot, fin, secs: Math.round((Date.now() - t0) / 1000), errs };
      await ctx.close();
    }
  }
  // ---------- 3) 두 판 뒤 장면 바뀜 (숲 → 바다), 겹치지 않는 친구 ----------
  {
    const ctx = await b.newContext(VIEWS[0]); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(B + 'meet/?s=forest'); await p.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(p);
    const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await p.waitForTimeout(40); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    const seen = []; let last = -1, slideShot = false; const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      const st = await p.evaluate(() => ({ rounds: __g.rounds, phase: __g.phase, scene: __g.scene, friends: __g.friends, acts: __g.actions() }));
      if (st.rounds !== last && st.phase === 'play') { last = st.rounds; seen.push({ scene: st.scene, friends: st.friends }); }
      if (st.phase === 'slide' && !slideShot) { slideShot = true; await p.waitForTimeout(250); await p.screenshot({ path: OUT + 'meet_slide_port.png' }); }
      if (st.rounds >= 3 && st.phase === 'play') break;
      for (const a of st.acts) { await tap(a.x, a.y); await p.waitForTimeout(450); }
      if (!st.acts.length) await p.waitForTimeout(150);
    }
    await p.screenshot({ path: OUT + 'meet_after3_port.png' });
    const forestFriends = seen.filter(r => r.scene === 'forest').flatMap(r => r.friends);
    R.cycle = { seen, forestNoRepeat: new Set(forestFriends).size === forestFriends.length, scenes: seen.map(r => r.scene).join(','), errs };
    await ctx.close();
  }
  console.log(JSON.stringify(R, null, 1));
  await b.close();
})();
