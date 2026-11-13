# 엔진 다이제스트 (tk.js · hangul.js · 까꿍 · 그림책 · 정원)

읽기 전용 요약. 기준 파일과 줄 번호:
- `shared/tk.js` (343줄) — 캔버스 엔진, `window.TK`
- `shared/hangul.js` (405줄) — 한글 모듈, `window.H`
- `peekaboo/index.html` (563줄) — 단독 게임 "글자 까꿍" (엔진 미사용)
- `book/game.js` (96줄) — 엔진 게임 "공룡·고래 그림책"
- `garden/game.js` (197줄) — 엔진 게임 "꼬마 정원" (골격 참고용)

새 엔진 게임을 쓸 때 필요한 것만 정리했다. 원문 시그니처는 그대로 옮겼다.

---

## 0. 로딩 순서와 경로 규칙

게임 페이지는 보통 `<게임>/index.html` 한 단계 아래에 있어서 모든 공유 경로가 `../shared/…`이다.

```html
<canvas id="c"></canvas>
<script src="../shared/tk.js"></script>      <!-- 엔진 (window.TK) -->
<script src="../shared/hangul.js"></script>  <!-- 한글 (window.H), 엔진 없이도 동작 -->
<script src="game.js"></script>              <!-- 게임 본체 -->
<script src="../shared/frame.js"></script>   <!-- 집 버튼·별 시범·잘 시간 (엔진 게임은 window.__g / __demo 를 읽음) -->
```

- `tk.js`는 `document.getElementById('c')`를 캔버스로 쓴다. 캔버스 id는 반드시 `c`.
- `tk.js`가 `#snd` 소리 버튼(우상단)을 스스로 만든다. 게임은 따로 만들지 않는다.
- `hangul.js`는 `document.currentScript`로 자기 위치를 읽어 `SHARED` 경로를 잡는다. 그래서 `shared/` 바깥에서 읽어도 그림·음성 경로가 맞는다.
- 게임 파일은 IIFE `(() => { 'use strict'; … })();`로 감싼다 (book, garden 모두 이 형식).

### 이미지 경로 규칙

| 용도 | 경로 (게임 페이지 기준) | 읽는 곳 |
|---|---|---|
| 달리기·점프·웃음 스프라이트 | `../shared/assets/{name}.webp` (`tino_run_v2`, `tino_jump_v2`, `coco_run_v2`, `coco_jump_v2`, `coco_laugh_v2`) | tk.js 154–156 `SPR` |
| 티노·코코 손그림 동작 16장 | `../shared/pics/o_{tino|coco}_{pose}.webp` | tk.js 168 `poseImg` |
| 단어 그림 (공룡·고래·음식 등) | `shared/pics/{단어}.webp` (hangul.js 가 `SHARED + 'pics/' + encodeURIComponent(n)`) | hangul.js 132 `pload` |
| 물건 `o_*` | `shared/pics/o_{이름}.webp` (`H.lazyImg('o_rock')` 처럼 **접두어 포함** 이름) | hangul.js 151 |
| 배경 `bg_*` | `shared/pics/bg_{이름}.webp` (`H.drawBg(ctx,'bg_sea',…)`) | hangul.js 142–158 |

- 그림은 처음 쓸 때 읽는다 (lazy). 읽히기 전에는 `null`/`false`를 돌려주므로 코드 그림(폴백)을 그린다.
- 원본 PNG는 건드리지 않고 화면에서만 크기·반전한다.

### 현재 `shared/pics`의 `o_*` / `bg_*` 목록 (ls 결과 그대로)

배경 `bg_*` (11개):
`bg_band`, `bg_bath`, `bg_garden`, `bg_pk_beach`, `bg_pk_forest`, `bg_pk_night`, `bg_sea`, `bg_shapes`, `bg_sky`, `bg_stars`, `bg_steps`

물건·동작 `o_*` (90개):
- 물건: `o_balloon_b`, `o_balloon_g`, `o_balloon_r`, `o_balloon_y`, `o_basket`, `o_boat_hull`, `o_boat_sail`, `o_bucket`, `o_bud`, `o_bush`, `o_can`, `o_castle`, `o_cloud`, `o_dinoegg`, `o_drum`, `o_duck`, `o_finish`, `o_flag`, `o_flowers`, `o_foam`, `o_foot`, `o_gull`, `o_hay`, `o_heart`, `o_horn`, `o_leafpile`, `o_leaves`, `o_lifebuoy`, `o_log`, `o_mossrock`, `o_mud`, `o_mushroom`, `o_note`, `o_paint`, `o_raincloud`, `o_rock`, `o_sand`, `o_shell`, `o_shower`, `o_soap`, `o_soil`, `o_sponge`, `o_sprout`, `o_star`, `o_stump`, `o_tag`, `o_tamb`, `o_tent`, `o_tile`, `o_towel`, `o_toyboat`, `o_tub`, `o_weed`, `o_xylo`
- 티노 동작 (8): `o_tino_clap`, `o_tino_cheer`, `o_tino_point`, `o_tino_sleep`, `o_tino_sniff`, `o_tino_splash`, `o_tino_thumb`, `o_tino_wow`
- 코코 동작 (8): `o_coco_clap`, `o_coco_cheer`, `o_coco_point`, `o_coco_sleep`, `o_coco_sniff`, `o_coco_splash`, `o_coco_thumb`, `o_coco_wow`

(물건 `o_*`는 `o_` 접두어를 빼지 않고 그대로 넘긴다. 예: `HG.drawObj(ctx, 'o_basket', …)`.)

---

## 1. `shared/tk.js` — `window.TK`

### 1-1. 기본 수학·유틸 (9–20)

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `TK` | 9 | `window.TK = {}` | 네임스페이스 |
| `TK.TAU` | 10 | `Math.PI * 2` | 2π |
| `TK.rand` | 11 | `(a, b) => number` | a~b 사이 실수 난수 |
| `TK.clamp` | 12 | `(v, a, b) => number` | 범위 제한 |
| `TK.lerp` | 13 | `(a, b, t) => number` | 선형 보간 |
| `TK.ease` | 14 | `t => number` | 0~1 입력, 3차 감속 (ease-out cubic) |
| `TK.back` | 15 | `t => number` | 0~1, 살짝 넘쳤다 돌아오는 곡선 (튀어 오름) |
| `TK.shuffle` | 16 | `a => array` | 복사본을 섞어 반환 |
| `TK.pick` | 17 | `a => element` | 배열에서 하나 무작위 |
| `TK.dist` | 18 | `(ax, ay, bx, by) => number` | 두 점 거리 |
| `TK.COLS` | 19 | `[[r,g,b] × 7]` | 밝은 무지개 7색 |
| `TK.rgba` | 20 | `(c, a) => string` | `c=[r,g,b]`, `a`=투명도 → `"rgba(r,g,b,a)"` |

### 1-2. 캔버스·루프 (22–52)

| 이름 | 줄 | 설명 |
|---|---|---|
| `TK.ctx` | 24 | 2D 컨텍스트 (DPR 적용된 transform 이 이미 걸려 있음, 좌표는 CSS 픽셀) |
| `TK.W` | 25, 29 | `innerWidth` (리사이즈마다 갱신) |
| `TK.H` | 25, 29 | `innerHeight` |
| `TK.U` | 25, 32 | 단위 `Math.min(W, H) / 700`. 크기·속도에 곱해 기기마다 같은 비율로 |
| `TK.T` | 25, 43 | 누적 시간(초). 멈추면(`__paused`) 증가 안 함 |
| `TK.dt` | 43 | 이번 프레임 시간(초, 최대 0.05) |
| `TK.start` | 36 | `TK.start({ init?, update?, draw?, resize? })` — 루프 시작 |

`TK.start(g)` 동작 (36–52):
1. `game = g`, `resize()` 한 번 (`TK.U` 계산, 캔버스 크기 설정, `g.resize()` 호출).
2. `g.init()` 한 번.
3. 매 프레임: `dt` 계산 → `!window.__paused` 이면 `TK.T += dt; g.update(dt); updateParts(dt)` → `g.draw()` → 화면 전체 흰 flash (`TK.flash()` 후 0.55초 감쇠, 48행) → 다음 프레임.

`resize` 훅: `g.resize` 가 있으면 창 크기가 바뀔 때 호출. 보통 레이아웃 함수(`layout`)를 여기 넘긴다.

### 1-3. 그리기 도우미 (54–91)

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `TK.INK` | 57 | `'#3b2a20'` | 그림책 테두리 색 (진한 갈색) |
| `TK.ink` | 73 | `(lw, fn) => void` | `fn` 안에서 칠한 도형마다 갈색 테두리를 자동으로 붙임. `lw` 최소 1.2. 반투명 칠(`rgba(…, 0.x)`)은 테두리 없음 |
| `TK.ell` | 74 | `(x, y, rx, ry, rot = 0) => void` | 타원 경로만 만듦 (`beginPath` 포함). 칠은 호출자가 `fill()`/`stroke()` |
| `TK.star` | 75 | `(x, y, r, col, rot = 0) => void` | 별 5개 꼭짓점을 `col` 로 칠함 (save/restore 포함) |
| `TK.rr` | 80 | `(x, y, w, h, r) => void` | 둥근 사각형 경로만 만듦 |
| `TK.heart` | 85 | `(x, y, r, col) => void` | 하트를 `col` 로 바로 칠함 |
| `TK.grad` | 91 | `(y0, y1, c0, c1) => CanvasGradient` | 세로 선형 그라데이션 |

`TK.ink` 세부 (57–72): `ctx.fill` / `ctx.stroke` 를 감싸 두었다. `ink` 블록 밖에서는 아무 영향 없다. 블록 안에서는 칠한 모양의 바깥 테두리를 `TK.INK` 색 굵은 선으로 먼저 긋는다. 테두리 굵기 = `lw`.

### 1-4. 소리 (93–150)

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `TK.muted` | 95 | `boolean` | 소리 끔 상태 (`#snd` 버튼이 바꿈) |
| `TK.audio` | 96 | `() => AudioContext \| null` | WebAudio 를 처음 만들고 재개. 입력 이벤트마다 자동 호출됨 |
| `TK.audioState` | 104 | `() => 'running' \| 'suspended' \| 'none' …` | 상태 문자열 |
| `TK.suspend` | 105 | `() => void` | 화면이 가려질 때 정지 (frame.js 가 호출) |
| `TK.tone` | 106 | `(f, delay = 0, dur = 0.3, type = 'sine', vol = 0.3, f2 = 0) => void` | 음 하나. `f2` 가 있으면 `f`→`f2` 로 미끄러짐 |
| `TK.noise` | 115 | `(dur = 0.1, f = 2000, vol = 0.2, delay = 0, f2 = 0, q = 1.2) => void` | 밴드패스 노이즈 (쉿·첨벙 소리) |
| `TK.PENTA` | 124 | `[261.63 … 880.0]` | 5음계 주파수 배열 (10개) |
| `TK.sfx` | 125–140 | 아래 목록 | 효과음 묶음 |
| `TK.say` | 141 | `text => void` | 말하기. `H.speak` 가 있으면 그것으로 (기기 무음 대비) |

`TK.sfx` 목록 (전부 인자 없이 호출, `ting`·`giggle` 만 인자 있음):
- `pop()`, `boing()`, `ting(f = 1046.5)`, `soft()`, `down()`, `whoosh()`, `splash()`, `rustle()`, `squeak()`, `clap()`, `horn()`, `giggle(kind, delay = 0)` (kind `'tino'` 또는 `'coco'`), `fanfare()`, `sparkle()`

### 1-5. 스프라이트·티노/코코 (152–197)

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `TK.sprite` | 157 | `(name, x, yb, h, o = {}) => w` | 스프라이트 그리기. `name` 은 `'tino_run_v2'` 등 SPR 키. 밑변 가운데 `(x, yb)`, 키 `h`. 반환 폭 (로딩 전이면 0) |
| `TK.POSES` | 169 | `['clap','cheer','point','wow','splash','sniff','thumb','sleep']` | 손그림 동작 8종 (티노·코코 각각 있음 → 16장) |
| `TK.partyPose` | 170 | `i => 'clap' \| 'cheer'` | 축하 중 둘이 엇갈리게 손뼉/만세 |
| `TK.twin` | 174 | `(kind, pose, x, yb, h, o = {}) => w` | 티노/코코를 자세로 그림 (아래 표) |
| `TK.bob` | 196 | `(ph, amp, speed = 3.2) => number` | 콩콩 흔들림 `abs(sin(T*speed+ph))*amp` |
| `TK.hopY` | 197 | `(p, amp) => number` | 0~1 진행 `p` 를 포물선 높이로 (p<0 이면 0) |

`TK.sprite` 의 `o` 필드: `rot`(라디안), `sx`, `sy`(배율), `flip`(−1 이면 좌우 반전), `alpha`(0~1). 원본 PNG 를 그대로 쓰고 화면에서만 바꾼다.

`TK.twin(kind, pose, x, yb, h, o)`:
- `kind`: `'tino'` 또는 `'coco'`.
- `pose` 값:
  - 손그림 동작 (`POSES` 안의 8개): `'clap'`, `'cheer'`, `'point'`, `'wow'`, `'splash'`, `'sniff'`, `'thumb'`, `'sleep'`. 그림 파일이 아직 없으면 `'happy'` 로 대신.
  - `'idle'`: 달리기 그림 (`kind + '_run_v2'`). 방향은 `face`.
  - `'jump'`: 점프 그림 (`kind + '_jump_v2'`).
  - `'happy'` (또는 위에 없는 값): 티노는 `tino_jump_v2`, 코코는 `coco_laugh_v2`.
- `o` 필드:
  - `face`: `'right'` 또는 `'left'` (idle 일 때만). 기본은 티노 `'right'`, 코코 `'left'`. 원본 달리기 그림은 왼쪽을 보므로 `'right'` 면 뒤집음.
  - `mirror`: true 면 손그림 동작을 좌우 반전 (코코 `point` 는 원래 왼쪽을 가리킴).
  - `hop`: 0~1 진행. 뛰기 직전·착지 순간 찌그러짐 효과 (`null` 또는 음수면 없음).
  - `rot`, `alpha`, `sx`, `sy` (sprite 와 같음).
- 반환: 그려진 폭.
- 손그림 동작은 `splash`·`sleep` 일 때 높이를 0.78배, 그 밖은 0.94배.

### 1-6. 효과 파티클 (199–242)

파티클은 모듈 안 배열 `TK.parts` (200) 에 쌓이고, `updateParts` 가 매 프레임 갱신, `TK.drawParts()` 가 그린다. 게임은 `TK.drawParts()` 를 draw 끝에 한 번 호출해야 보인다.

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `TK.parts` | 200 | `Array` | 파티클 배열 (직접 push 해도 됨: `{t:'drop', x, y, vx, vy, r, life, max, c, g}` 형식) |
| `TK.spark` | 201 | `(x, y, c, n = 10, spd = 1)` | 별 모양 불꽃이 사방으로 (`c` = `[r,g,b]`) |
| `TK.hearts` | 202 | `(x, y, n = 6)` | 하트가 위로 떠오름 |
| `TK.ring` | 203 | `(x, y, r, c, grow = 120)` | 점점 커지는 고리 (탭한 자리 표시에 씀) |
| `TK.drops` | 204 | `(x, y, c, n = 8, spd = 1)` | 물방울 튀김 (중력 있음) |
| `TK.foam` | 205 | `(x, y, n = 3)` | 흰 거품 (목욕 등) |
| `TK.confetti` | 206 | `dt => void` | 색종이 흩날림 (호출마다 확률로 한 장씩, 축하 중 매 프레임 호출) |
| `TK.clearParts` | 207 | `() => void` | 파티클 전부 지움 |
| `TK.wordPop` | 209 | `(w, x, y, size)` | 단어를 크게 띄움 (완성 축하). `size` 생략 시 화면 작은 쪽의 13%, 화면 폭 안에 맞춤 |
| `TK.flash` | 212 | `() => void` | 화면이 하얗게 번졌다 0.55초 동안 사라짐 (판 바뀔 때) |
| `TK.drawParts` | 227 | `() => void` | 파티클 전부 그림 (spark, heart, ring, drop, foam, word, conf 종류) |

### 1-7. 입력 (244–273)

```js
TK.input({
  down(p) {},   // 손가락/마우스가 눌림
  move(p) {},   // 움직임 (눌린 손가락, 그리고 마우스 hover 도 올 수 있음 — p.down === false)
  up(p) {},     // 떼어짐 (pointerup / pointercancel)
  key(e) {}     // 아무 키 (KeyboardEvent e)
});
```

- `TK.input(h)` (248): 핸들러 객체를 한 번에 등록. 다시 부르면 바뀜.
- 포인터 객체 `p` 필드:
  - `id`: `pointerType + pointerId` 문자열 (여러 손가락 구분용)
  - `x`, `y`: 화면 CSS 좌표
  - `down`: 아직 눌려 있으면 true
  - `x0`, `y0`, `t0`: **down 에서만** 있는 시작 좌표와 시작 시각 (`TK.T` 기준)
  - 게임이 직접 붙일 수 있음 (예: garden 이 `p.lx` 를 저장)
- `down` 은 캔버스 위 `pointerdown` 에서만 (250). `TK.audio()` 를 먼저 깨운다. `__paused` 면 무시.
- `move` 는 캔버스 위 (257). 눌린 손가락이 없고 마우스가 아니면 무시.
- `up` 은 창 전체 `pointerup`/`pointercancel` (263). 포인터 맵에서 지운 뒤 호출.
- `key` 는 창 전체 `keydown` (268). Ctrl/Meta/Alt/Tab/F키는 무시. **0.3초 안에 같은 키 반복은 무시** (TK.T 기준).
- 모든 입력은 `preventDefault()` 된다 (우클릭 메뉴 막음 포함).
- 현재 눌린 포인터 전체: `TK.pointers` (Map, 246).

### 1-8. 친구 그림 (290–342)

| 이름 | 줄 | 설명 |
|---|---|---|
| `TK.FRIENDS` | 290 | `['crab','fish','starfish','jelly','bunny','frog','chick','butterfly','owl','skystar']` |
| `TK.drawFriend` | 291 | `(kind, h)` — 밑변 가운데 (0,0), 키 h 의 손그림풍 친구. 위 10종 |

`TK.drawFriend` 는 이 세 파일에서는 호출되지 않는다 (까꿍은 자체 복사본을 가짐, 아래 3장 참고). 쓰려면 `TK.drawFriend(kind, h)` 로 부른다.

### 1-9. 부모용 UI (275–286)

`#snd` 소리 버튼을 만든다 (64×64px, 우상단). 클릭 → `TK.muted` 토글 → `master.gain` 조정. 게임은 손대지 않는다.

---

## 2. `shared/hangul.js` — `window.H`

### 2-1. 설정 (21–25)

- `H.cfg()` (24): `() => { names, stage, focus, fav }` — 기본값과 `localStorage['tk-hangul']` 를 합친 객체. 기본:
  ```js
  { names: ['', ''], stage: 2, focus: [], fav: ['공룡', '고래'] }
  ```
  - `names`: 아이 이름 최대 2개 (단어로도 씀, `child: true`)
  - `stage`: 1 (듣고 보기, 자음 `EASY` 4개) / 2 (기본, `BASIC` 8개 자음 + 모양) / 3 (`JAMO` 14개 + 가나다)
  - `focus`: 이번 주 글자 (자음 배열). 이 글자로 시작하는 단어가 3배 자주 나옴
  - `fav`: 좋아하는 것 키 (`'공룡'`, `'고래'`). 관련 단어 3배 자주
- `H.saveCfg(c)` (25): `c` 를 저장.

### 2-2. 자모 (27–71)

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `H.cho` | 30 | `s => '' \| 'ㄱ'…` | 글자의 초성 (쌍자음은 평자음으로: ㄲ→ㄱ) |
| `H.JAMO` | 31 | `['ㄱ','ㄴ',…,'ㅎ']` (14개) | 기본 자음 |
| `H.JAMO_NAME` | 32 | `{ 'ㄱ': '기역', … }` | 자음 이름 (읽을 때 씀) |
| `H.GANA` | 33 | `['가','나','다','라','마','바','사']` | 가나다 줄 |
| `H.jamoSet` | 36 | `() => array` | 지금 단계에서 쓸 자음 + focus (중복 없음) |
| `H.pickJamo` | 38 | `n => array` | 자음 n개 고르기 (focus 가 앞) |
| `H.STROKES` | 42–57 | `{ 'ㄱ': [획, …], … }` | 자음 14개 획 좌표 (0~1 상자). 획 = 점 배열, `closed:true` 면 동그라미 |
| `H.starPoints` | 59 | `j => [{pts, closed}]` | 획 사이 점을 채운 별자리용 점 목록 |
| `H.drawJamo` | 66 | `(ctx, j, x, y, size, color, width = 0.17)` | 자음 한 개 획 그리기. `(x,y)` 가운데, `size` 상자 크기. 선 굵기 = `size*width` |

### 2-3. 단어 사전 (73–120)

`H.WORDS` (75–87): 배열. 항목 형식:
```js
{ w: '나비', cat: 'animal', syl: ['나','비'], cho: 'ㄴ' }
```
- `w`: 단어 문자열
- `cat`: `'name'`(이름) / `'animal'`(동물) / `'food'`(먹을 것) / `'thing'`(물건·자연)
- `syl`: 음절 배열 (`[...w]`)
- `cho`: 첫 초성 (`H.cho(w)`)
- 아이 이름 항목은 `H.words()` 가 만들며 `child: true` 가 붙는다.
- 공룡 7종 (`티라노사우루스` 등), 고래 7종 (`혹등고래` 등) 이 여기 기본으로 있다.
- 추가 공룡 16종 (`MORE_DINOS`, 92행) · 추가 고래 16종 (`MORE_WHALES`, 94행) 은 **그림 파일이 있는 것만** 나중(134행)에 `H.DINOS`, `H.WHALES`, `H.FAV`, `H.WORDS` 에 넣는다.

| 이름 | 줄 | 시그니처 / 값 | 설명 |
|---|---|---|---|
| `H.DINOS` | 89 | `[7 + 추가]` 단어 배열 | 공룡 묶음 |
| `H.WHALES` | 90 | `[7 + 추가]` 단어 배열 | 고래 묶음 |
| `H.FAV` | 96 | `{ '공룡': ['공룡', …DINOS], '고래': ['고래', …WHALES] }` | 좋아하는 것 키 → 단어 목록 |
| `H.favWords` | 97 | `() => array` | `cfg.fav` 에 든 묶음의 단어 전부 |
| `H.likes` | 98 | `k => boolean` | `cfg.fav` 에 `k` 가 있는지 |
| `H.words` | 100 | `() => array` | 아이 이름 (`child:true`) + `H.WORDS` |
| `H.word` | 104 | `w => entry` | 단어 항목 찾기 (없으면 `{w, cat:'thing', syl, cho}` 로 만들어 반환) |
| `H.pick` | 106 | `(n, o = {}) => array` | 단어 n개 뽑기 (아래 옵션) |
| `H.example` | 118 | `j => entry` | 자음 `j` 로 시작하는 대표 단어 (좋아하는 것 우선) |
| `H.FRIEND_NAME` | 120 | `{ crab: '게', fish: '물고기', … }` | 친구 그림 종류 → 이름 |

`H.pick(n, o)` 옵션:
- `cat`: 문자열 또는 배열 (예: `['animal','food','thing']`)
- `exclude`: 제외할 단어 문자열 배열
- `pic`: true 면 그림이 있는 단어만 (`H.hasPic`)
- 가중치: focus 초성 ×3, 아이 이름 ×2, 좋아하는 것 ×3 (곱셈)
- 반환: 단어 **항목 객체** 배열 (문자열 아님). `H.preload` 를 자동 호출.

### 2-4. 그림 (122–246, 손그림 목록 129–138)

`PIC_FILES` 배열 (129행) 은 `/*PICS*/ … /*END*/` 사이에 있고, `build_games.py` 가 `shared/pics/` 에 실제 있는 파일 목록으로 다시 쓴다. 이 목록에 든 단어만 손그림을 받는다. 그 밖은 `PICS` (코드 그림, 165–236행 `P('이름', fn)`) 로 그린다.

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `H.preload` | 133 | `ws => void` | 단어 항목 하나 또는 배열을 받아 그림을 미리 읽음 (`PIC_FILES` 에 있는 것만) |
| `H.picImg` | 137 | `w => Image \| null` | 손그림이 다 읽혔으면 Image, 아니면 null |
| `H.hasPic` | 138 | `w => boolean` | 코드 그림이나 손그림이 있는 단어인지 |
| `H.drawPic` | 162 | `(ctx, w, h) => void` | 단어 그림. **원점 = 밑변 가운데**, `h` = 키. 손그림은 높이 `h`, 폭 최대 `1.5h` 안에 맞춤. 받는 중이면 아무것도 안 그림 (깜빡임 방지). 손그림이 없으면 코드 그림 (`PICS[w]`, 없으면 별 `PICS['*']`) |
| `H.drawObj` | 153 | `(ctx, name, x, yb, h, maxW = 1e9) => boolean` | `o_*` 물건. `(x, yb)` 밑변 가운데, 키 `h`, 폭이 `maxW` 넘으면 줄임. 아직 안 읽혔으면 `false` (호출자가 코드 그림으로 대신) |
| `H.lazyImg` | 151 | `name => Image \| null` | 이름(접두어 포함)으로 이미지 읽기. 완료되면 Image |
| `H.bgFit` | 142 | `(name, x, y, w, h, ax = 0.5, ay = 0.5) => {im, dx, dy, dw, dh, pt(u,v)} \| null` | 배경을 사각형에 빈틈없이 덮게 계산. `ax`/`ay` = 잘릴 때 남길 쪽 (0 왼쪽/위, 1 오른쪽/아래). `pt(u,v)` 는 그림 비율 좌표 → 화면 좌표 |
| `H.drawBg` | 158 | `(ctx, name, x, y, w, h, ax, ay) => f \| null` | `bgFit` 으로 계산해 바로 그림. 아직 없으면 `null` (호출자가 폴백 그림) |
| `H.drawSil` | 240 | `(ctx, w, x, yb, h, color)` | 그림을 한 색 그림자로 (모양 맞추기용) |

`H.drawPic` 의 코드 그림 폴백 (165–236행): `P('티노', …)`, `P('코코', …)`, `P('엄마 아빠', …)`, `P('나비', …)`, `P('토끼', …)`, `P('개구리', …)`, `P('해파리', …)`, `P('게', …)`, `P('오리', …)`, `P('하마', …)`, `P('고래', …)`, `P('사자', …)`, `P('거미', …)`, `P('사과', …)`, `P('바나나', …)`, `P('포도', …)`, `P('우유', …)`, `P('토마토', …)`, `P('오이', …)`, `P('피자', …)`, `P('치즈', …)`, `P('도토리', …)`, `P('모자', …)`, `P('바지', …)`, `P('나무', …)`, `P('해', …)`, `P('기차', …)`, `P('라디오', …)`, `P('지구', …)`, `P('공룡', …)`, `P('티라노', …)`, `P('범고래', …)`, `P('*', …)`. (이름이 없는 단어는 `'*'` 별.)

`H.drawBg` 로 쓰는 배경 이름 예: `'bg_sea'`, `'bg_pk_forest'`, `'bg_pk_beach'`, `'bg_pk_night'`, `'bg_garden'`.

### 2-5. 글자 그리기 (248–279)

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `H.FONT` | 16 | `'"Apple SD Gothic Neo","Noto Sans KR",…,sans-serif'` | 글꼴 문자열 |
| `H.drawWord` | 250 | `(ctx, w, x, y, size, o = {}) => width` | 음절마다 따로 그림. `(x,y)` 가운데. 옵션 `o`: `hi` (강조할 음절 번호, `'all'` 이면 전부 살짝 키움), `hiColor` (강조 색, 기본 `#ff6b3d`), `color` (기본 `#2b3550`), `outline` (외곽선, 기본 흰색 0.95), `maxW` (폭 넘으면 줄임) |
| `H.drawTag` | 267 | `(ctx, w, x, y, size, o = {}) => void` | 이름표. 둥근 카드 (또는 손그림 `o_tag` 가 있으면 그것, 가운데만 늘림) + `drawWord`. 옵션 `bg` (카드 색), `border` (테두리 색), `hi`, `outline`. 4음절 넘으면 글자 자동 축소 |

### 2-6. 음성 (281–372)

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `H.voices` | 283 | `Map(글자 → blob URL)` | 부모가 녹음한 목소리 |
| `H.koVoice` | 287 | `() => SpeechSynthesisVoice \| null` | 한국어 음성 고르기 (기기 내장 우선, 한번 고르면 고정) |
| `H.RATE` | 298 | `0.9` | 말하기 속도 |
| `H.PITCH` | 298 | `1.0` | 높이 |
| `H.speakSeq` | 306 | `(parts, onStart) => void` | 여러 조각을 같은 억양으로 이어 말함. `onStart(i)` 는 i번째 조각 시작 때 호출, 끝나면 `onStart(-1)` |
| `H.speak` | 322 | `text => void` | 한 문장 말하기 (`speakSeq([text])`) |
| `H.say` | 343 | `(text, key) => void` | 녹음이 있으면 녹음, 없으면 `speak` |
| `H.read` | 346 | `(w, pre = '') => void` | 단어 읽기: `pre` 다음 음절 하나씩, 마지막에 단어 전체. 예: `H.read('나비', '까꿍! ')` → "까꿍. 나. 비. 나비." `H.reading` 상태를 세움 |
| `H.hi` | 357 | `w => number \| 'all' \| -1` | 지금 강조할 음절 번호 (그릴 때 매 프레임 물어봄). 음성 신호 없으면 시간으로 짐작. `-1` 은 강조 없음 |
| `H.readJamo` | 366 | `j => void` | 자음 읽기: "기역. 고래." (자음 이름 + 대표 단어) |
| `H.saySyl` | 372 | `s => void` | 음절 하나 읽기 |
| `H.readOnRelease` | 337 | `fn => void` | 끌기 도중 읽을 때: 손을 떼는 순간 `fn` 실행 (1.2초 넘으면 그냥 실행) |
| `H.speaking` | 340 | `() => boolean` | 지금 말하는 중인지 (배경음악 줄이기용) |
| `H.hush` | 342 | `() => void` | 말 멈추기 (화면 가려질 때 frame.js 가 호출) |

### 2-7. 기록·녹음 (374–404)

| 이름 | 줄 | 시그니처 | 설명 |
|---|---|---|---|
| `H.recLoad` | 382 | `() => Promise<Map>` | IndexedDB `tk-voice` 에서 녹음 불러오기 (페이지 열 때 자동 호출, 385행) |
| `H.recSave` | 383 | `(key, blob) => Promise` | 녹음 저장 |
| `H.recDel` | 384 | `key => Promise` | 녹음 삭제 |
| `H.log` | 390 | `(kind, key) => void` | 오늘 본 글자 기록 (`kind`: `'w'` 단어, `'j'` 자음, `'s'` 음절). `localStorage` 에 저장 |
| `H.todayLog` | 389 | `() => {day, w, j, s}` | 오늘 기록 |
| `H.weekLog` | 401 | `() => {days, w, j, s}` | 최근 7일 합계 |
| `H.shuffle` | 404 | `a => array` | 배열 섞기 (사본) |

`H.read` 와 `H.readJamo` 는 자동으로 `H.log` 를 부른다 (`H.read` 349행: `H.log('w', w)`).

---

## 3. `peekaboo/index.html` — "글자 까꿍" (단독 게임, 엔진 미사용)

### 3-1. 구조 차이 (엔진 게임과 비교)

| 항목 | 엔진 게임 (book, garden) | 까꿍 (peekaboo) |
|---|---|---|
| 캔버스 루프 | `TK.start` | 자체 `frame(now)` (537–538행) |
| 스프라이트 로더 | `TK.sprite` / `TK.twin` | 자체 `SPR` + `drawSprite` (83–93행) |
| 소리 | `TK.sfx`, `TK.tone`, `TK.noise` | 자체 복사본 `tone`, `noise`, `sRustle`, `sBoing`, `sGiggle` 등 (95–145행) |
| 입력 | `TK.input` (down/move/up/key) | `cv` 의 `pointerdown` + `keydown` 직접 (261–275행). move/up 없음 |
| 파티클 | `TK.parts` 등 | 자체 `parts` 배열 + `drawParts`, `burst`, `hearts` (198–203, 490–505행) |
| 음성 | `TK.say`/`H.read` | `HG.read` (H 모듈) 직접 |
| 소리 버튼 | `tk.js` 가 생성 | HTML 에 직접 `<button id="snd">` + 자체 CSS (14–35행) |
| 음악 | (없음) | `shared/music.js` 로드 후 `TKMusic.play('play')` (37–38행) |
| 공유 엔진 | `shared/tk.js` 로드 | **로드 안 함**. `hangul.js` 만 로드 (36행) |
| 리사이즈 | `TK.start` 가 `game.resize` 호출 | 자체 `addEventListener('resize', resize)` (539행) |

- 까꿍의 `const HG = window.H;` (42행) 로 한글 모듈을 쓴다. 파일 안의 `H` 는 화면 높이 변수 (72행) 이므로 이름이 겹치지 않게 `HG` 로 잡았다.
- `frame.js` 연결용으로 `window.__audioUnlock = audio;` (547행), `window.__demo` (548–554행), `window.__pk` (557–558행) 를 노출한다.

### 3-2. 규칙과 흐름

- 장면 3개가 순서대로 돈다: 바닷가 → 숲 → 밤 → 다시 바닷가 (`sceneIdx = (sceneIdx + 1) % 3`, 211행).
- 장면마다 물건 6개가 있고, 그 뒤에 내용물 6개가 있다: **티노, 코코 + 그림 단어 4개** (174행). 내용물은 섞어서 물건에 배정 (`contents`).
- 물건 하나를 탭하면 뒤에서 튀어나온다. 어떤 물건을 눌러도 뭔가 나온다 (틀림 없음).
  - 티노/코코: 찾은 상태 (`found`) 로 남고, 둘 다 찾으면 축하.
  - 그림 단어: 3초 보여 준 뒤 내려감 (`hold` 3.0초, 229행).
- 장면 시작 (intro, 2.0초): 가운데에서 티노·코코가 콩콩 뛰다가 각자 숨을 물건으로 날아감 (`drawIntro`, 507–523행). 1.2초에 휘익 소리 (`sWhoosh`, 207행). 2.0초 뒤 `play`.
- 둘 다 찾으면 `phase = 'party'` (3.4초): 색종이 (`TK.confetti` 대신 자체 `conf` 파티클 238–239행), 팡파르 (300ms 뒤), "찾았다!" (150ms 뒤 `say`). 티노·코코가 신나게 뜀.
- 3.4초 뒤 `wipe` (흰 원이 덮임, 0.6초), 장면 바꾸고 `wipein` (0.6초 걷힘), 다시 `intro`.
- 찾기 힌트: 자동 힌트 끔 (`wantHint = false`, 234행). 힌트는 `frame.js` 별 시범 (`__demo`) 으로 통일.

### 3-3. 읽기와 소리

`tapObj(o)` (183–193행):
- `phase !== 'play'` 면 무시.
- 이미 찾은 티노/코코를 다시 누르면 `sGiggle` + 하트 + `HG.read('티노'|'코코')`.
- `idle` 이면: `o.st = 'up'`, `sRustle` + `sBoing`, `HG.read(이름, '까꿍! ')` → 음성은 "까꿍. 나. 비. 나비." 식으로 나옴. 티노/코코면 `sGiggle`. 물건 위에 `burst` 불꽃 (티노 노랑, 코코 파랑, 그림 흰색).
- 음절 읽기 중에는 `drawPeeker` 가 `HG.drawTag(ctx, label, …, {hi: HG.hi(label)})` 로 읽는 음절을 키운다.

`update` 물건 상태 기계 (215–237행):
- `idle` → (탭) → `up` (0.4초, `back` 곡선으로 올라옴) → 티노/코코면 `found` (`found++`, 하트), 아니면 `hold` (3.0초) → `down` (0.4초) → `idle`.
- `found` 가 2개 되면 `phase = 'party'`.
- `lastFindT` 는 찾을 때마다 갱신 (데모가 9초 지연을 셈).

키보드 (268–275행): 0.35초 간격. 아무 키나 누르면 `idle` 인 물건 중 무작위 하나 탭.

빈 곳 탭 (265행): 흰 고리 + `sTapBg` (작은 소리).

### 3-4. 장면 데이터 (148–152행)

```js
const SCENES = [
  { name: 'beach',  objs: ['rock', 'castle', 'bucket', 'shell', 'weed', 'log'],          friends: ['crab', 'fish', 'starfish', 'jelly'] },
  { name: 'forest', objs: ['bush', 'stump', 'mushroom', 'flowers', 'log', 'mossrock'],   friends: ['bunny', 'frog', 'chick', 'butterfly'] },
  { name: 'night',  objs: ['tent', 'bush', 'hay', 'cloud', 'mushroom', 'mossrock'],      friends: ['owl', 'bunny', 'frog', 'skystar'] },
];
```

- 물건 이름 14종 모두 `shared/pics/o_{이름}.webp` 가 있다 (`o_rock`, `o_castle`, `o_bucket`, `o_shell`, `o_weed`, `o_log`, `o_bush`, `o_stump`, `o_mushroom`, `o_flowers`, `o_mossrock`, `o_tent`, `o_hay`, `o_cloud`). 없을 때의 코드 그림은 `drawObj` (315–403행) 에 있다.
- `friends` 배열은 **쓰이지 않는다**. `drawFriend` (406행) 도 정의만 있고 호출되지 않는다. 내용물은 항상 `HG.pick` 으로 뽑은 **단어 그림** 이다.
- 배경: `HG.drawBg(ctx, 'bg_pk_' + sc, 0, 0, W, H, 0.5, sc === 'night' ? 1 : 0.6)` (283행). 파일은 `bg_pk_beach`, `bg_pk_forest`, `bg_pk_night`. 없으면 코드로 그린 폴백 (286–310행).

### 3-5. 내용물 고르기 (174행)

```js
const contents = ['tino', 'coco', ...HG.pick(4, { pic: true, cat: ['animal', 'food', 'thing'] }).map(o => o.w)].sort(() => Math.random() - 0.5);
```
- `name` 분류 (아이 이름) 는 제외. 그림이 있는 단어만 (`pic: true`).
- 이번 주 글자 (`H.cfg().focus`) 로 시작하는 단어 3배, 좋아하는 것 3배 (H.pick 가중치).
- 장면마다 새로 뽑고, 물건 배정은 무작위.

### 3-6. 배치 (158–169행)

```js
cols = W >= H ? 3 : 2; rows = 6 / cols;
top = H * 0.27; areaH = H * 0.7; cw = W / cols; ch = areaH / rows;
OS = Math.min(cw / 2.15, ch / 1.55);          // 물건 크기 단위
o.x = clamp(cw*(c+0.5) + o.jx*cw*0.06, OS, W-OS);
o.y = top + ch*(r+1) - ch*0.12;
o.s = OS;
```
- 가로 화면 3열 × 2행, 세로 화면 2열 × 3행.
- `o.jx` 는 빌드할 때 한 번 정한 −1~1 난수 (흔들림 방지용 고정).

### 3-7. 그리는 순서 (524–534행)

```
draw():
  drawBg()                                  // 장면 배경
  물건을 y 순서(위쪽 먼저)로 정렬한 뒤:
    drawPeeker(o)                           // 튀어나오는 아이/그림 (물건 아래쪽은 clip 으로 가림)
    drawObj(o)                              // 물건 (앞에 옴)
  drawIntro()                               // intro 중 날아가는 티노·코코
  drawParts()                               // 파티클
  wipe > 0 이면 흰 원                       // 장면 전환
```
- `drawPeeker` (461–487행): 높이 `h = s*1.5` (티노·코코) 또는 `s*1.0` (그림). `peek` = `o.open` (0~1). 파티·축하 중에는 `bounce` 로 들썩. 찾은 코코는 `coco_laugh_v2`, 숨은 코코는 `coco_jump_v2`, 티노는 `tino_jump_v2`. 그림은 `HG.drawPic(ctx, o.content, h)`.
- 튀어나온 뒤 (`o.open > 0.6`) 이름표 `HG.drawTag` 를 머리 위에.

### 3-8. 상태 변수 (153–156행)

- `sceneIdx` (0~2), `objs` (물건 배열: `{type, content, st, t, open, wig, jx, hint, x, y, s, cheer}`)
- `phase` (`'intro'` / `'play'` / `'party'` / `'wipe'` / `'wipein'`), `phaseT` (단계 경과 초)
- `T` (누적 초, 자체 변수), `lastFindT`, `found`, `wipe` (0~1), `parts`
- `cols`, `rows`, `OS`, `stars` (밤 하늘 별 50개), `twinsIntro` (intro 용 `[{kind:'tino'},{kind:'coco'}]`, `target` 은 buildScene 에서 붙음)
- `W`, `H`, `U` (154행 근처의 `let`, resize 에서 설정)

---

## 4. `book/game.js` — "공룡·고래 그림책" (엔진 게임)

### 4-1. 규칙

- 한 장에 친구 하나. 공룡은 숲 배경 (`bg_pk_forest`), 고래는 바다 (`bg_sea`).
- 친구를 톡하면 콩 뛰면서 이름을 글자마다 읽는다 (`read()`, 19행).
- 양옆 큰 화살표를 톡 → 다음/이전 친구. 가로로 쓱 넘겨도 됨 (`up`, 39–41행). 키보드 ←는 이전, 그 밖의 키는 다음 (46행).
- 좋아하는 것 (`H.likes`) 을 켜면 그쪽이 먼저. 둘이 번갈아 (`makeList`, 9–16행).
- 점수·모으기 없음. 화면 아래 점 (최대 12개) 으로 몇 번째인지만 표시.

### 4-2. 목록 순서 (9–16행)

```js
const d = HG.DINOS.filter(HG.hasPic), w = HG.WHALES.filter(HG.hasPic);
const likeD = HG.likes('공룡'), likeW = HG.likes('고래');
const a = likeW && !likeD ? [w, d] : [d, w];   // 좋아하는 쪽 먼저
const out = []; for (let i = 0; i < Math.max(d.length, w.length); i++) { if (a[0][i]) out.push(a[0][i]); if (a[1][i]) out.push(a[1][i]); }
list = out.length ? out : ['공룡', '고래'];
HG.preload(list.slice(0, 3));
```
- `hasPic` 이 false 인 공룡·고래는 빠진다.
- `init()` 에서 한 번 만든다 (`TK.start` 의 `init`, 95행).

### 4-3. 배치 `geo()` (28–32행)

```js
const geo = () => {
  const W = TK.W, H = TK.H, port = W < H;
  const ph = Math.min(port ? W * 0.62 : H * 0.5, H * 0.42);     // 친구 키
  return { W, H, port, ph,
           cx: W / 2,
           base: H * (port ? 0.6 : 0.66),                        // 친구 밑변 y
           tagY: H * (port ? 0.7 : 0.8),                         // 이름표 y
           arr: Math.min(W, H) * 0.1 };                          // 화살표 반지름
};
```
- `layout()` (27행) 은 비어 있다 (`TK.start` 의 `resize` 훅으로 등록만 함). 배치는 `geo()` 가 매번 계산.
- `hitFriend(x, y)` (33행): `|x - cx| < ph*0.8 && base - ph*1.05 < y < tagY + ph*0.2`.
- 화살표 위치: 왼쪽 `arr*1.15`, 오른쪽 `W - arr*1.15`, 세로 `H*0.5`. 화살표 탭 영역은 가장자리 `arr*2.2`.

### 4-4. 입력 (35–47행)

```
down(p)  → down = {x, y}
up(p):
  dx, dy = 이동량
  |dx| > W*0.12 이고 |dx| > |dy|  → go(dx<0 ? 1 : -1)      // 쓱 넘기기
  x < arr*2.2                    → go(-1)                    // 왼쪽 화살표
  x > W - arr*2.2                → go(1)                     // 오른쪽 화살표
  hitFriend(x, y)                → read(); TK.spark(...10); sfx.pop
  그 밖                          → twinHop[왼쪽/오른쪽 쪽 티노·코코] = 0  (옆 아이가 콩)
key(e): ArrowLeft → go(-1), 그 밖 → go(1)
```

`go(d)` (20–25행): `idx` 를 순환 이동, `slide = 1`, `dir = d`, 이웃 두 장 미리 읽기, `sfx.whoosh()`, 250ms 뒤 `read()`. `read()` 는 `HG.read(cur())` + `hop = 0`.

### 4-5. 갱신 `update(dt)` (49–54행)

- `slide` 가 `dt*3.2` 만큼 줄어듦 (1 → 0). 넘기는 중 미끄러짐 양.
- `hop` 0 → 1 (`dt*2.2`), 끝나면 −1 (친구 콩 뜀).
- `twinHop[i]` 0 → 1 (`dt*2.4`), 끝나면 −1 (티노/코코 한 번씩 뜀).

### 4-6. 그리는 순서 (64–87행)

1. 배경: 고래면 `bg_sea` (ax 0.5, ay 0.45), 공룡이면 `bg_pk_forest` (ax 0.5, ay 0.6). 없으면 `TK.grad` 폴백.
2. 친구: `off = ease(slide) * W * 0.6 * dir` (넘길 때 옆에서 미끄러짐). 고래는 `sway = sin(T*1.8)*ph*0.03` (둥실), 공룡은 `TK.bob`. 그림자 타원 → 친구 그림 `HG.drawPic(ctx, w, sea ? ph*0.72 : ph)`. 착지 찌그러짐 (hop < 0.15).
3. 이름표: `HG.drawTag(ctx, w, cx, tagY, fs * …, {hi: HG.hi(w)})`. `fs = min(W*0.84/(n*1.02+0.7), min(W,H)*0.11)`. 글자 4개 넘으면 `min(2, n/4.5)` 배로 키움 (drawTag 가 다시 줄이므로).
4. 화살표 2개 (`drawArrow`, 56–63행): 흰 원 + 주황 삼각 (`d` = −1 왼쪽, 1 오른쪽).
5. 티노·코코: 왼쪽 `W*0.13`, 오른쪽 `W*0.87`, 키 `H*(port?0.16:0.26)`. 포즈: 자기 차례면 `clap`, 친구가 콩 뛸 때 (`hop 0~0.6`) `wow`, 아니면 `idle`. `face` 는 왼쪽 티노 right, 오른쪽 코코 left.
6. 점 표시: 최대 12개, 가운데 아래 `H*0.955`, 현재 자리는 주황.
7. `TK.drawParts()`.

### 4-7. 테스트·데모 훅 (89–95행)

```js
window.__g = { idx, word, count, next(), show(w), actions() /* 오른쪽 화살표 탭 */ };
window.__demo = () => ({ kind: 'tap', x: TK.W - geo().arr * 1.15, y: TK.H * 0.5, say: '옆으로 넘겨 봐요' });
TK.start({ resize: layout, init() { makeList(); }, update, draw });
```

---

## 5. `garden/game.js` — "꼬마 정원" (엔진 게임, 골격 참고)

### 5-1. 규칙 요약

- 흙더미 4개 (세트 3개가 순환, 7행 `SETS`). 흙을 누르면 비구름 → 새싹(1) → 잎(2) → 봉오리(3) → 꽃·열매(4) (`grow`, 27–37행). 흙 위를 문지르면 쑥쑥 (`move`, 48–53행).
- 전부 다 자라면 `harvest` (바구니로 날아감, 0.35초 간격), 이어 `party` (3.2초), 다음 세트 (`newSet`).
- 다 자란 식물을 누르면 이름을 읽는다 (`HG.read`).
- 공룡알 칸은 "공룡" 이 `cfg.fav` 에 있을 때만 (없으면 호박으로 바꿈, 24행).

### 5-2. 골격 (실제 줄)

```js
(() => {
const { ctx, ell, rand, clamp, sfx } = TK;           // 5행: 엔진 도구는 구조분해
const HG = window.H;                                  // 6행: 한글 모듈

let phase = 'play', phaseT = 0, plots = [], basket = {…}, flying = [], twins = [{kind:'tino',hop:-1},{kind:'coco',hop:-1}];

function layout() {                                   // 15–22행: 화면 크기에 맞춰 좌표 계산 (TK.W/H 사용)
  const W = TK.W, H = TK.H, port = W < H;
  S = port ? … : …;                                   // S = 기본 단위
  plots.forEach((p, i) => { p.x = pos[i][0] * W; p.y = pos[i][1] * H; });
  …
}
function newSet() { plots = …; layout(); }            // 23–26행
TK.input({ down(p){…}, move(p){…}, key(){…} });       // 40–55행: 입력
function update(dt) { phaseT += dt; … }               // 57–73행: 상태 전이 (play → harvest → party → play)
function draw() { … }                                  // 145–184행: 배경 → 식물 → 바구니 → 날아가는 것 → 아이들 → TK.drawParts()
window.__g = { get phase(){…}, get rounds(){…}, actions(){…} };   // 186–189행: 테스트 훅
window.__demo = () => { … };                          // 191–195행: 별 시범 (화면에 "톡톡, 물 주자!")
TK.start({ resize: layout, init() { newSet(); lastGrow = TK.T; }, update, draw });   // 196행
})();
```

### 5-3. 골격의 핵심 패턴

- IIFE + `'use strict'` 없음 (garden) / `'use strict'` 있음 (peekaboo). 전역은 `window.__g`, `window.__demo` 두 개만 노출.
- `layout()` 은 크기가 바뀔 때마다 `TK.start` 의 `resize` 로 불림. 좌표는 `TK.W`, `TK.H`, `TK.U` 에서 계산. 상태 좌표는 항상 layout 에서 다시 설정.
- `init()` 은 `TK.start` 시 한 번. 여기서 첫 세트를 만든다.
- `update(dt)` 는 **상태 전이와 값만**. 그리기 없음. `phaseT` 로 단계 시간 관리.
- `draw()` 는 **그리기만**. 끝에 `TK.drawParts()` 호출 (파티클은 update 에서 `TK.parts` 에 넣고, draw 에서 그림).
- 입력은 `TK.input` 한 번. 칸 판정 함수 (`plotAt`, 38행) 를 따로 둠.
- 효과음은 `sfx.pop()`, `sfx.splash()`, `sfx.fanfare()` 처럼 `TK.sfx` 에서 직접 호출. 음 한 개는 `TK.tone(...)`.
- 축하 단계는 `TK.confetti(dt)` 를 `update` 에서 매 프레임 부르고, 끝나면 `TK.flash()` 로 판 바뀜 연출.
- `window.__g` 는 자동 확인용 (게임 동작에 영향 없음). `actions()` 는 "다음에 누를 곳" 목록 (`[{type:'tap', x, y, wait}]`).
- `window.__demo()` 는 frame.js 의 별 시범이 부르는 함수. `{kind:'tap', x, y, say}` 를 돌려주면 별이 그 자리를 톡.

---

## 6. 새 엔진 게임을 쓸 때 체크할 것 (사실만)

- 캔버스 id `c`, 그 아래 `tk.js` → `hangul.js` → 게임 → `frame.js` 순서로 로드 (book/garden/peekaboo 공통).
- 좌표·크기는 `TK.W`, `TK.H`, `TK.U` 기준. 고정 픽셀은 쓰지 않음 (다른 기기 대응).
- 그림은 `H.drawPic` (단어), `H.drawObj` (`o_*` 물건), `H.drawBg` (`bg_*` 배경), `TK.twin` (티노·코코) 으로. 전부 lazy 로 읽혀 처음엔 폴백이 그려질 수 있음 (`drawObj` 는 `false` 를 돌려줌).
- 단어는 `H.pick(n, {cat, pic, exclude})` 로 뽑고, 읽기는 `H.read(w, pre)`, 강조는 그릴 때 `H.hi(w)` 를 `H.drawWord` / `H.drawTag` 옵션 `hi` 로.
- 소리 켜기 버튼 (`#snd`) 과 `__paused` 체크는 엔진이 처리. 게임이 해야 할 일은 없음 (까꿍은 자체 구현이라 `__paused` 를 직접 검사, 268–272행).
- 테스트 훅: `window.__g` (상태 읽기, `actions()`), `window.__demo()` (별 시범). 없어도 게임은 동작.
- 까꿍처럼 엔진 없이 쓸 때: `hangul.js` 만 로드해도 `H.*` 는 전부 사용 가능 (그리기 함수는 ctx 를 인자로 받으므로 엔진 불필요).

---

## 7. 파일별 줄 수 기준 색인

| 파일 | 주요 구간 |
|---|---|
| `shared/tk.js` | 9–20 유틸 · 23–52 캔버스/루프 · 57–91 그리기 · 95–150 소리 · 154–197 스프라이트/티노코코 · 200–242 파티클 · 246–273 입력 · 276–286 소리 버튼 · 290–342 친구 |
| `shared/hangul.js` | 16–25 설정 · 27–71 자모 · 73–120 단어 · 122–246 그림 · 248–279 글자 · 281–372 음성 · 374–385 녹음 · 387–404 기록 |
| `peekaboo/index.html` | 14–35 CSS/버튼 · 36–38 스크립트 · 40–47 헤더 · 83–145 SPR/소리 · 148–156 장면·상태 · 158–180 배치·장면 만들기 · 183–237 동작·갱신 · 253–278 입력 · 281–312 배경 · 315–403 물건 · 406–457 친구(미사용) · 461–487 튀어나옴 · 490–505 파티클 · 507–523 intro · 524–534 draw · 537–543 루프·초기화 · 547–558 훅 |
| `book/game.js` | 5–7 준비 · 9–16 목록 · 19–25 읽기·넘김 · 28–33 배치 · 35–47 입력 · 49–54 갱신 · 56–63 화살표 · 64–87 그리기 · 89–95 훅·시작 |
| `garden/game.js` | 5–10 준비 · 11–13 상태 · 15–26 배치·세트 · 27–38 자람·칸 · 40–55 입력 · 57–73 갱신 · 76–133 식물 · 135–144 배경 · 145–184 그리기 · 186–196 훅·시작 |
