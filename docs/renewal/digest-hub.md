# Digest: 놀이터 허브 (games/index.html) + 공통 틀 + 빌드/배포

Sources (read in full, working tree, 2026-11-13):
- games/index.html (387 lines)
- shared/frame.js (322 lines)
- common/build_games.py (341 lines)
- common/deploy_pages.sh (37 lines)

Not read: shared/hangul.js (window.H), shared/tk.js, shared/music.js, any game.js, peekaboo/, rainbow-bubbles/, root index.html. Where these files are referenced, only the call sites are listed.

Line numbers below refer to the four source files above.

---

## 0. Cross-file facts

- Hub document: `games/index.html`. Its directory URL `<site>/games/` is the hub address used by frame.js (`HUB`, frame.js L21).
- frame.js never names `index.html`. It only uses the directory `games/`.
- games/index.html does NOT load shared/frame.js. Its only script tags are `../shared/hangul.js` (L236) and one inline script (L237-385).
- Game pages get frame.js from the build template (build_games.py L62), as the last script.
- The hub and frame.js both register the service worker at site root `sw.js` with scope `../` / site root.
- Shared localStorage keys (all per-device):

| key | written by | read by | value |
|---|---|---|---|
| `tk-hangul` | H.saveCfg via index L259 | H.cfg (index L258), frame.js L235 | JSON object (see section 1.5) |
| `tk-music` | index L242 | index L241; music.js (per comment L239) | `'1'` on (absent or not `'0'`), `'0'` off |
| `tk-blowmic` | index L247 | index L246; blow/game.js (per comment L244) | `'1'` on, absent or `'0'` off |
| `tk-season` | index L268 | index L267; frame.js L234 (`!== '0'` means on) | `'1'` on (default), `'0'` off |
| `tk-more` | index L252 | index L251 | `'1'` = "다른 게임 4개" details open, `'0'` closed |
| `tk-sleep` | index L366 (set `{min,until}`) or removed | index L355; frame.js L159 | JSON `{"min":10,"until":<epoch ms>}`, or key absent |
| `tk-bday-said` | frame.js L268-269 | frame.js L268 | `Date.toDateString()` string of the day the birthday greeting played |
| voice recordings | H.recSave / H.recDel / H.recLoad (hangul.js, not read) | index L296-300, L313, L320 | not visible here (backend unknown from these files) |

---

## 1. games/index.html

### 1.1 Head (L1-14)

- `<html lang="ko">`, viewport `width=device-width,initial-scale=1,viewport-fit=cover` (L5).
- Title (L6): `티노코코 한글 놀이터`.
- `<link rel="manifest" href="manifest.webmanifest">` (L7). Relative to `games/`, so `games/manifest.webmanifest` (written by build_games.py L317).
- theme-color `#8fd4ff` (L8). Apple web-app meta tags (L9-12), `apple-mobile-web-app-title` = `한글 놀이터`.
- `apple-touch-icon` = `../shared/icons/icon-180.png` (L13). `icon` = `../shared/icons/icon-192.png` (L14).

### 1.2 CSS (L15-79)

Custom properties on `:root` (L17):

```
--bg:#eaf7ff; --card:#ffffff; --ink:#23324a; --sub:#5d6b80; --line:#cfe6f5;
--accent:#ff9a2e; --accent-ink:#ffffff; --chip:#f3f9fe; --rec:#e9504f
```

Dark mode (L18): `@media (prefers-color-scheme: dark){:root{...}}` redefines only `--bg:#16202e; --card:#202d40; --ink:#eef4fb; --sub:#a9b7c9; --line:#2f405a; --chip:#28374d`. `--accent`, `--accent-ink`, `--rec` are not redefined. No `data-theme` selector exists in this file.

Layout: `body` padding uses `max(…, env(safe-area-inset-*))` (L21-22). `.wrap` max-width 1000px, grid gap 16px (L24). Header images 110px tall, 84px under `max-width:420px` (L27, L30). `ul.games` grid `repeat(auto-fill,minmax(160px,1fr))` gap 14px (L47). Card icon 100x100 radius 24px (L51). `.help` button 40px circle at top-right of a card (L55). `details.more` is the dashed "more" box (L61-71).

Selectors toggled by JS: `.seg button.sel` (L37), `.help[aria-expanded="true"]` (L56), `.tip[hidden]` (L58), `.btn.rec.on` pulse animation (L43), `details.more[open]` (L66-70).

Update banner CSS (L77-78): `#upd` fixed, bottom centered, `z-index:9`, pill button, accent background.

### 1.3 DOM structure (body, L81-235)

```
body
 div.wrap (L82)
  header (L83-87)
   img.tw.t  src=../shared/assets/tino_jump_v2.webp alt=티노
   h1 "티노코코<br>한글 놀이터"
   img.tw.c  src=../shared/assets/coco_laugh_v2.webp alt=코코
  ul.games  (L89-111)            7 cards (main list, section 1.4)
  details.more#more (L113-129)   summary "다른 게임 4개"; ul.games with 4 cards
  details.more#old  (L130-140)   summary "예전 게임 2개";  ul.games with 2 cards
  h2 (L142) "부모 설정" (inline font-size 1.15rem)
  parent-settings panels, in this order (L144-234):
    1. div.panel                     (L144-149)  b "아이 이름"
         input#name0 (maxlength 5, placeholder 첫째 이름)
         input#name1 (maxlength 5, placeholder 둘째 이름)
         p.note
    2. div.panel                     (L151-155)  b "좋아하는 것"
         div.seg#favSeg             buttons data-v="공룡", data-v="고래"
         p.note
    3. div.panel                     (L157-161)  b "단계"
         div.seg#stageSeg           buttons data-v="1" "2" "3"
         p.note#stageNote           (text set by JS from STAGE_NOTE)
    4. div.panel                     (L163-167)  b "이번 주 글자"
         div.seg.jamo#focusSeg      (empty in HTML; JS builds jamo buttons)
         p.note  "최대 3개..."
    5. details#voiceBox              (L169-180)  summary "아빠·엄마 목소리로 읽어주기"
         select#recKey (aria-label 녹음할 글자)
         button.btn.rec#recBtn      "● 녹음"
         button.btn#playBtn         "▶ 들어보기"
         button.btn#delBtn          "지우기"
         p.note#recState
         button.btn#ttsBtn          "기기 음성 시험"  + span.note#ttsState
    6. details#weekBox               (L182-185)  summary "이번 주 리포트"; div#weekList.row
    7. details#todayBox              (L187-190)  summary "오늘 본 글자";     div#todayList.row
    8. div.panel role=group aria-labelledby=bdayTitle (L192-197)
         b#bdayTitle "생일"; input type=date#bday; button.btn#bdayClear "지우기"; span.note
    9. div.panel aria-labelledby=seasonTitle (L199-203)
         b#seasonTitle "계절 장식"; div.seg#seasonSeg  data-v="1" 켬, data-v="0" 끔
   10. div.panel aria-labelledby=musicTitle (L205-209)
         b#musicTitle "배경음악"; div.seg#musicSeg data-v="1" 켬, data-v="0" 끔
   11. div.panel aria-labelledby=blowTitle (L211-215)
         b#blowTitle "불어서 방울"; div.seg#blowSeg data-v="0" 끔, data-v="1" 켬
   12. div.panel aria-labelledby=sleepTitle (L217-223)
         b#sleepTitle "잘 시간"; div.seg#sleepSeg
           button data-min="0" 끔 / "10" 10분 / "20" 20분 / "30" 30분
         span#sleepState.note
  details (no id, L225-234)  "폰·태블릿에 앱으로 설치하기" (static list)
```

Notes:
- Panels 9-12 each have `role="group"` only on 8-12 (8 has `role="group" aria-labelledby="bdayTitle"`; 9-12 have the same role/aria pattern). Panels 1-4 have no role.
- `details#voiceBox`, `#weekBox`, `#todayBox` are closed by default; JS renders their content on load and again on `toggle`.
- Install help (L227-233) mentions the home button ("게임 중 왼쪽 위 집 버튼") and iOS guided access / Android app pinning.

### 1.4 Game cards

All hrefs are relative to `games/`. Each card is `li > a[href] > img(src) + b(title) + small(subtitle)`, then `button.help[aria-expanded=false]`, then `div.tip[hidden]`.

Main list `ul.games` (L90-110), 7 cards:

| # | line | href | icon | title | subtitle |
|---|---|---|---|---|---|
| 1 | 90 | `../peekaboo/` | `../peekaboo/icons/icon-192.png` | 글자 까꿍 | 물건을 톡! 그림과 이름이 까꿍 |
| 2 | 93 | `../shapes/` | `../shapes/icons/icon-192.png` | 자음 짝꿍 | ㄱ·ㄴ·ㅁ·ㅇ 같은 모양에 쏙 |
| 3 | 96 | `../stars/` | `../stars/icons/icon-192.png` | 글자 별자리 | 별을 이으면 자음이 빛나요 |
| 4 | 99 | `../steps/` | `../steps/icons/icon-192.png` | 공룡 발자국 길 | 발자국을 톡! 쿵쿵 글자 길 |
| 5 | 102 | `../run/` | `../run/icons/icon-192.png` | 글자 달리기 | 폴짝! 풍선 글자를 모아 단어를 |
| 6 | 105 | `../book/` | `../book/icons/icon-192.png` | 공룡·고래 그림책 | 넘기면 친구 이름을 읽어 줘요 |
| 7 | 108 | `../band/` | `../band/icons/icon-192.png` | 가나다 실로폰 | 두드리면 글자가 노래해요 |

`details#more` list (L116-125), summary "다른 게임 4개" (L114):

| # | line | href | icon | title | subtitle |
|---|---|---|---|---|---|
| 8 | 116 | `../bath/` | `../bath/icons/icon-192.png` | 글자 목욕 | 쓱쓱 닦으면 단어가 나와요 |
| 9 | 119 | `../boat/` | `../boat/icons/icon-192.png` | 첫소리 배 | 친구를 배에 태우면 첫소리를 들려줘요 |
| 10 | 122 | `../garden/` | `../garden/icons/icon-192.png` | 글자 정원 | 쑥쑥 자라면 이름표가 피어요 |
| 11 | 125 | `../blow/` | `../blow/icons/icon-192.png` | 내 이름 방울 | 방울 속 글자로 이름을 만들어요 |

`details#old` list (L133-136), summary "예전 게임 2개" (L131):

| # | line | href | icon | title | subtitle |
|---|---|---|---|---|---|
| 12 | 133 | `../rainbow-bubbles/` | `../rainbow-bubbles/icons/icon-192.png` | 가나다 방울 | 방울 속 글자를 톡 |
| 13 | 136 | `../` | none: `<span class="ic" aria-hidden="true">R</span>` | 예전 동시점프 러너 | 예전 달리기 게임 (점수 있음) |

Card 13 links to the site root (`../`), which is the old runner. It has no `img`, only the `.ic` span (CSS L51-52).

Each `.help` button has `aria-label="<title> 도움말"` and its `.tip` text is static HTML (L92-138). Card 13's `.tip` has only "노는 법".

Game count note: the hub shows 10 engine games (GAMES in build_games.py) and 2 standalone games (STANDALONE: peekaboo, rainbow-bubbles), plus the root runner link. No card is generated from a list. Every card is hand-written HTML.

### 1.5 Inline script (L237-385): config object and helpers

`cfg` is loaded at L258: `let cfg = H.cfg();`. `save` (L259) is `() => { H.saveCfg(cfg); renderRecKeys(); }`.

Fields the hub reads or writes on `cfg` (JSON object in `tk-hangul`, serialization done by hangul.js):
- `cfg.names`: array; `names[0]`, `names[1]` (L270). Written trimmed. Read by frame.js (L235) with default `['티노','코코']` if empty.
- `cfg.stage`: number 1, 2, or 3 (L274, STAGE_NOTE keys 1-3, L271). Default not set in this file. `renderStage` tolerates undefined.
- `cfg.fav`: array of `'공룡'` / `'고래'` (L277-278). Missing = `[]`.
- `cfg.focus`: array of jamo characters, max 3 (L286 `f.concat(j).slice(-3)`). Missing = `[]`.
- `cfg.bday`: string `'MM-DD'` or `''` (L262-264). Hub displays it as `'2024-' + cfg.bday` (L262) so a leap day works. Read by frame.js (L236) to compare with today `MM-DD`.

Functions in the inline script (name, line, purpose):

| function / handler | line | purpose |
|---|---|---|
| `renderMusic` | 241 | Mark `#musicSeg` button selected from `tk-music` (default on). |
| musicSeg click | 242 | Save `tk-music` = clicked `data-v`, re-render. |
| `renderBlow` | 246 | Mark `#blowSeg` from `tk-blowmic` (default off). |
| blowSeg click | 247 | Save `tk-blowmic`, re-render. |
| more toggle restore | 250-251 | Open `#more` if `tk-more === '1'`. |
| more toggle save | 252 | Save `tk-more` on `toggle`. |
| `.help` click | 253-256 | Show/hide `div.tip` after the `?` button; sets `aria-expanded`. |
| `save` | 259 | `H.saveCfg(cfg)` then `renderRecKeys()`. |
| bday change / clear | 261-264 | Set `cfg.bday` to `MM-DD` (slice(5) of date value) or `''`; save. |
| `renderSeason` | 267 | Mark `#seasonSeg` from `tk-season`. |
| seasonSeg click | 268 | Save `tk-season`. |
| names loop | 270 | Bind `#name0`, `#name1` input → `cfg.names[i]` (trimmed), save. |
| `STAGE_NOTE` | 271 | Constant map `{1,2,3}` → explanatory text (`stageNote`). |
| `renderStage` | 273 | Mark `#stageSeg` by `cfg.stage`; set `#stageNote` text. |
| stageSeg click | 274 | `cfg.stage = +data-v`; save; re-render. |
| `renderFav` | 277 | Mark `#favSeg` buttons present in `cfg.fav`. |
| favSeg click | 278 | Toggle value in `cfg.fav`; save; if added, `H.read(v)`. |
| focusSeg build | 280-281 | Create one button per `H.JAMO` entry, `aria-label = H.JAMO_NAME[j]`. |
| `renderFocus` | 282 | Mark focus buttons in `cfg.focus`. |
| focusSeg click | 283-288 | Toggle jamo in `cfg.focus` (keeps last 3); save; `H.readJamo(j)`. |
| `renderRecKeys` | 292-299 | Rebuild `#recKey` optgroups: 이름 (`H.words()` cat=name), 단어 (`H.WORDS` cat!=name), 자음 (`H.JAMO` + `H.JAMO_NAME`), 가나다 (`H.GANA`). Prefix `● ` for recorded keys (`H.voices.has`). Update `#recState` count and first 12 names. |
| `H.recLoad().then(renderRecKeys)` | 300 | Load recordings then re-render list. |
| recBtn click | 302-318 | Toggle recording via MediaRecorder (`getUserMedia({audio:true})`). Auto-stop at 3000 ms (`stopT`). On stop: blob under 500 bytes is rejected; else `H.recSave(recKey.value, blob)` and re-render. Button class `on` (pulse) while recording. |
| playBtn click | 319 | If recorded: `H.say(k,k)`. Else message and `H.readJamo(k)` (jamo) or `H.read(k)`. |
| delBtn click | 320 | `H.recDel(k)` if recorded; re-render. |
| ttsBtn click | 321-325 | Check `speechSynthesis` voices for `/^ko/`; set `#ttsState`; `H.read('티노')`. |
| `renderToday` | 327-332 | Show `H.todayLog()` `{w,j,s}` as chips (top 24 each): 단어, 자음, 글자 소리. Empty = "- 아직 없어요". Runs on load and on `#todayBox` toggle (L333). |
| `renderWeek` | 335-351 | Weekly report from `H.weekLog()` (`days`, `w`, `j`, `s`). Lines: days/total; 많이 본 단어 top 10 from `v.w`; 자음별 for `H.jamoSet()`: `v.j[j]` + sum of `v.w` words whose `H.cho(w)===j`; 다음 주 추천 = 3 least-seen of that set; button `#weekApply`. Runs on load and on `#weekBox` toggle (L352). |
| weekApply click | 350 | `cfg.focus = rec`; save; `renderFocus`; `renderWeek`; `H.readJamo(rec[0])`. |
| `read` | 355 | Parse `tk-sleep` JSON or null. |
| `render` | 356-362 | Sleep UI: select `data-min` (0 when none); text variants: none, past (잠자는 시간), or `오전/오후 H시 MM분에 잠들어요 (N분 남음)`. |
| sleepSeg click | 363-368 | Set `tk-sleep = {min, until: now + min*60000}` or remove key (min 0). Re-render. |
| `setInterval(render, 15000)` | 369 | Refresh sleep countdown. |
| SW register block | 371-374 | See 1.6. |
| controllerchange handler | 377-383 | Show update banner `#upd`. See 1.6. |

`H.` members referenced by the hub: `cfg`, `saveCfg`, `JAMO`, `JAMO_NAME`, `words`, `WORDS`, `GANA`, `voices` (Map-like: `has`, `size`, `keys`), `recLoad`, `recSave`, `recDel`, `say`, `read`, `readJamo`, `todayLog`, `weekLog`, `cho`, `jamoSet`.

Other globals: `navigator.mediaDevices`, `MediaRecorder`, `Blob`, `speechSynthesis`, `localStorage`, `location`.

### 1.6 Service-worker update banner (`#upd`)

Registration (L371-374):
```
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  const root = new URL('../', location.href).href;          // site root
  getRegistrations(): unregister every r where r.scope !== root && r.scope.startsWith(root)
  navigator.serviceWorker.register('../sw.js', { scope: '../' }).then(r => r.update())
}
```

Banner (L376-383):
- `const had = !!navigator.serviceWorker.controller;` is captured at page load.
- On `controllerchange`: if `!had` (first install, no controller before) or `#upd` already exists, return.
- Otherwise create `<button id="upd" type="button">` with text `새 버전이 준비됐어요 — 눌러서 다시 열기`, click = `location.reload()`, appended to `body`.
- It is never removed by JS. Position and style: CSS L77-78.

### 1.7 Behavior summary for panels that call window.H

- Voice recording panel (#voiceBox): `renderRecKeys` (292-299), recBtn (302-318), playBtn (319), delBtn (320), ttsBtn (321-325), initial load (300). Storage for recordings is inside hangul.js; not visible here.
- Weekly report (#weekBox): `renderWeek` (335-351), uses `H.weekLog`, `H.jamoSet`, `H.cho`, `H.readJamo`, `H.JAMO`, `H.saveCfg` via `save`.
- Today log (#todayBox): `renderToday` (327-332), uses `H.todayLog`.

---

## 2. shared/frame.js

File header (L1-12) describes six features: home button, goodbye greeting, star demo plus voice, bedtime, tablet/mobile fixes, single offline app. Game contract (L11): `window.__paused === true` means the game must pause updates.

### 2.1 Configuration and paths (L15-22)

```
const CFG = Object.assign({ home: true, demo: true, sleep: true }, window.TK_FRAME || {});
const SRC = document.currentScript ? document.currentScript.src : location.href;
const SHARED = new URL('.', SRC).href;     // <root>/shared/
const ROOT   = new URL('../', SHARED).href; // <root>/
const HUB    = ROOT + 'games/';            // hub directory URL
const ASSET  = SHARED + 'assets/';
```

- `window.TK_FRAME` may set `home`, `demo`, `sleep`, and `deco` (`deco` is read at L277 with `!== false`; default on, not in the Object.assign defaults).
- Paths resolve from the script's own URL, so frame.js works from any game folder or a root page.
- The hub URL is `games/` (directory, no `index.html`). The code relies on the server returning `games/index.html` for that directory URL.
- No hub detection. frame.js does not check whether it is on the hub. It is only loaded by pages that include it (game pages via build template; other standalone pages not read).

### 2.2 Injected DOM

Injected `<style>` (L27-63), inserted into `<head>`. Injected elements, in order:

| element | id / class | creation | style summary |
|---|---|---|---|
| canvas | `#tkfx` | L65, appended to body | fixed inset 0, 100%x100%, `pointer-events:none`, `z-index:3`. Backing size = innerWidth/innerHeight × min(devicePixelRatio,2) (L68). |
| home button | `#tkhome.tkbtn` | L95-100, only if `CFG.home` | fixed top/left `max(10px, env(safe-area-inset-*))`, 68×68, `z-index:8`, opacity .8. Inline SVG house (L97). |
| sleep overlay | `#tksleep` | L163-178, created lazily on first sleep | fixed inset 0, `z-index:6`, hidden unless `.show`; `.dark` gradient `#141c44 → #2b3a78 70% → #244a48 70%`. |
| sleep children | `i.sky` ×40, `.moon`, `img.tw.t` (tino_run_v2.webp), `img.tw.c` (coco_run_v2.webp), `.z` particles, `.st` tap stars | L165-166, L186, L172-175 | Stars blink; `.tw` sway; `.z` float up 3.2 s (created every 1600 ms). |
| wake button | `#tksun.tkbtn` | L167-169, inside `#tksleep` | `ringButton('tksun', …)`, bottom-right, `z-index:7`, `aria-label="깨우기 (1초 꾹 누르기, 부모용)"`. |
| goodbye overlay | `#tkbye` | L147-149, created each time | fixed inset 0, `z-index:9`, `.show` white 88%. Two `img` (`img.t` tino_jump_v2.webp, `img.c` coco_laugh_v2.webp), `.wave` class added after 450 ms. |

Ring button (L73-78): `<button class="tkbtn">` with an SVG `circle.ring` (`r=23`, `stroke-dasharray = 2π·23`) plus icon. Long press handled by `longPress(el, ms, onDone)` (L79-93): pointerdown starts, pointerup/pointercancel/lostpointercapture resets.

Note: `#snd` is not created here. `isMuted()` (L24) checks `TK.muted` or an element `#snd` with class `off`.

### 2.3 Home button

- pointerdown: `preventDefault` + `stopPropagation`, so game input does not receive it (L98).
- click (L99): `stopPropagation`, `home.blur()`, `goodbye()`.
- `goodbye()` (L145-154): sets `leaving = true` and `window.__paused = true`; creates `#tkbye`; adds `.show`; plays `faudio()`, `say('안녕!')` and three triangle tones at 784 / 659.25 / 523.25 Hz; after 1400 ms `location.href = HUB` (= `<site>/games/`).
- pageshow (L155): if `e.persisted`, `leaving = false`, `window.__paused = sleeping`, remove `#tkbye`.
- Button is hidden only if `CFG.home` is false. No long press.

### 2.4 Bedtime (잘 시간)

Storage: `localStorage['tk-sleep']` = `{min, until}` where `until` is epoch ms. Written only by the hub (index L366). Read by `readUntil()` (L159), which returns `v.until || 0` or 0 on error.

- `sleepCheck()` (L194): if `!CFG.sleep` return. If `until && Date.now() >= until && !sleeping` → `startSleep()`. Else if `sleeping && !until` → `stopSleep()`.
- Called every 1000 ms (L195) and once at startup (L321), so a page opened after bedtime starts asleep.
- `startSleep()` (L160-188): `sleeping = true; window.__paused = true; demo = null;` builds `#tksleep` once; `.show`, then `.dark` after two rAF; tones and `say('잘 자!')`; 14-note lullaby (L181); z particles every 1600 ms.
- Wake (L170): `longPress(sun, 1000, …)` removes `tk-sleep` and calls `stopSleep()`.
- `stopSleep()` (L189-193): `sleeping = false; window.__paused = leaving;` clears z timer; removes `.dark`; removes `.show` after 300 ms; `lastInput = now()`.
- Tapping the sleep screen spawns `.st` stars and a blip (L171-176).
- Hub "끔" removes the key; the next `sleepCheck` (≤1 s) calls `stopSleep()`.
- While sleeping, `loop()` skips decoration and demo (L277-278).

### 2.5 Star demo (별 시범)

Contract: game sets `window.__demo = () => ({ kind, x, y, pts, ms, say })`. frame.js uses `kind` ('tap' | 'path' | 'hold'), `x`, `y`, `pts`, `say`. `ms` appears in the header comment only; the code does not read it.

- `tryDemo()` (L201-212): calls `__demo()` in try. Invalid if falsy, or `kind === 'path'` with fewer than 2 points. Non-path demos get `pts = [{x,y}]`. Length computed. Duration `d.dur = 0.6 + (path ? min(2.2, 0.7 + len/(600·U)) : hold ? 1.6 : 0.4) + 0.6`. Calls `say(d.say || '')`.
- Triggers (L279-283): idle limit `idleRuns < 3 ? 10 : 25` seconds. First demo after 1.6 s from start (`!firstDone`). If `__demo` never returns a valid demo for 8 s, `firstDone` is set anyway. Later demos after idle.
- `onInput` (L199) on capture `pointerdown` and `keydown` cancels the active demo and resets `idleRuns`.
- Animation (L285-307): 0.6 s approach from offset (90U, 110U), then follows `at(d, q)` for path, holds with ring for hold, taps with press for tap. Trail stars every frame while pressed. Drawn with `star()` (L219-223) on the fx canvas.

### 2.6 Season and birthday decoration (L224-272)

Runs in `loop()` unless `CFG.deco === false`, `sleeping`, or `leaving` (L277).

- `decoDate()` (L229): today, or `?date=YYYY-MM-DD` query for testing.
- `decoState(t)` (L231-237): cached 5 s. `season`: if `tk-season === '0'` → null; else month 12/1/2 → `'snow'`, 3-5 → `'petal'`, 9-11 → `'leaf'`, 6-8 → null. `bday`: `!!cfg.bday && cfg.bday === 'MM-DD'`. `names`: `cfg.names` trimmed, or `['티노','코코']` if empty. `day`: `toDateString()`.
- Snow: 70 flakes (`want = 70`), white arcs. Petal/leaf: 22 ellipses, pink or orange/red.
- Birthday (L253-270): letter flags from `[...names.join('')]`, drawn with `HG.drawWord` (window.H), colors `DCOLS` (L228). Cake at bottom center. The greeting plays once per day: `localStorage['tk-bday-said']` compared to `st.day`; on mismatch, sets it and after 1200 ms plays four chime tones and `HG.speak('생일 축하해, ' + names.join(', '))` if not muted.

### 2.7 Sound and mobile fixes

- `say(text)` (L111-120): if `window.H.speak` exists, `H.speak(text, 1.0)` unless muted. Else `speechSynthesis` with `lang='ko-KR'`, `pitch = H.PITCH || 1.05`, voice from `H.koVoice()` or first `/^ko/` voice.
- `faudio()` (L104), `ftone(f, delay, dur, vol, type)` (L105-110): WebAudio tones. `faudio` is also resumed on unlock.
- `unlock()` (L125-132) on capture `touchend`, `pointerup`, `click`, `keydown` (L133): calls `TK.audio()`, `window.__audioUnlock()`, `faudio()`, and speaks one silent utterance once.
- Multi-touch: `gesturestart` prevented, `touchmove` prevented when `touches.length > 1`, `dblclick` prevented (L134-136).
- `visibilitychange` (L138-141): when hidden, suspends `fa`, calls `TK.suspend()`, then `H.hush()` (or `speechSynthesis.cancel()`).

### 2.8 Service worker

L313-317, runs on http/https only:
```
const root = ROOT;
getRegistrations(): unregister r where r.scope !== root && r.scope.startsWith(root) && !r.scope.endsWith('/shared/')
navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT }).catch(() => {});
```
No `update()` call and no `controllerchange` banner here. The hub does both (index L371-383). frame.js assumes `sw.js` is at site root.

### 2.9 Exposed hooks

- `window.TK_FRAME` read at startup (L16).
- `window.__paused` set by frame.js; games must honor it.
- `window.__demo` read each time (L202).
- `window.__frame` debug object (L320): `demo`, `demoSay`, `sleeping`, `leaving`, `goodbye`, `sleepCheck`.
- `window.__decoErr` set on first decoration error (L277).
- Expected from other files: `TK.muted`, `TK.audio`, `TK.suspend`, `window.__audioUnlock`, `window.H` (`cfg`, `speak`, `PITCH`, `koVoice`, `hush`, `drawWord`).

---

## 3. common/build_games.py

Run from repo root: `python3 common/build_games.py`. Imports PIL; numpy only inside `fill_sprite_holes`. Header doc (L2-16) lists what each file is and who writes it.

### 3.1 Structures

`ROOT` (L20) = parent of `common/`.

`SPRITES` (L21): `tino_run_v2`, `tino_jump_v2`, `coco_run_v2`, `coco_jump_v2`, `coco_laugh_v2`.

`GAMES` (L22-33): name → (title, background color). Engine games (tk.js), 10 entries:

```
'bath':   ('티노코코 글자 목욕',   '#d8f1ff'),
'boat':   ('티노코코 첫소리 배',   '#9fdcff'),
'shapes': ('티노코코 자음 짝꿍',   '#fff3d6'),
'stars':  ('티노코코 글자 별자리', '#1c2656'),
'garden': ('티노코코 글자 정원',   '#bfe9ff'),
'band':   ('티노코코 가나다 실로폰', '#5a2a6e'),
'blow':   ('티노코코 내 이름 방울', '#a8e0ff'),
'steps':  ('티노코코 공룡 발자국 길', '#f6dfa4'),
'run':    ('티노코코 글자 달리기', '#bfe6fb'),
'book':   ('티노코코 공룡·고래 그림책', '#cdeccf'),
```

`STANDALONE` (L34): `['rainbow-bubbles', 'peekaboo']`. Hand-written index.html; the script writes only their `sw.js` (KILL_SW) and removes `icons/icon-512.png`.

`THREE_D` (L35): `[]` (the comment says the three.js version was dropped on 2026-11-08).

`HTML` template (L37-65): `str.format` with `{title}` and `{color}`. Output per game `<game>/index.html`. Head: viewport with `maximum-scale=1,user-scalable=no`, manifest `../games/manifest.webmanifest`, theme color, apple meta, apple-touch-icon `../shared/icons/icon-180.png`, one inline style (`html,body` background = color, `canvas` full-screen). Body: `<canvas id="c"></canvas>`. Script order:

```
<script src="../shared/tk.js"></script>
<script src="../shared/hangul.js"></script>
<script src="../shared/music.js"></script>
<script src="game.js"></script>
<script src="../shared/frame.js"></script>
```

No `<link rel="icon">` in the template. Template uses doubled braces for CSS.

`KILL_SW` (L67-80): per-game `sw.js`. On install, `skipWaiting`. On activate: delete every cache whose key does not start with `playground-`, `self.registration.unregister()`, then `c.navigate(c.url)` on all window clients.

`ROOT_SW` (L82-103): template for site-root `sw.js`, with `{version}` and `{precache}`. Behavior:
- `VERSION = '<version>'`, `PRECACHE = <json list>`.
- install: `caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(skipWaiting)`.
- activate: delete caches starting `playground-` that are not VERSION; `clients.claim()`.
- fetch: only GET and same origin. `caches.open(VERSION)`, `c.match(req, {ignoreSearch:true})`. Network fetch in parallel, caches `res` when `res.ok && res.type === 'basic'`. Responds with the cached copy if present, else the network result (or cached copy on network error). So: cached first, updated in the background.

`ICON_ART` (L112-123): name → (background file under `shared/pics/`, horizontal anchor 0-1, [(file, center x, baseline y, height ratio)]). Keys: `book`, `boat`, `steps`, `run`, `band`, `stars`, `shapes`, `garden`, `bath`, `blow` (all 10 GAMES keys). Example:
```
'stars': ('bg_stars', .7, [('pics/별', .5, .62, .42)]),
```
Files are read from `shared/pics/*.webp` and `shared/*.webp`.

### 3.2 Icon functions

- `art_icon(name, n)` (L126-137): supersampled at 2×, requires the background and every item file to exist; else returns None. Crops the background to a square at anchor `ax`, alpha-composites items, resizes to n.
- `game_icon(name, color, n)` (L140-192): returns `art_icon` if available. Else draws a procedural 4× icon for `bath`, `boat`, `shapes`, `stars`, `garden`, `band`, `blow`, `run`, `steps`. There is no branch for `book`: if its art files are missing, the icon is only the flat background color. Any other name also gets only the flat color.
- `playground_icon(n)` (L195-218): site app icon (sky gradient, rainbow, Tino and Coco shapes).

### 3.3 What build() writes (L287-336)

1. `build_pics()` (L260-284): if `art/cut/` exists, every `w_`, `d_`, `h_`, `f_` PNG is saved to `shared/pics/<name>.webp` (quality 82). `bg_*` and `o_*` PNG go to `shared/pics/*.webp` (not listed). If `art/cut/` is missing, names come from existing `shared/pics/*.webp` (excluding `bg_`/`o_`). It then writes the name list as JSON between the markers `/*PICS*/` and `/*END*/` in `shared/hangul.js` (L278-282). Returns: `['shared/pics/<n>.webp' …] + ['shared/pics/<bg_/o_ files>']`.
2. `shared/assets/<sprite>.webp` for each SPRITES entry, from `assets/<sprite>.png` (fill_sprite_holes, quality 88). Deletes the old `shared/assets/<sprite>.png` if present.
3. `shared/icons/icon-180.png`, `icon-192.png`, `icon-512.png` via `playground_icon`.
4. For each GAMES entry: asserts `<game>/game.js` exists; writes `<game>/index.html` (HTML template); `<game>/icons/icon-192.png` (game_icon 192); removes `<game>/icons/icon-512.png`; writes `<game>/sw.js` (KILL_SW).
5. For each STANDALONE: writes `<game>/sw.js` (KILL_SW); removes `<game>/icons/icon-512.png`. Does NOT write its index.html or icon-192.png.
6. `games/manifest.webmanifest` (L311-317): name `티노코코 한글 놀이터`, short_name `한글 놀이터`, `start_url './'`, `scope '../'`, `id './'`, `display 'fullscreen'`, `display_override ['fullscreen','standalone']`, background `#eaf7ff`, theme `#8fd4ff`. Icons: `../shared/icons/icon-192.png`, `icon-512.png`, and a maskable `icon-512.png`.
7. The site-root `sw.js` (L318-336). The file list, in order:
   a. `index.html`, `games/`, `games/index.html`, `games/manifest.webmanifest`, `shared/tk.js`, `shared/frame.js`, `shared/hangul.js`, `shared/music.js`.
   b. `assets/*.png` (sorted; root runner sprites), from `os.listdir('assets')`.
   c. `pics` (from build_pics), then `shared/assets/<sprite>.webp` ×5, then `shared/icons/icon-180.png`, `icon-192.png`, `icon-512.png`.
   d. THREE_D: for each name, `name/`, `name/index.html`, `name/game.js`. Empty now.
   e. every `*.js` under `shared/vendor/three/` (os.walk; nothing if the folder is absent).
   f. for each name in GAMES + STANDALONE: `name/`, `name/index.html`, `name/icons/icon-192.png`; plus `name/game.js` if the name is in GAMES.
   Hash: MD5 over the bytes of each entry, in that order; an entry ending in `/` hashes `<entry>index.html`. `version = 'playground-' + md5.hexdigest()[:10]`.
   Precache: `['./'] + ['./' + f for f in files]`, JSON with `indent=1`, `ensure_ascii=False`.
   Written to `<root>/sw.js` via ROOT_SW.
   Not included: `sw.js` itself, per-game `sw.js`, `common/`, `docs/`, `art/`, anything not in the list above (e.g. standalone pages' other assets, unless referenced in `files`).
8. Prints `built <n> engine games + <n> standalone, <n> precached files, <version>`.

`games/index.html` is hand-written and is only read (for hashing and precache), never generated.

### 3.4 Adding a new engine game (as the script defines it)

Required by the script:
1. Folder `<name>/` with `game.js` (assert at L300). Game page is generated; no hand-written index.html needed.
2. Entry in `GAMES` (L22-33): `'<name>': ('<title>', '<bg color>')`.
3. Rerun build: writes `<name>/index.html`, `<name>/icons/icon-192.png` (procedural fallback is only for the 9 listed names; a new name gets a flat color icon unless added to `ICON_ART` with `shared/pics` files, or a new branch in `game_icon`), `<name>/sw.js`, and adds it to the site precache list.
4. Deploy: `GAME_DIRS` in deploy_pages.sh (L10) reads GAMES automatically.

Not done by the script (hand-written):
- A card in `games/index.html` (section 1.4). Hub cards are not generated.
- Game code itself: `game.js` must set `window.__demo` (optional) and honor `window.__paused` (frame contract).
- If standalone instead: add to STANDALONE; the page itself is hand-written.

Engine page load order is fixed by the template (section 3.3, HTML). `game.js` runs after tk.js, hangul.js, music.js and before frame.js, so `window.__demo` is available when frame.js starts.

---

## 4. common/deploy_pages.sh

Run from repo root: `bash common/deploy_pages.sh`. `set -euo pipefail`. Deploys to the `gh-pages` branch via a temporary worktree.

Steps:
1. `SRC_BRANCH` = current branch name (L8).
2. `GAME_DIRS` = output of `python3 -B -c` printing `list(GAMES) + STANDALONE + THREE_D` from build_games.py (L10). Current value: `bath boat shapes stars garden band blow steps run book rainbow-bubbles peekaboo`.
3. `PATHS=(index.html sw.js shared games common docs $GAME_DIRS)` (L11). Note: `assets` is not in PATHS, although the root `sw.js` precache lists `assets/*.png`. `docs` is in PATHS, so this digest under `docs/renewal/` would be included in a deploy once committed.
4. `RETIRED=(garden3d)` (L12): removed from gh-pages.
5. `python3 common/build_games.py` (L14). Rebuilds everything in the working tree.
6. Abort (L15-19) if `git status --porcelain -- "${PATHS[@]}"` shows anything. The message says build output must be committed first. Only PATHS are checked.
7. Temporary worktree: `WT=$(mktemp -d)/gh-pages` (L21). Cleanup trap removes it (L22-23).
8. `git fetch -q origin gh-pages`; `git worktree add -q --detach "$WT" origin/gh-pages` (L24-25).
9. Inside `$WT` (L26-37):
   - `git rm -rq --ignore-unmatch -- shared garden3d` (L28): deletes the whole `shared/` folder and retired paths on the gh-pages checkout.
   - `git checkout "$SRC_BRANCH" -- "${PATHS[@]}"` (L29): copies the committed contents of those paths from the source branch.
   - `git add -A`; if `git diff --cached --quiet`, prints "바뀐 것 없음: 배포 생략" and exits 0.
   - Commit message: `GitHub Pages: <SRC_BRANCH> <short sha> 배포` plus a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (L32-34).
   - Push with up to 4 attempts, sleep 2^i between (L35): `git push -q origin HEAD:gh-pages`.
   - Prints "배포 완료: gh-pages <sha>".
10. The source branch and any backup branch are not modified (per the header comment, L5).

Paths that reach the site: `index.html`, `sw.js`, `shared/`, `games/`, `common/`, `docs/`, and each game folder listed in GAME_DIRS. Not deployed: `assets/`, `art/`, and any other top-level path not in PATHS.
