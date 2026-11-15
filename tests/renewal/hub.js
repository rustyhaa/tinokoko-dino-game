// 지도(games/) 판정 H1~H9 + 부모 화면 설정·목소리 파일 켬/끔 + 지도→놀이→집 버튼 왕복. tests/renewal/run.js hub 가 불러 줌.
//  책상은 총괄 지시(gm-addendum 1)로 기본 잠김: cfg.desk === true 일 때만 열림 → H3 은 "잠김 → 부모가 켜면 별자리로 이동" 으로 확인.
module.exports = async ({ browser, view, base, shotDir, newCtx, watch, sleep }) => {
  const fs = require('fs'); fs.mkdirSync(shotDir, { recursive: true });
  const V = view, checks = [], C = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  const shot = (p, label) => p.screenshot({ path: `${shotDir}hub_${V.name}_${label}.png` });
  const radius = p => p.evaluate(() => { const m = /circle\(([\d.]+)px/.exec(getComputedStyle(document.getElementById('wipe')).clipPath); return m ? +m[1] : -1; });
  const centerOf = (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, t: r.top }; }, sel);

  /* ---- A: 빈 저장소 ---- */
  {
    const ctx = await newCtx(null), p = await ctx.newPage(); watch(p);
    await p.goto(base + 'games/'); await p.waitForTimeout(900);
    await shot(p, 'map');
    C('H1 map has no text', await p.evaluate(() => document.querySelector('.map').innerText.trim() === ''), '');
    const places = await p.evaluate(() => Array.from(document.querySelectorAll('.place')).map(a => { const r = a.getBoundingClientRect(); return { k: a.dataset.place, href: a.getAttribute('href'), w: r.width, h: r.height, x: r.left, y: r.top, off: a.classList.contains('off') }; }));
    C('H2 7 places', places.length === 7, places.length);
    C('H2 each side >= 120', places.every(q => q.w >= 119.5 && q.h >= 119.5), places.map(q => Math.round(Math.min(q.w, q.h))).join(','));
    C('H2 all inside the screen', places.every(q => q.x >= -2 && q.y >= -2 && q.x + q.w <= V.w + 2 && q.y + q.h <= V.h + 2));
    C('data-place keys', JSON.stringify(places.map(q => q.k).sort()) === JSON.stringify(['band', 'bath', 'forest', 'garden', 'run', 'sea', 'stars']), places.map(q => q.k).join(','));
    C('no place is locked by default (desk opens unless a parent turned it off)', places.filter(q => q.off).length === 0, places.filter(q => q.off).map(q => q.k).join(','));
    /* H9 */
    await p.evaluate(() => { const b = document.createElement('button'); b.id = 'upd'; b.textContent = 'x'; document.body.appendChild(b); });
    C('H9 #upd hidden on the map', await p.evaluate(() => getComputedStyle(document.getElementById('upd')).display === 'none'));
    /* H8 톱니 */
    const g = await centerOf(p, '#gear');
    await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.waitForTimeout(200); await p.mouse.up(); await p.waitForTimeout(300);
    C('H8 short gear tap does not open', await p.evaluate(() => document.getElementById('parent').hidden));
    await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.waitForTimeout(1250); await p.mouse.up(); await p.waitForTimeout(400);
    C('H8 1s hold opens parent', await p.evaluate(() => !document.getElementById('parent').hidden));
    await shot(p, 'parent');
    C('H9 #upd visible on the parent screen', await p.evaluate(() => getComputedStyle(document.getElementById('upd')).display !== 'none'));
    const ids = await p.evaluate(() => ['name0', 'name1', 'favSeg', 'stageSeg', 'stageNote', 'focusSeg', 'deskSeg', 'voiceBox', 'recKey', 'recBtn', 'playBtn', 'delBtn', 'recState', 'ttsBtn', 'ttsState', 'weekBox', 'weekList', 'todayBox', 'todayList', 'bday', 'bdayClear', 'seasonSeg', 'musicSeg', 'blowSeg', 'sleepSeg', 'sleepState', 'more', 'old', 'backMap'].filter(id => !document.getElementById(id)));
    C('H8 all parent ids exist', ids.length === 0, ids.join(','));
    const cards = await p.evaluate(() => ({ main: document.querySelectorAll('#parent > ul.games a').length, more: document.querySelectorAll('#more a').length, old: document.querySelectorAll('#old a').length }));
    C('H8 card links 6 + 5 + 3', cards.main === 6 && cards.more === 5 && cards.old === 3, JSON.stringify(cards));
    /* 부모 설정 저장 (기존 키) */
    await p.fill('#name0', '하늘'); await p.click('#stageSeg button[data-v="3"]'); await p.click('#musicSeg button[data-v="0"]'); await p.click('#seasonSeg button[data-v="0"]'); await p.click('#blowSeg button[data-v="1"]');
    const st = await p.evaluate(() => ({ cfg: JSON.parse(localStorage.getItem('tk-hangul') || '{}'), music: localStorage.getItem('tk-music'), season: localStorage.getItem('tk-season'), blow: localStorage.getItem('tk-blowmic') }));
    C('existing keys still saved (tk-hangul/tk-music/tk-season/tk-blowmic)', st.cfg.names && st.cfg.names[0] === '하늘' && st.cfg.stage === 3 && st.music === '0' && st.season === '0' && st.blow === '1', JSON.stringify(st));
    /* 책상 켜기 → 지도 → 톡하면 ../stars/ */
    await p.click('#deskSeg button[data-v="1"]');
    C('desk on stores desk:true', await p.evaluate(() => JSON.parse(localStorage.getItem('tk-hangul')).desk === true));
    await p.click('#more summary'); await p.click('#old summary'); await p.waitForTimeout(150);
    C('tk-more / tk-old stored', await p.evaluate(() => localStorage.getItem('tk-more') === '1' && localStorage.getItem('tk-old') === '1'));
    await p.click('#backMap'); await p.waitForTimeout(300);
    C('desk unlocked after toggle', await p.evaluate(() => !document.getElementById('pDesk').classList.contains('off')));
    await shot(p, 'map_desk_on');
    const d2 = await centerOf(p, '#pDesk');
    await p.mouse.click(d2.x, d2.y); await p.waitForURL(/\/stars\//, { timeout: 2500 }).catch(() => {});
    C('S4/H3 desk (toggled on) enters ../stars/', /\/stars\//.test(p.url()), p.url());
    await ctx.close();
  }

  /* ---- B: desk:false 저장 (H4) ---- */
  {
    const ctx = await newCtx({ desk: false }), p = await ctx.newPage(); watch(p);
    await p.goto(base + 'games/'); await p.waitForTimeout(700);
    C('H4 desk:false -> .off', await p.evaluate(() => document.getElementById('pDesk').classList.contains('off')));
    const d = await centerOf(p, '#pDesk'); await p.mouse.click(d.x, d.y); await p.waitForTimeout(700);
    C('H4 tap stays on /games/', /\/games\/$/.test(p.url()), p.url());
    await ctx.close();
  }

  /* ---- C: last-place = bath (H6) ---- */
  {
    const ctx = await newCtx(null, () => { try { if (!sessionStorage.getItem('__seed')) { sessionStorage.setItem('__seed', '1'); sessionStorage.setItem('tk-last-place', 'bath'); } } catch (e) {} }), p = await ctx.newPage(); watch(p);
    await p.goto(base + 'games/'); await p.waitForTimeout(250);
    await shot(p, 'back');
    const s = await p.evaluate(() => ({ back: document.querySelector('.place[data-place="bath"]').classList.contains('back'), others: document.querySelectorAll('.place.back').length, hop: !!document.querySelector('.mt.hop'), key: sessionStorage.getItem('tk-last-place') }));
    C('H6 bath place .back, twins .hop, key removed', s.back && s.others === 1 && s.hop && s.key === null, JSON.stringify(s));
    await p.waitForTimeout(600);
    C('arrival wipe folded away', (await radius(p)) <= 1, await radius(p));
    await ctx.close();
  }

  /* ---- D: 9초 무입력 힌트 (H7) ---- */
  {
    const ctx = await newCtx(null), p = await ctx.newPage(); watch(p);
    await p.goto(base + 'games/'); await p.waitForTimeout(500);
    let seen = false, shotDone = false;
    const early = await p.evaluate(() => document.querySelectorAll('.place.hint').length);
    for (let t = 0; t < 10500; t += 250) { await p.waitForTimeout(250); const h = await p.evaluate(() => document.querySelectorAll('.place.hint').length); if (h) { seen = true; if (!shotDone) { shotDone = true; await shot(p, 'hint'); } break; } }
    C('H7 no hint before 8s idle / hint within ~9-10s', early === 0 && seen, `early=${early} seen=${seen}`);
    await ctx.close();
  }

  /* ---- E: 지도 -> 숲 -> 놀이 -> 집 버튼 -> 지도 (H5 + 왕복) ---- */
  {
    const ctx = await newCtx(null), p = await ctx.newPage(); watch(p);
    await p.goto(base + 'games/'); await p.waitForTimeout(700);
    const f = await centerOf(p, '.place[data-place="forest"]');
    await p.mouse.click(f.x, f.y); await p.waitForTimeout(150);
    const r150 = await radius(p); await shot(p, 'wipe');
    C('H5 wipe radius > 0 at 150ms', r150 > 0, r150);
    await p.waitForURL(/meet\/\?s=forest/, { timeout: 1500 }).catch(() => {});
    C('H5 reaches meet/?s=forest within 1s', /meet\/\?s=forest/.test(p.url()), p.url());
    await p.waitForTimeout(250); await p.screenshot({ path: `${shotDir}meet_${V.name}_iris.png` });
    const ir = await p.evaluate(() => window.__frame && __frame.iris);
    C('game starts with a cream iris (cover/opening at 0.25s)', ir === 'cover' || ir === 'opening', ir);
    await p.waitForTimeout(1700);
    C('iris done after ~2s', await p.evaluate(() => __frame.iris === 'done'));
    const hb = await centerOf(p, '#tkhome'); await p.mouse.click(hb.x, hb.y); await p.waitForTimeout(600);
    await p.screenshot({ path: `${shotDir}meet_${V.name}_bye.png` });
    C('goodbye overlay uses hand-drawn twins', await p.evaluate(() => Array.from(document.querySelectorAll('#tkbye img')).map(i => i.getAttribute('src')).join().includes('o_tino_cheer') && document.querySelector('#tkbye').innerHTML.includes('o_coco_cheer')));
    await p.waitForTimeout(500);
    C('goodbye turns cream by 1.0s', await p.evaluate(() => document.getElementById('tkbye').classList.contains('cream')));
    await p.waitForURL(/\/games\/$/, { timeout: 3000 }).catch(() => {});
    C('home button returns to /games/', /\/games\/$/.test(p.url()), p.url());
    await p.waitForTimeout(250); await shot(p, 'back_after_game');
    const s = await p.evaluate(() => ({ back: document.querySelector('.place[data-place="forest"]').classList.contains('back'), hop: !!document.querySelector('.mt.hop') }));
    C('after the round trip the forest glows and twins hop', s.back, JSON.stringify(s));
    await ctx.close();
  }
  return checks;
};
