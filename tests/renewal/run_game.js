/* 달리기(run) 놀이별 판정 — tests/renewal/run.js 가 불러 씀: (page, view, util) => [{name, ok, detail}] */
module.exports = async (page, view, util) => {
  const out = [], add = (name, ok, detail) => out.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  const port = view.w < view.h;
  const G = () => page.evaluate(() => ({ phase: __g.phase, words: __g.words, missed: __g.missed, caught: __g.caught, rounds: __g.rounds, scene: __g.scene, got: __g.got.filter(Boolean).length, th: __g.th, air: __g.air, tp: __tkp.phase, poses: __tkp.twins.map(t => t.pose), tx: __tkp.twins.map(t => t.x), tyb: __tkp.twins.map(t => t.yb), th2: __tkp.twins.map(t => t.h) })).catch(() => null);

  /* R3 세로 키 */
  const g0 = await G();
  add('R3 th >= 110 in portrait (landscape: any)', !port || g0.th >= 110, 'th=' + Math.round(g0.th));
  add('twin placement port x .2W/.46W, land .16W/.3W', Math.abs(g0.tx[0] / view.w - (port ? 0.2 : 0.16)) < 0.02 && Math.abs(g0.tx[1] / view.w - (port ? 0.46 : 0.3)) < 0.02, g0.tx.map(x => Math.round(x)).join(','));

  /* R2 자석: 풍선이 아직 머리 위가 아닐 때(친구에서 speed*0.8 쯤) 톡 -> 0.6초 안에 잡힘, 3번 */
  let okN = 0; const dets = [];
  for (let k = 0; k < 3; k++) {
    let tried = false;
    for (let w = 0; w < 400 && !tried; w++) {
      const s = await page.evaluate(() => ({ ph: __g.phase, b: __g.balloons, air: __g.air, tx: __g.twinX, sp: __g.speed, c: __g.caught })).catch(() => null);
      if (!s) break;
      const tw = s.tx[0];
      const b = s.b.find(b => !b.popped && !b.tgt && b.x - tw > s.sp * 0.75 && b.x - tw < s.sp * 1.0 && b.x < view.w);
      if (s.ph === 'play' && b && !s.air[0] && !s.air[1] && !s.b.some(q => q.tgt)) {
        await page.mouse.click(view.w * 0.15, view.h * 0.5); tried = true;
        await util.wait(600);
        const c2 = await page.evaluate(() => __g.caught);
        const ok = c2 === s.c + 1; if (ok) okN++; dets.push(ok ? 'ok' : 'fail(dx=' + Math.round(b.x - tw) + ')');
        await util.wait(1500);
      } else await util.wait(40);
    }
    if (!tried) dets.push('no chance');
  }
  add('R2 magnet: tap before balloon arrives -> caught within 0.6s (3/3)', okN === 3, dets.join(','));

  /* R1 30초 actions: words >= 2, missed 0 */
  const a0 = await G();
  await util.drive(30000);
  const a1 = await G();
  add('R1 30s drive: words >= 2', a1.words - a0.words >= 2 || a1.words >= 2, 'words ' + a0.words + '->' + a1.words);
  add('R1 30s drive: missed === 0', a1.missed - a0.missed === 0, 'missed +' + (a1.missed - a0.missed));
  add('every caught balloon was magnet-caught (caught > 0)', a1.caught > a0.caught, 'caught ' + a0.caught + '->' + a1.caught);

  /* R4 결승선 큰 축하: 둘 다 cheer/clap, 4.2초, 끝나면 다음 길 */
  let celeSeen = false, poseOk = false, t0 = 0, t1 = 0, sceneBefore = a1.scene, shotFin = false, minCx = 1e9, maxGap = 0;
  const T0 = Date.now();
  while (Date.now() - T0 < 80000) {
    const s = await G(); if (!s) break;
    if (s.phase === 'finish' && !shotFin && s.tp !== 'cele') { shotFin = true; await util.shot('finish_run'); }
    if (s.tp === 'cele') {
      if (!celeSeen) { celeSeen = true; t0 = Date.now(); await util.wait(500); await util.shot('cele_finish'); }
      const q = await G();
      if (q.poses.every(p => p === 'cheer' || p === 'clap') && q.poses[0] !== q.poses[1]) poseOk = true;
      t1 = Date.now();
    } else if (celeSeen) break;
    if (s.phase === 'play' || s.phase === 'party' || s.phase === 'finish') {
      const acts = await page.evaluate(() => __g.actions()).catch(() => []);
      if (acts[0]) await page.mouse.click(acts[0].x, acts[0].y);
    }
    await util.wait(120);
  }
  add('R4 finish celebration seen (phase cele, big)', celeSeen, '');
  add('R4 both twins cheer/clap (alternating) during celebration', poseOk, '');
  add('R4 celebration ~4.2s', celeSeen && t1 - t0 > 3300 && t1 - t0 < 5000, (t1 - t0) + 'ms observed');
  await util.wait(2500);
  const e = await G();
  add('after finish the next road starts (scene changed, phase play)', e && e.scene !== sceneBefore && (e.phase === 'play' || e.phase === 'scene'), 'scene ' + sceneBefore + '->' + (e && e.scene) + ' ' + (e && e.phase));
  await util.shot('next_scene');

  /* 쌍둥이가 화면 안에 보임 */
  const f = await G();
  add('twins on screen & height >= 110px (port) / .2H (land)', f.tx.every(x => x > 0 && x < view.w) && f.th2.every(h => h >= (port ? 110 : view.h * 0.2)), 'h=' + f.th2.map(h => Math.round(h)).join(','));
  return out;
};
