/* 가나다 실로폰 판정 (WP-5): N1 가나다라마바 고정 · N2 축하·판 반복 · N3 쌍둥이 달리기 그림 없음 · N4 이름표 크기·화면 안 */
module.exports = async (page, view, util) => {
  const { W, H } = util, port = W < H, checks = [];
  const ck = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  const GANA = ['가', '나', '다', '라', '마', '바'];

  /* N2: 러너가 이미 40초 구동한 뒤 */
  const st = await util.g(() => ({ rounds: __g.rounds, cel: __tkp.celebrations, syls: __g.syls }));
  ck('N2 rounds >= 1', st.rounds >= 1, 'rounds=' + st.rounds);
  ck('N2 celebrations >= 1', st.cel >= 1, 'celebrations=' + st.cel);
  ck('N1 syls == 가나다라마바 (current cfg)', JSON.stringify(st.syls) === JSON.stringify(GANA), JSON.stringify(st.syls));

  /* 쌍둥이 톡 -> clap 자세 (TKP.tap 이 처리) */
  await util.g(() => { window.__t0 = __tkp.twins[0]; });
  await page.waitForTimeout(3300);
  const tp = await util.g(() => ({ x: __tkp.twins[0].x, y: __tkp.twins[0].yb - __tkp.twins[0].h * 0.5, ph: __tkp.phase }));
  if (tp.ph === 'play') {
    await page.mouse.click(tp.x, tp.y); await page.waitForTimeout(120);
    const pose = await util.g(() => __tkp.twins[0].pose);
    ck('tap Tino -> pose clap', pose === 'clap', pose);
  }

  /* N3 + N4: 20초 더 연주하며 모든 샘플 확인 */
  let idle = 0, samples = 0, tagN = 0, badTag = 0, minSize = 999, shotJoin = false, shotThree = false, shotLeave = false, order = 0, bandMax = 0, lastBand = 0;
  await util.drive(20000, { each: async () => {
    const s = await util.g(() => ({ tw: __tkp.twins.map(t => t.pose), x: __tkp.twins.map(t => t.x), band: __g.band, tags: __g.tags, phase: __g.phase }));
    samples++;
    if (s.tw.includes('idle')) idle++;
    if (!(s.x[0] < s.x[1])) order++;
    s.tags.forEach(t => { tagN++; minSize = Math.min(minSize, t.size); if (t.x - t.w / 2 < 0 || t.x + t.w / 2 > W) badTag++; });
    bandMax = Math.max(bandMax, s.band);
    if (s.band === 1 && !shotJoin) { shotJoin = true; await util.shot('join'); }
    if (s.band === 2 && lastBand === 1) await util.shot('join2');
    if (s.phase === 'leave' && !shotLeave) { shotLeave = true; await util.shot('leave'); }
    if (s.band > 0 && s.tags.length && port && !shotThree && s.band === 2) { shotThree = true; await util.shot('tags'); }
    lastBand = s.band;
  } });
  ck('N3 no twin pose idle in ' + samples + ' samples', samples > 5 && idle === 0, 'idle=' + idle);
  ck('twins[0].x < twins[1].x', order === 0, 'bad=' + order);
  ck('friends joined (band>0 seen)', bandMax >= 1, 'bandMax=' + bandMax);
  ck('N4 tags fully on screen', badTag === 0, tagN + ' tag samples, bad=' + badTag);
  if (tagN) {
    const need = (port ? H * 0.026 : H * 0.034) - 0.5;
    ck('N4 tag text size >= ' + need.toFixed(1) + 'px' + (port ? ' (>=20 portrait)' : ''), minSize >= need && (!port || minSize >= 20), 'min=' + minSize.toFixed(1));
  }

  /* N1: 단계 1·2·3 설정으로 다시 열어도 같은 글자 */
  for (const stg of [1, 2, 3]) {
    await page.evaluate(n => { localStorage.setItem('tk-hangul', JSON.stringify({ stage: n })); }, stg);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
    const sy = await util.g(() => __g.syls);
    ck('N1 stage ' + stg + ' syls', JSON.stringify(sy) === JSON.stringify(GANA), JSON.stringify(sy));
  }
  /* 시작 화면: 별(반짝 바) 보임, 글자 바 6개 */
  await page.waitForTimeout(1800); await util.shot('start2');
  return checks;
};
