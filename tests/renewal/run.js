// 리뉴얼 공통 확인 러너 (Playwright Chromium). 놀이마다 tests/renewal/<놀이>.js 판정을 덧붙임.
//  사용:  node tests/renewal/run.js <meet|run|bath|garden|band|stars|hub|pages> [--secs 30] [--base http://localhost:8091/] [--cfg '{"stage":3}'] [--shots 폴더이름] [--serve]
//   hub    지도·부모 화면·연출 판정 (tests/renewal/hub.js 만 실행)
//   pages  엔진 놀이 11개 + 단독 2개가 두 방향에서 오류 없이 열리는지, 엔진 놀이에 TKP 가 있는지
//   --serve  주소가 localhost 인데 서버가 없으면 저장소 루트에서 python3 -m http.server 를 띄우고 끝나면 끔
//  샷: docs/renewal/shots/<폴더이름>/<port|land>_<이름>.png  (git 제외)
//  종료 코드: 모두 통과 0, 하나라도 실패 1.  마지막 줄 PASS / FAIL
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const target = argv[0];
const opt = k => { const i = argv.indexOf('--' + k); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const SECS = +(opt('secs') || 30), BASE = (opt('base') || 'http://localhost:8091/').replace(/\/?$/, '/'), CFG = opt('cfg') ? JSON.parse(opt('cfg')) : null;
const SHOTDIR = path.join(ROOT, 'docs', 'renewal', 'shots', (opt('shots') && opt('shots') !== true) ? opt('shots') : (target === 'hub' || target === 'pages' ? 'wp0' : target)) + '/';
const VIEWS = [{ name: 'port', w: 390, h: 844 }, { name: 'land', w: 844, h: 390 }];
const ENGINE = ['meet', 'run', 'bath', 'garden', 'band', 'stars', 'book', 'boat', 'shapes', 'steps', 'blow'];
const STANDALONE = ['rainbow-bubbles', 'peekaboo'];
const MAPPED = { run: 'run_game' };   /* 러너 이름(run.js)과 겹치는 놀이는 run_game.js */
const URL_OF = { hub: 'games/', meet: 'meet/?s=forest' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function ping(url) { return new Promise(res => { const q = http.get(url, r => { r.resume(); res(true); }); q.on('error', () => res(false)); q.setTimeout(1500, () => { q.destroy(); res(false); }); }); }
async function maybeServe() {
  if (!opt('serve')) return null;
  const u = new URL(BASE); if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname) || await ping(BASE)) return null;
  const child = cp.spawn('python3', ['-m', 'http.server', u.port || '80'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 30 && !(await ping(BASE)); i++) await sleep(200);
  return child;
}

/* 페이지 오류·console.error 수집 (목소리 파일 폴더가 없을 때 pack.json 404 로 브라우저가 남기는 한 줄은 제외) */
function watch(page, errs) {
  page.on('pageerror', e => errs.push('pageerror: ' + String(e).split('\n')[0]));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const u = (m.location() && m.location().url) || '';
    if (/\/shared\/voice\/|\/shared\/pics\/bg_map\.webp/.test(u) && /404|Failed to load resource/.test(m.text())) return;   /* bg_map 은 아직 없는 선택 그림, voice 는 선택 폴더 */
    errs.push('console: ' + m.text());
  });
}
async function newCtx(browser, v, cfg, extraInit) {
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'block' });
  if (cfg) await ctx.addInitScript(c => { try { if (!sessionStorage.getItem('__cfgset')) { localStorage.setItem('tk-hangul', JSON.stringify(c)); sessionStorage.setItem('__cfgset', '1'); } } catch (e) {} }, cfg);
  if (extraInit) await ctx.addInitScript(extraInit);
  return ctx;
}
function makeUtil(page, v, shotPrefix) {
  const util = {
    W: v.w, H: v.h,
    shot: async label => { fs.mkdirSync(SHOTDIR, { recursive: true }); await page.screenshot({ path: SHOTDIR + `${shotPrefix || v.name}_${label}.png` }); },
    wait: ms => page.waitForTimeout(ms),
    g: expr => (typeof expr === 'function' ? page.evaluate(expr) : page.evaluate(expr)),
    /* ms 동안 __g.actions() 의 첫 동작을 실제 입력으로 반복. hooks.each 는 동작마다 불림 */
    drive: async (ms, hooks) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const acts = await page.evaluate(() => (window.__g && __g.actions ? __g.actions() : [])).catch(() => []);
        if (hooks && hooks.each) await hooks.each();
        if (!acts || !acts.length) { await page.waitForTimeout(150); continue; }
        const a = acts[0];
        if (a.type === 'tap') { await page.mouse.click(a.x, a.y); }
        else if (a.type === 'hold') { await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.waitForTimeout(a.ms || 600); await page.mouse.up(); }
        else if (a.type === 'path' && a.pts && a.pts.length) {
          await page.mouse.move(a.pts[0].x, a.pts[0].y); await page.mouse.down();
          for (const q of a.pts.slice(1)) await page.mouse.move(q.x, q.y, { steps: 2 });
          await page.mouse.up();
        }
        await page.waitForTimeout(a.wait || 150);
      }
    }
  };
  return util;
}

async function runGame(browser, game) {
  const out = [];
  for (const v of VIEWS) {
    const ctx = await newCtx(browser, v, CFG), page = await ctx.newPage(), errs = [], checks = [];
    watch(page, errs);
    const util = makeUtil(page, v);
    const url = BASE + (URL_OF[game] || game + '/');
    await page.goto(url, { waitUntil: 'load' });
    const t0 = Date.now(), at = async ms => { const d = ms - (Date.now() - t0); if (d > 0) await page.waitForTimeout(d); };
    await at(300); await util.shot('iris');
    await at(1200); await util.shot('start');
    await at(3500); await util.shot('t3');
    const inited = await page.evaluate(() => !!(window.__tkp && __tkp.inited));
    const samples = []; let seenCele = false, n = 0, lastShot = Date.now(), maxCele = 0;
    const sample = async () => {
      const s = await page.evaluate(() => (window.__tkp ? { phase: __tkp.phase, cel: __tkp.celebrations, tw: __tkp.twins.map(t => ({ pose: t.pose, x: t.x, h: t.h })), rounds: window.__g ? __g.rounds : null } : null)).catch(() => null);
      if (s) { samples.push(s); maxCele = Math.max(maxCele, s.cel); if (s.phase === 'cele' && !seenCele) { seenCele = true; await util.shot('cele'); } }
      if (Date.now() - lastShot > 5000) { lastShot = Date.now(); n++; await util.shot('play_' + String(n).padStart(2, '0')); }
    };
    await util.drive(SECS * 1000, { each: sample });
    /* 입력 없이 12초: 별 시범 + 쌍둥이 point */
    let demoSeen = false, pointSeen = false, hintShot = false;
    const t1 = Date.now();
    while (Date.now() - t1 < 12000) {
      const s = await page.evaluate(() => ({ demo: !!(window.__frame && __frame.demo), tw: window.__tkp ? __tkp.twins.map(t => t.pose) : [] })).catch(() => null);
      if (s && s.demo) { demoSeen = true; if (s.tw.includes('point')) pointSeen = true; if (!hintShot && Date.now() - t1 > 800) { hintShot = true; await util.shot('hint'); } }
      await page.waitForTimeout(150);
    }
    const iris = await page.evaluate(() => (window.__frame ? __frame.iris : 'none'));
    checks.push({ name: 'frame iris done', ok: iris === 'done', detail: iris });
    checks.push({ name: 'no page/console errors', ok: errs.length === 0, detail: errs.slice(0, 5).join(' | ') });
    if (!inited) checks.push({ name: 'TKP not migrated (TKP checks skipped)', ok: true, detail: 'inited=false' });
    else {
      checks.push({ name: '__tkp.inited', ok: true });
      checks.push({ name: 'celebrations >= 1 while driving', ok: maxCele >= 1, detail: 'celebrations=' + maxCele });
      const drawn = samples.filter(s => s.tw[0].h > 0 && s.tw[1].h > 0);
      const bad = drawn.filter(s => !(s.tw[0].x < s.tw[1].x));
      checks.push({ name: 'twins[0].x < twins[1].x in every sample', ok: drawn.length > 0 && bad.length === 0, detail: `${drawn.length} samples, ${bad.length} bad` });
      checks.push({ name: 'demo seen during 12s idle', ok: demoSeen, detail: '' });
      checks.push({ name: 'a twin is pose point during demo', ok: pointSeen, detail: '' });
    }
    const gf = path.join(__dirname, (MAPPED[game] || game) + '.js');
    if (fs.existsSync(gf)) {
      try { const r = await require(gf)(page, v, util); (r || []).forEach(c => checks.push(c)); }
      catch (e) { checks.push({ name: game + '.js threw', ok: false, detail: String(e && e.stack || e).split('\n').slice(0, 3).join(' / ') }); }
    }
    out.push({ game, view: v.name, checks, errors: errs });
    await ctx.close();
  }
  return out;
}

async function runPages(browser) {
  const out = [];
  for (const v of VIEWS) {
    const checks = [], errsAll = [];
    for (const name of ENGINE.concat(STANDALONE)) {
      const ctx = await newCtx(browser, v, null), page = await ctx.newPage(), errs = [];
      watch(page, errs);
      await page.goto(BASE + name + '/', { waitUntil: 'load' }); await page.waitForTimeout(2300);
      const info = await page.evaluate(() => ({ tkp: typeof window.TKP === 'object' && !!TKP.PHRASES, say: !!(window.TKP && TKP.say), iris: window.__frame ? __frame.iris : 'none', canvas: !!document.querySelector('canvas') }));
      const engine = ENGINE.includes(name);
      checks.push({ name: name + ': opens with zero errors', ok: errs.length === 0 && info.canvas, detail: errs.slice(0, 3).join(' | ') });
      if (engine) checks.push({ name: name + ': TKP present', ok: info.tkp });
      checks.push({ name: name + ': frame iris done', ok: info.iris === 'done', detail: info.iris });
      if (name === 'meet') { fs.mkdirSync(SHOTDIR, { recursive: true }); await page.screenshot({ path: SHOTDIR + `pages_${v.name}_${name}.png` }); }
      errsAll.push(...errs.map(e => name + ': ' + e));
      await ctx.close();
    }
    out.push({ game: 'pages', view: v.name, checks, errors: errsAll });
  }
  return out;
}

async function runHub(browser) {
  const out = [], hub = require('./hub.js');
  for (const v of VIEWS) {
    const errs = [], checks = await hub({ browser, view: v, base: BASE, shotDir: SHOTDIR, newCtx: (cfg, init) => newCtx(browser, v, cfg, init), watch: p => watch(p, errs), sleep });
    checks.push({ name: 'no page/console errors (hub run)', ok: errs.length === 0, detail: errs.slice(0, 5).join(' | ') });
    out.push({ game: 'hub', view: v.name, checks, errors: errs });
  }
  return out;
}

(async () => {
  if (!target) { console.log('usage: node tests/renewal/run.js <meet|run|bath|garden|band|stars|hub|pages> [--secs 30] [--base URL] [--cfg JSON]'); process.exit(2); }
  const srv = await maybeServe();
  if (!(await ping(BASE))) { console.log('server not reachable at ' + BASE + ' (start: python3 -m http.server 8091 from the repo root, or pass --serve)'); if (srv) srv.kill(); process.exit(2); }
  fs.mkdirSync(SHOTDIR, { recursive: true });
  const browser = await chromium.launch();
  let res = [], crashed = null;
  try { res = target === 'hub' ? await runHub(browser) : target === 'pages' ? await runPages(browser) : await runGame(browser, target); }
  catch (e) { crashed = e; }
  await browser.close(); if (srv) srv.kill();
  let fail = !!crashed;
  res.forEach(r => { console.log(JSON.stringify({ game: r.game, view: r.view, checks: r.checks, errors: r.errors })); r.checks.forEach(c => { if (!c.ok) fail = true; }); });
  if (crashed) console.log('CRASH ' + (crashed.stack || crashed));
  const flat = res.flatMap(r => r.checks), nf = flat.filter(c => !c.ok).length;
  console.log(`${flat.length - nf}/${flat.length} checks passed; shots in ${path.relative(ROOT, SHOTDIR)}`);
  console.log(fail ? 'FAIL' : 'PASS');
  process.exit(fail ? 1 : 0);
})();
