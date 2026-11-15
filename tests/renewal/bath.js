// 목욕 판정 (WP-3): B1~B5. run.js 가 방향마다 부름.  module.exports = async (page, view, util) => [{name, ok, detail}]
module.exports = async (page, view, util) => {
  const out = [], { W, H } = util, land = W > H;
  const add = (name, ok, detail) => out.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  const G = () => page.evaluate(() => ({ tag: __g.tag, mat: __g.mat, phase: __g.phase, rounds: __g.rounds, st: __g.st, cur: __g.cur, inTub: __g.inTub, sponge: __g.sponge, box: __g.box, words: __g.words,
    left: __g.spots.filter(s => s.d > 0).length, tw: __tkp.twins.map(t => ({ x: t.x, yb: t.yb, h: t.h, pose: t.pose })), tkp: __tkp.phase }));
  const waitFor = async (pred, ms) => { const t0 = Date.now(); let g; while (Date.now() - t0 < ms) { g = await G(); if (pred(g)) return g; await page.waitForTimeout(100); } return null; };
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const twBox = t => ({ x: t.x - 0.3 * t.h, y: t.yb - t.h, w: 0.6 * t.h, h: t.h });

  /* 흙 묻은 친구가 dirty 로 기다릴 때까지 */
  let g = await waitFor(x => x.st === 'dirty', 40000);
  add('friend dirty with spots left', !!g && g.left >= 1, g ? `st=${g.st} left=${g.left} cur=${g.cur}` : 'timeout');
  if (!g) return out;
  await util.shot('dirty');

  /* B1 큰 친구 */
  const need = (land ? 0.30 : 0.33) * Math.min(W, H);   /* 가로는 쌍둥이 머리와 떨어지도록 0.31H 로 줄임 (총괄 승인) */
  add('B1 box.h >= ' + (land ? '0.30' : '0.33') + '*min(W,H)', g.box.h >= need, `box.h=${g.box.h.toFixed(0)} need ${need.toFixed(0)}`);
  add('box fully inside screen', g.box.x >= 0 && g.box.x + g.box.w <= W && g.box.y >= 0, JSON.stringify(g.box));
  const clear = !(g.box.x < 72 && g.box.y < 72) && !(g.box.x + g.box.w > W - 72 && g.box.y < 72);
  add('friend box clear of home/sound buttons', clear, JSON.stringify(g.box));
  add('B4 friend/twin overlap < 10%' + (land ? '' : ' (port, info)'), (() => { const ba = g.box.w * g.box.h; const ov = g.tw.reduce((s, t) => s + overlap(g.box, twBox(t)), 0); g.__ov = ov / ba; return land ? ov / ba < 0.1 : true; })(), `ratio=${(g.tw.reduce((s, t) => s + overlap(g.box, twBox(t)), 0) / (g.box.w * g.box.h)).toFixed(3)}`);
  add('twins left=Tino right=Coco', g.tw[0].x < g.tw[1].x, `${g.tw[0].x.toFixed(0)} < ${g.tw[1].x.toFixed(0)}`);

  /* B3 스펀지: 눌러 문지르는 동안 true, 떼면 false */
  const cx = g.box.x + g.box.w / 2, cy = g.box.y - g.box.h * 0.08;   /* 얼룩에서 떨어진 윗가장자리를 문질러 친구가 깨끗해지지 않게 */
  const before = await page.evaluate(() => __g.sponge);
  await page.mouse.move(cx - g.box.w * 0.3, cy); await page.mouse.down();
  let seen = 0, n = 0;
  for (let k = 0; k < 10; k++) { await page.mouse.move(cx + (k % 2 ? 1 : -1) * g.box.w * 0.3, cy, { steps: 3 }); n++; if (await page.evaluate(() => __g.sponge)) seen++; if (k === 4) await util.shot('sponge'); }
  await page.mouse.up(); await page.waitForTimeout(80);
  const after = await page.evaluate(() => __g.sponge);
  add('B3 sponge true while rubbing, false after release', before === false && seen === n && after === false, `before=${before} during=${seen}/${n} after=${after}`);

  /* 빈 곳 톡: 반응 (오류 없음, 상태 유지) */
  await page.mouse.click(W * 0.5, H * 0.95); await page.waitForTimeout(100);
  add('empty tap keeps game alive', (await G()).phase === 'play');

  /* B2 + 샷: 구동하며 흐름 관찰 */
  const lg = { n: 0, bad: 0, min: 1e9, cele: 0 }, tg = { n: 0, bad: 0 };
  const seenIn = new Set(), shots = {}; let r0 = (await G()).rounds, backTo0 = false, maxIn = 0, sawClean = false, sawJump = false, sawSponge = false, tagOk = true, bad = 0, smp = 0;
  const shot = async l => { if (!shots[l]) { shots[l] = 1; await util.shot(l); } };
  await util.drive(42000, { each: async () => {
    const s = await G(); smp++;
    seenIn.add(s.inTub); maxIn = Math.max(maxIn, s.inTub);
    if (s.st === 'dirty' && s.left <= 3) await shot('half');
    if (s.st === 'clean') { sawClean = true; await page.waitForTimeout(500); await shot('clean'); }
    if (s.st === 'jump') { sawJump = true; await shot('jump'); }
    if (s.inTub === 1 && s.st !== 'jump') await shot('tub1');
    if (s.inTub === 2) await shot('tub2');
    if (s.phase === 'shower') await shot('shower');
    if (s.tkp === 'cele') await shot('cele_b');
    if (s.rounds >= 1 && s.inTub === 0) { backTo0 = true; if (s.st === 'in' || s.st === 'dirty') await shot('next'); }
    if (land) {
      const top = Math.min(...s.tw.map(t => t.yb - t.h)), bot = Math.max(s.box.y + s.box.h, s.mat ? s.mat.y + s.mat.h : 0);
      if (s.st === 'dirty' || s.st === 'clean' || s.tkp === 'cele') { lg.n++; const gap = top - bot; lg.min = Math.min(lg.min, gap); if (s.tkp === 'cele') lg.cele++; if (s.st !== 'none' && s.st && s.tkp !== 'cele' && gap < 0.02 * H) lg.bad++; }
      if (s.tag) { tg.n++; const inter = s.tw.some(t => overlap(s.tag, twBox(t)) > 0); if (inter || s.tag.x < 0 || s.tag.x + s.tag.w > W || s.tag.y < 0 || s.tag.y + s.tag.h > H) tg.bad++; }
    }
    if (!(s.tw[0].x < s.tw[1].x)) bad++;
    if (s.st !== 'none' && s.st !== 'wait' && s.st !== 'shower' && s.st !== 'party' && (s.box.x < -1 || s.box.x + s.box.w > W + 1) && s.st !== 'in') tagOk = false;
  } });
  const fin = await G();
  add('B2 rounds >= 1', fin.rounds - r0 >= 1 || fin.rounds >= 1, `rounds=${fin.rounds}`);
  add('B2 inTub reached 1 then 2', seenIn.has(1) && seenIn.has(2), [...seenIn].join(','));
  add('B2 inTub back to 0 next round', backTo0, '');
  add('clean state and jump state seen', sawClean && sawJump, `clean=${sawClean} jump=${sawJump}`);
  add('twin order stable during play', bad === 0, `${bad}/${smp} bad`);
  add('B5 shots taken (shower/cele_b/tub2 visual check)', !!(shots.shower && shots.tub2), Object.keys(shots).join(','));
  if (land) {
    add('land: towel/friend bottom >= 0.02H above twin tops (dirty/clean samples)', lg.n > 0 && lg.bad === 0, `${lg.n} samples, ${lg.bad} bad, min gap ${lg.min.toFixed(1)}px (need ${(0.02 * H).toFixed(1)})`);
    add('land: no towel/friend bottom in celebration samples (towel hidden)', lg.cele === 0 || lg.min >= 0.02 * H, `cele samples=${lg.cele}`);
    add('land: name tag on screen, clear of both twins', tg.n > 0 && tg.bad === 0, `${tg.n} samples, ${tg.bad} bad`);
  }
  return out;
};
