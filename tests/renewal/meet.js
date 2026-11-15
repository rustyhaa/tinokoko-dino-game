/* 만나기 판정 (M1~M5 + 쌍둥이 크기·이름표 범위). run.js 가 방향마다 부름 */
const { chromium } = require('playwright');
module.exports = async (page, view, util) => {
  const out = [], { W, H } = util;
  const ok = (name, c, detail) => out.push({ name, ok: !!c, detail: detail == null ? '' : String(detail) });
  /* 수집: 입력 없이 두 번째 판까지 가며 샘플 */
  const samples = []; let seenCele = false, celeRects = null;
  const grab = async () => {
    const s = await page.evaluate(() => ({ ph: __g.phase, tp: __tkp.phase, rects: __g.tagRects, tw: __tkp.twins.map(t => ({ pose: t.pose, h: t.h })), found: __g.found, focus: __g.focus })).catch(() => null);
    if (!s) return; samples.push(s);
    if (s.tp === 'cele' && !celeRects) celeRects = s.rects;
  };
  await util.drive(26000, { each: grab });
  const g = await util.g(() => ({ rounds: __g.rounds, cel: __tkp.celebrations, scene: __g.scene }));
  ok('M1 rounds >= 1', g.rounds >= 1, 'rounds=' + g.rounds);
  ok('M1 celebrations >= 1', g.cel >= 1, 'cel=' + g.cel);
  const inRange = r => r.every(t => t.x - t.w / 2 >= -0.5 && t.x + t.w / 2 <= W + 0.5);
  ok('M2 tag rects at celebration inside screen', celeRects && celeRects.length >= 4 && inRange(celeRects), JSON.stringify(celeRects));
  const allBad = samples.filter(s => !inRange(s.rects));
  ok('M2b tags inside screen in every sample', samples.length > 5 && allBad.length === 0, samples.length + ' samples, ' + allBad.length + ' bad');
  const calm = samples.filter(s => s.ph === 'play' && s.tp === 'play');
  const poses = calm.flatMap(s => s.tw.map(t => t.pose));
  ok('M3 happy pose seen in play', poses.includes('happy'), calm.length + ' calm samples');
  ok('M3 idle pose never', !samples.flatMap(s => s.tw.map(t => t.pose)).includes('idle'), '');
  const hs = samples.flatMap(s => s.tw.map(t => t.h / H)).filter(h => h > 0);
  const want = view.name === 'port' ? 0.15 : 0.26;
  ok('twins size >= spec', hs.length && Math.min(...hs) >= want - 0.005, 'min h/H=' + Math.min(...hs).toFixed(3));
  const fs = samples.flatMap(s => s.rects.map(r => r.f));
  if (view.name === 'land') ok('tag font >= 15px in landscape', fs.length > 4 && Math.min(...fs) >= 14.99, 'min=' + Math.min(...fs).toFixed(1));
  else ok('tag font >= 15px in portrait', fs.length > 4 && Math.min(...fs) >= 14.99, 'min=' + Math.min(...fs).toFixed(1));
  const oy = await util.g(() => __g.objY);
  if (view.name === 'port') ok('object bottoms reach 0.6H (portrait)', Math.max(...oy) >= 0.6 * H, 'max=' + (Math.max(...oy) / H).toFixed(2) + 'H');
  /* M4: 바다 장면 물건에 o_cloud 없음, o_lifebuoy 가능 */
  const ctx = await page.context().browser().newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const p2 = await ctx.newPage(), errs = [];
  p2.on('pageerror', e => errs.push(String(e)));
  p2.on('console', m => { if (m.type() === 'error' && !/\/shared\/voice\/|bg_map/.test((m.location() || {}).url || '')) errs.push(m.text()); });
  await p2.goto(page.url().replace(/\?.*$/, '') + '?s=sea', { waitUntil: 'load' });
  await p2.waitForTimeout(1500);
  const seen = new Set();
  for (let r = 0; r < 12; r++) {
    const o = await p2.evaluate(() => ({ s: __g.scene, o: __g.objs })).catch(() => null);
    if (o) o.o.forEach(n => seen.add(n));
    await p2.evaluate(() => 0);
    await p2.keyboard.press('Space'); await p2.waitForTimeout(150);
  }
  const sc = await p2.evaluate(() => __g.scene);
  ok('M4 sea scene opens', sc === 'sea', sc);
  ok('M4 no o_cloud among sea objects', !seen.has('o_cloud') && seen.size >= 4, [...seen].join(','));
  await util.wait(0);
  const keep = util.shot; await p2.screenshot({ path: require('path').resolve(__dirname, '..', '..', 'docs', 'renewal', 'shots', 'meet', 'sea_' + view.name + '_start.png') });
  ok('sea page no errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
  return out;
};
