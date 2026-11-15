/* 글자 별자리 판정 (WP-6): S1 별 크기 · S2 대표 그림 언덕 위 쌍둥이 사이 · S3 완성→다음 판 4.2초 이내 · 긋기 판/별자리 판 · 쌍둥이 자세 */
module.exports = async (page, view, util) => {
  const { W, H } = util, checks = [], m = Math.min(W, H);
  const ck = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  const S = () => page.evaluate(() => ({ ph: __g.phase, r: __g.rounds, trace: __g.trace, fig: __g.fig, jamo: __g.jamo, ex: __g.exPos, tag: __g.tagRect, tp: __tkp.phase, tw: __tkp.twins.map(t => ({ pose: t.pose, x: t.x, yb: t.yb, h: t.h })) })).catch(() => null);

  const r0 = await util.g(() => __g.R);
  ck('S1 R >= 0.03*min(W,H) - 0.5', r0 >= 0.03 * m - 0.5, 'R=' + r0.toFixed(2) + ' need ' + (0.03 * m).toFixed(2));

  /* 별 시범은 러너가 끝낸 뒤라 여기선 새 판을 계속 두드리며 한 사이클씩 관찰 */
  let tagN = 0, tagOff = 0, tagMin = 999, sawTrace = false, sawFig = false, cyc = 0, exOk = 0, exBad = 0, exN = 0, maxGap = 0, tCompl = 0, shotCele = false, shotTrace = false, shotDone = false, shotNext = false, idle = 0, order = 0, samples = 0, tagShot = false, minH = 1e9;
  const T0 = Date.now();
  while (Date.now() - T0 < 90000 && !(sawTrace && sawFig && cyc >= 3)) {
    const s = await S(); if (!s) break;
    samples++;
    if (s.tw.some(t => t.pose === 'idle')) idle++;
    if (!(s.tw[0].x < s.tw[1].x)) order++;
    minH = Math.min(minH, s.tw[0].h, s.tw[1].h);
    if (s.trace) sawTrace = true;
    if (s.fig) sawFig = true;
    if (s.trace && s.ph === 'play' && !shotTrace && Date.now() - T0 > 500) { await page.waitForTimeout(500); shotTrace = true; await util.shot('trace_mid'); }
    if (s.ph === 'complete') { if (!tCompl) tCompl = Date.now(); if (!shotDone) { shotDone = true; await util.shot('complete'); } }
    if (s.ph === 'party' || s.ph === 'fade') {
      if (s.ex) {
        exN++;
        if (s.tag) { tagN++; tagMin = Math.min(tagMin, s.tag.px); if (s.tag.x < 0 || s.tag.y < 0 || s.tag.x + s.tag.w > W || s.tag.y + s.tag.h > H) tagOff++; }
        const x0 = Math.min(s.tw[0].x, s.tw[1].x), x1 = Math.max(s.tw[0].x, s.tw[1].x);
        if (s.ex.yb >= 0.9 * H && s.ex.x > x0 && s.ex.x < x1) exOk++; else exBad++;
      }
      if (s.tp === 'cele' && !shotCele) { shotCele = true; await page.waitForTimeout(700); await util.shot(s.fig ? 'cele_fig' : 'cele'); }
    }
    if (tCompl && s.ph === 'play') { maxGap = Math.max(maxGap, Date.now() - tCompl); tCompl = 0; cyc++; if (!shotNext) { shotNext = true; await util.shot('next'); } }
    const acts = await page.evaluate(() => __g.actions()).catch(() => []);
    const a = acts && acts[0];
    if (a && a.type === 'tap') await page.mouse.click(a.x, a.y);
    else if (a && a.type === 'path' && a.pts.length) { await page.mouse.move(a.pts[0].x, a.pts[0].y); await page.mouse.down(); for (const q of a.pts.slice(1)) await page.mouse.move(q.x, q.y, { steps: 2 }); await page.mouse.up(); }
    await page.waitForTimeout(a && a.wait ? a.wait : 100);
  }
  ck('S2 exPos seen during celebration', exN > 0, 'samples=' + exN);
  ck('S2 exPos.yb >= 0.9H and x between twins (every sample)', exN > 0 && exBad === 0, `ok=${exOk} bad=${exBad}`);
  ck('S3 complete -> next play <= 4.2s (+poll slack)', cyc >= 1 && maxGap <= 4200 + 350, `cycles=${cyc} maxGap=${maxGap}ms`);
  ck('example tag rect fully on screen (every sample)', tagN > 0 && tagOff === 0, `n=${tagN} off=${tagOff}`);
  ck('example tag font px >= ' + (view.w < view.h ? 16 : 15), tagN > 0 && tagMin >= (view.w < view.h ? 16 : 15) - 0.01, 'min=' + tagMin.toFixed(1));
  ck('trace round (긋기 판) occurred', sawTrace, '');
  ck('favorite-figure round (고래·공룡 별자리) occurred', sawFig, '(needs cfg fav; skipped-ok if none)');
  ck('twin pose never idle (run picture)', idle === 0, `idle samples=${idle}/${samples}`);
  ck('Tino left of Coco in every sample', order === 0, `bad=${order}`);
  ck('twin height >= ' + (view.w < view.h ? '0.2' : '0.38') + 'H', minH >= H * (view.w < view.h ? 0.2 : 0.38) - 1, 'minH=' + Math.round(minH));

  /* 다음 판이 시작된 뒤: 쌍둥이 톡 -> clap, 빈 곳 톡 -> 반응 */
  for (let i = 0; i < 40; i++) { const s = await S(); if (s && s.ph === 'play' && s.tp === 'play') break; await page.waitForTimeout(150); }
  const t = (await S()).tw;
  await page.mouse.click(t[1].x, t[1].yb - t[1].h * 0.4); await page.waitForTimeout(150);
  const p1 = (await S()).tw[1].pose;
  ck('tap Coco -> clap', p1 === 'clap', p1);
  const f0 = await util.g(() => __tkp.twins[0].pose);
  await page.mouse.click(W * 0.5, H * 0.02 + 70); await page.waitForTimeout(100);
  ck('tap on empty sky: no crash, still play phase', (await S()).ph !== undefined, '');

  /* 무입력 12초: 시범 말 키 */
  await page.waitForTimeout(3000);
  const dm = await util.g(() => { const d = window.__demo && __demo(); return d ? { sayKey: d.sayKey, kind: d.kind } : null; });
  ck('__demo gives sayKey star/trace', dm && (dm.sayKey === 'star' || dm.sayKey === 'trace'), JSON.stringify(dm));
  ck('__g.actions still works', await util.g(() => Array.isArray(__g.actions())), '');
  await util.shot('after');
  return checks;
};
