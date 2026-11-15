/* WP-4 정원 판정: G1 시작 stage 1 / G2 한 판 tap <= 14 / G3 세로 S >= 70 + 화면 안 배치 */
module.exports = async (page, view, util) => {
  const checks = [], { W, H } = util;
  /* 새로 열어 처음 상태에서 시작 */
  await page.reload({ waitUntil: 'load' });
  await util.wait(1800);
  const first = await util.g(() => __g.plots());
  checks.push({ name: 'G1 start: 4 plots all stage 1', ok: first.length === 4 && first.every(p => p.stage === 1), detail: JSON.stringify(first.map(p => p.stage)) });
  const S = await util.g(() => __g.S);
  if (view.name === 'port') checks.push({ name: 'G3 portrait S >= 70', ok: S >= 70, detail: 'S=' + S.toFixed(1) });
  else checks.push({ name: 'G3 landscape S reasonable (>= 55)', ok: S >= 55, detail: 'S=' + S.toFixed(1) });
  /* 꽃 키(해바라기 S*2.9)가 위쪽 버튼 영역(64px) 아래 */
  const topY = Math.min(...first.map(p => p.y)) - S * 2.9;
  checks.push({ name: 'top row flower below 64px button band', ok: topY >= 64, detail: 'topY=' + topY.toFixed(0) });
  checks.push({ name: 'plots inside screen', ok: first.every(p => p.x - S > 0 && p.x + S < W && p.y < H), detail: '' });
  await util.shot('g_start');
  /* G2: actions 의 tap 만으로 harvest 진입까지 */
  let taps = 0, shotEgg = false, shotBloom = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    const ph = await util.g(() => __g.phase);
    if (ph !== 'play') break;
    const acts = await util.g(() => __g.actions());
    if (!acts.length) { await util.wait(100); continue; }
    const a = acts[0];
    if (a.type === 'tap') { await page.mouse.click(a.x, a.y); taps++; }
    await util.wait(a.wait || 150);
    const st = await util.g(() => __g.plots().map(p => p.stage));
    if (!shotEgg && st.some(x => x === 2)) { shotEgg = true; await util.shot('g_egg'); }
    if (!shotBloom && st.some(x => x === 4)) { await util.wait(250); shotBloom = true; await util.shot('g_bloom'); }
  }
  const ph = await util.g(() => __g.phase);
  checks.push({ name: 'G2 reached harvest with <= 14 taps', ok: ph !== 'play' && taps <= 14, detail: `taps=${taps} phase=${ph}` });
  /* 수확 → 축하 → 다음 세트 (stage 1 로 돌아옴) */
  await util.wait(2200); await util.shot('g_harvest');
  await util.wait(1200); await util.shot('g_cele');
  const tk = await util.g(() => ({ ph: __tkp.phase, tw: __tkp.twins.map(t => t.pose) }));
  checks.push({ name: 'celebration twins cheer/clap', ok: tk.ph === 'cele' && tk.tw.every(p => p === 'cheer' || p === 'clap'), detail: JSON.stringify(tk) });
  await util.wait(3000);
  const nx = await util.g(() => ({ r: __g.rounds, ph: __g.phase, st: __g.plots().map(p => p.stage) }));
  checks.push({ name: 'next set starts at stage 1', ok: nx.r >= 1 && nx.ph === 'play' && nx.st.every(x => x === 1), detail: JSON.stringify(nx) });
  await util.shot('g_next');
  /* 쌍둥이 평소 자세 happy */
  const pose = await util.g(() => __tkp.twins.map(t => t.pose));
  checks.push({ name: 'idle twin pose is happy (not idle)', ok: !pose.includes('idle'), detail: JSON.stringify(pose) });
  /* 빈 곳 톡 / 쌍둥이 톡 반응 */
  await page.mouse.click(W / 2, H * 0.12); await util.wait(100);
  const tpos = await util.g(() => __tkp.twins.map(t => ({ x: t.x, yb: t.yb, h: t.h })));
  await page.mouse.click(tpos[1].x, tpos[1].yb - tpos[1].h * 0.4); await util.wait(150);
  const p1 = await util.g(() => __tkp.twins[1].pose);
  checks.push({ name: 'tapping Coco makes her clap', ok: p1 === 'clap', detail: p1 });
  return checks;
};
