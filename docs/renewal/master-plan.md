# 티노코코 한글 놀이터 — 최종 리뉴얼 마스터 플랜 (owner → GM → 엔지니어)

기준: 브랜치 `claude/tinokoko-renewal` @ 69fba8c. 이 문서가 "완성품이 무엇인가"의 유일한 기준이다.
`docs/renewal/plan.md`(1차 설계)는 이미 구현된 기록으로 남기고, 이 문서와 다르면 **이 문서가 이긴다**.

검토 방법: `python3 -m http.server 8091` + Playwright Chromium, 세로 390x844·가로 844x390, 놀이터와 지도 속 6개 놀이를
`window.__g.actions()` 로 32초씩 실제로 두드려 보고 스크린샷을 읽었다 (오너 스크래치 폴더, 저장소 밖).
콘솔·페이지 오류는 6개 놀이 × 2방향 모두 **0건**. 아래 평가는 모두 그 화면에서 본 것이다.

---

## 0. 한 장 요약 (결정)

1. **지도 개념은 유지한다.** 글자 없는 마을 지도는 이미 이 제품의 가장 좋은 부분이다. 손볼 것은 "들어가고 나오는 연결"뿐.
2. **놀이 6개(만나기·달리기·목욕·정원·실로폰·별자리)도 유지한다.** 대신 약한 핵심 동작 두 개를 뒤집는다:
   - **목욕**: 하얀 타일 닦기 → **흙 묻은 친구(공룡·고래·동물)를 씻기기**. 깨끗해진 친구가 욕조로 풍덩.
   - **달리기**: 타이밍 맞춰 뛰기 → **풍선이 보일 때 아무 때나 톡하면 풍선이 친구 머리로 끌려와 잡힘**(실패 없는 점프).
3. 나머지 넷은 핵심 동작을 유지하고 다듬는다: 정원(새싹부터 시작, 세 번 톡이면 꽃), 실로폰(바 글자를 늘 가나다라마바로),
   별자리(완성 그림을 언덕에 세우고 기본 열림), 만나기(이름표 잘림·대기 자세 수정).
4. **새 공용 모듈 `shared/play.js` (`window.TKP`, "놀이 틀")** 을 만든다. 쌍둥이 자세·톡 반응·발견 반응·한 판 축하·
   나가는 장소 기억·고정 문구 말하기를 한 번만 구현하고 6개 놀이가 모두 쓴다.
5. 쌍둥이 규칙 통일: 티노 왼쪽·코코 오른쪽, 평소 자세는 달리기 그림이 아니라 **`happy`**(티노 점프 그림·코코 웃음 그림),
   힌트 때 **`point`**(둘 다 원래 그림이 화면 가운데를 가리킴 — 절대 좌우 반전하지 않음), 발견 때 `wow`→`clap`, 축하 때 `cheer`/`clap` 교대.
6. 지도 ↔ 놀이 연결: 장소를 톡하면 크림색 원이 그 장소에서 퍼지며 화면을 덮고, 놀이 화면은 같은 크림색 원이 열리며 시작한다.
   집 버튼으로 돌아오면 지도에서 **방금 놀던 장소가 반짝이고 쌍둥이가 폴짝**.
7. 책상(별자리)은 **기본 열림**으로 바꾼다 (`cfg.desk !== false`). 부모가 "끔"을 고른 기기는 그대로 잠김.
8. 음성은 계속 `H.read / H.saySyl / H.readJamo / H.say(text, key)` 만 쓴다. 놀이 안의 안내·칭찬은 **고정 문구표(`TKP.PHRASES`)의
   키로만** 말한다 → 미리 만든 음성 파일이 생기면 `H.pack` 한 곳만 꽂으면 된다.
9. 작업은 WP-0(공용 파일 전부, 한 명이 먼저) → WP-1~6(놀이 폴더 하나씩, 병렬). 놀이 WP 는 자기 `game.js` 와
   `tests/renewal/<놀이>.js` 만 고친다.

---

## a. 현재 상태 평가 (본 것 그대로)

### 놀이터 지도 (games/index.html)
- 세로·가로 모두 7개 동그란 장소가 길 위에 고르게 놓여 있고 글자가 하나도 없다. 손그림 배경을 잘라 넣은 장소 그림이 무엇을 하는 곳인지 바로 말해 준다. **좋다.**
- 책상(별자리)은 기본이 잠김 → 처음 쓰는 아이는 7개 중 하나가 흐리고 눌러도 흔들리기만 한다. 3살에게는 "안 되는 곳"이 생기는 첫인상.
- 책상 그림이 `bg_shapes`(놀이방 탁자)+나무 타일+별이라 밤하늘 별자리 놀이와 이어지지 않는다.
- 놀이로 들어갈 때는 0.45초 콩 뒤 그냥 페이지가 바뀌고, 돌아오면 지도가 처음처럼 뜬다 → 장소와 놀이 사이 연결감이 없다.
- 업데이트 띠 `#upd`("새 버전이 준비됐어요…")가 아이 지도 위에 글자로 뜰 수 있다 (규칙 위반 가능성).

### 공룡·고래 만나기 (meet)
- 첫 5초: 물건 4개 뒤로 공룡 머리가 살짝 보이고 꼼지락 → 무엇을 톡할지 분명하다. 가장 완성도 높은 놀이.
- 톡 → 가운데 크림 원 속에 큰 친구 + 큰 이름표 + 글자마다 읽기: 피드백 풍부. 가로 화면(844x390)도 보기 좋다.
- 세로 축하 화면(`meet_port_05`)에서 왼쪽 줄 친구의 작은 이름표가 화면 왼쪽 밖으로 잘린다 ("리케라톱스", "구아노돈").
- 쌍둥이 평소 자세가 `idle`(달리기 그림) → 가만히 있는 장면에서 제자리 달리기처럼 보인다. 키 0.15H 로 작다.
- 바다 장면의 숨는 물건 `o_cloud`(모래 위 구름)는 어색하다 (1차 설계서 위험 4번 그대로).

### 글자 달리기 (run)
- 그림(바닷가 배경·풍선·스프라이트)은 예쁘지만 3살에게 **타이밍**을 요구한다: 풍선이 머리 위를 지나는 0.3초 안에 톡해야 한다. 놓친 풍선은 다시 오지만 "왜 안 잡혔지"는 남는다.
- 세로 화면에서 쌍둥이 키가 78px(= min(.16H, .2W))로 화면 바닥에 작게 붙고 위 70%는 빈 하늘(`run_port_01`, `run_port_04`).
- 오른쪽 반을 톡하면 코코가 뛴다고 했지만 두 친구 모두 화면 왼쪽 42% 안에 있다 → "오른쪽 = 코코"가 눈으로 맞지 않는다.
- 풍선 간격 2.2초 + 한 번에 최대 2개라 빈 시간이 길다. 돌멩이는 코드로 그린 회색 타원인데 손그림 `o_rock`(웃는 돌)이 있다.

### 글자 목욕 (bath)
- 욕조에 앉아 물장구치는 티노·코코(`splash`)는 전 놀이 중 가장 귀여운 장면.
- 그러나 핵심 물건이 **하얀 사각 타일 두 장**이다: 세로 156px, 그림은 그 절반, 단어 글자 약 22px(`bath_port_01`). "벽 타일의 얼룩을 닦는다"는 3살에게 추상적이고, 닦아서 나오는 그림이 작다.
- 문지르면 거품·찍찍 소리는 좋다. 두 장 → 샤워 → 축하 흐름도 좋다. 손가락 아래 아무것도 없다(스펀지 그림 `o_sponge` 미사용).

### 글자 정원 (garden)
- 흙더미 톡 → 비구름 → 새싹 → 잎 → 봉오리 → 꽃: 원인과 결과가 분명하고 손그림이 잘 맞는다.
- 처음 화면이 빈 흙더미 4개뿐이라 "이게 뭐지"가 1~2초 있다. 한 판에 16번 톡(4단계 × 4칸) → 길다.
- 공룡알 1~3단계가 코드로 그린 하얀 알(`garden_port_grow`) → 손그림과 화풍이 다르고 흙더미도 사라진다.
- 세로에서 식물 단위 S=58px로 작고, 바구니 안 단어 글자는 약 14px라 읽을 수도 없고 어수선하다. 쌍둥이는 달리기 그림.

### 가나다 실로폰 (band)
- 무대 배경·손그림 악기·잉크 테두리 실로폰이 잘 어울리고, 무엇을 쳐도 소리·음표·쌍둥이 춤이 나온다. 반짝 바 따라 치기(학교종)도 좋다.
- 바 글자가 무작위 첫 글자라 "티 노 코 프 시 타", "티 노 코 참 고 래" 같은 뜻 없는 줄이 된다 → 이름이 "가나다 실로폰"인데 가나다가 아니다 (3단계에서만 가나다).
- 친구 이름표 글자 약 15px, 노래 진행 점 24개(지름 6px), 별 3개(13px)가 작아 아이에게 의미가 없다.
- 쌍둥이 평소 자세 중 티노는 달리기 그림.

### 글자 별자리 (stars)
- 밤하늘에 크게 숨 쉬는 다음 별 하나 → 무엇을 톡할지 분명. 긋기 판도 잘 동작(손가락이 빨라도 인정).
- 완성 축하: 자음 이름 글자 약 23px, 대표 그림이 하늘 한가운데 떠 있다(`stars_port_04` 모사사우루스) → 근거 없이 둥둥.
- 축하 4.2초 + 사라짐 0.8초 = 다른 놀이보다 길다. 쌍둥이 평소 자세는 달리기 그림.
- 지도에서 기본 잠김이라 대부분 아이는 이 놀이를 못 본다.

### 공통 (전 놀이)
- 쌍둥이 자세·톡 반응·축하 길이(2.5~6.5초)·빈 곳 톡 반응이 놀이마다 조금씩 다르게 손으로 짜여 있다.
- 처음 들어오면 손그림이 아직 안 읽혀 0.2~0.5초 코드 대체 그림(만나기의 초록 타원 등)이 보일 수 있다.
- 별 시범(frame.js)은 1.6초에 첫 시범, 이후 10초/25초 무입력이면 반복 — 좋다. 다만 쌍둥이는 시범에 반응하지 않는다.
- 음성: 놀이 첫 별 시범의 말은 사용자 동작 전이라 모바일에서 대부분 무음 (브라우저 정책, 바꿀 수 없음). 첫 톡부터 소리.

---

## b. 최종 제품 정의

### b-1. 흐름
```
앱 열기 → 마을 지도 (글자 없음)
  장소 톡 → 장소 콩 + 쌍둥이 폴짝 + 크림 원이 장소에서 퍼져 화면 덮음 (0.42초) → 놀이 페이지
놀이 페이지: 크림 원이 열리며 시작 (0.5초) → [한 판: 놀기 → 발견 반응 반복 → 축하 3초 → 하얀 번짐 → 다음 판] 무한 반복
  집 버튼 톡 → 손그림 티노·코코가 손 흔들며 "안녕!" → 지도
지도: 방금 놀던 장소에서 크림 원이 접혀 사라지고 그 장소가 3번 반짝 + 쌍둥이 폴짝
부모: 지도 왼쪽 위 톱니 1초 꾹 (현재 그대로) — 모든 설정 + 숨은 카드 2묶음(다른 놀이 5, 예전 게임 3)
```

### b-2. 유지 / 뒤집기 결정표

| 대상 | 결정 | 이유 |
|---|---|---|
| 마을 지도 | 유지 + 연결 연출·돌아옴 반짝·대기 힌트 추가 | 이미 글자 없이 분명함. 부족한 건 연결감뿐 |
| 장소 7개 / 놀이 6개 | 유지 | 숲·바다=만나기, 길=달리기, 집=목욕, 정원, 무대=실로폰, 책상=별자리. 놀이별 성격(찾기·몸·문지르기·키우기·소리·차분)이 겹치지 않음 |
| 책상 잠금 | **기본 열림으로 뒤집기** (`desk !== false`) | 3살 첫인상에서 "안 되는 곳" 제거. 부모가 끈 기기는 그대로 |
| 책상 그림 | `bg_stars` + `o_star` 로 교체 | 놀이 화면과 같은 밤하늘 |
| 만나기 | 유지, 다듬기 | 가장 좋은 놀이 |
| 달리기 | **핵심 동작 뒤집기**: 자석 점프 | 타이밍 요구 제거, 모든 톡이 성공 |
| 목욕 | **물건 뒤집기**: 타일 → 친구 씻기기 | 큰 그림, 3살이 아는 행동(씻기기), 쌍둥이와 같은 욕조로 이어짐 |
| 정원 | 유지, 새싹부터·3번 톡 | 첫 5초 분명, 한 판 길이 절반 |
| 실로폰 | 유지, 글자 고정 가나다라마바 | 이름과 내용 일치, 순서 학습 |
| 별자리 | 유지, 축하 다듬기 | 차분한 마무리 놀이 역할 |
| 지도 위 `#upd` 띠 | 부모 화면에서만 보이게 | 아이 화면 글자 금지 |
| 숨은 놀이·예전 게임 | 그대로 (카드도 그대로) | 삭제 금지 규칙, 범위 밖 |

### b-3. 한 판 길이 목표 (자동 입력 기준이 아니라 아이 기준)
| 놀이 | 한 판 | 아이 톡 수(대략) | 축하 |
|---|---|---|---|
| 만나기 | 친구 4(가로 5) | 4~5 + 다시 듣기 | 3.0초, 두 판마다 숲↔바다 |
| 달리기 | 단어 1개(2~3글자) | 2~3 (+자유 점프) | 단어마다 짧은 발견 2.2초, 단어 3개마다 큰 축하 4.2초(결승선) |
| 목욕 | 친구 2마리 | 문지르기 2×(6~12초) | 샤워 1.6초 + 3.0초 |
| 정원 | 식물 4 | 12 | 수확 + 3.0초 |
| 실로폰 | 친구 3 합류(36번 치기 또는 노래 1곡) | 자유 | 3.0초 + 친구 퇴장 1.2초 |
| 별자리 | 자음 1개(별 4~10) | 4~10 | 3.0초 |

---

## c. 공용 놀이 틀 계약 — `shared/play.js` (`window.TKP`)

WP-0 이 한 번 구현하고 6개 놀이가 모두 쓴다. TK·H 에 의존 (로드 순서: `tk.js → hangul.js → music.js → play.js → game.js → frame.js`).
`TKP.init()` 을 부르지 않은 페이지(숨은 놀이들)에서는 아무 일도 하지 않는다 (전역 리스너도 init 안에서만 건다).

### c-1. 함수 (정확한 동작)

```
TKP.init(o) -> TKP
  o.id      : 'meet'|'run'|'bath'|'garden'|'band'|'stars'   (필수)
  o.place   : 지도 장소 키 'forest'|'sea'|'run'|'bath'|'garden'|'band'|'stars' (기본 = id). 나중에 TKP.setPlace 로 바꿀 수 있음
  o.twins   : { port:{x0, x1, yb, h}, land:{x0, x1, yb, h} } — 화면 비율(x 는 W 비율, yb·h 는 H 비율).
              null 이면 놀이가 매 프레임 TKP.drawTwin 으로 직접 위치를 정함 (달리기·목욕·실로폰)
  o.idlePose: 평소 자세, 기본 'happy'
  o.preload : ['bg_sea','o_rock', …] — H.lazyImg 이름(접두어 포함). 전부 읽히거나 900ms 가 지나면 TKP.ready 가 풀림
  o.music   : 'play'|'beach'|'night'|null → window.TKMusic 있으면 TKMusic.play(o.music)
  - sessionStorage 'tk-last-place' = place 를 즉시 기록 (지도 돌아옴 반짝용; 실패는 try/catch 로 무시)
  - window 'tk:demo' 이벤트를 들어 힌트 자세를 켬 (c-3)
  - pointerdown/keydown(capture) 으로 마지막 입력 시각 기록

TKP.ready : Promise — preload 완료 또는 900ms. frame.js 가 열림 원을 이것에 맞춰 시작
TKP.update(dt)      — game.update 맨 앞에서 매 프레임 1회. 쌍둥이 타이머·축하 타이머·색종이(TK.confetti) 진행
TKP.drawTwins()     — o.twins 가 있을 때 둘을 그 자리·현재 자세로 그림 (장면 그린 뒤, TK.drawParts 전)
TKP.drawTwin(i, x, yb, h, opt={}) -> w
                    — 쌍둥이 i(0 티노, 1 코코)를 (x, yb, h)에 현재 자세로 그림. opt.pose 가 있으면 그 자세 강제
                      (달리기의 'idle'/'jump' 등). 위치를 기록해 twinAt·__tkp 에 씀. opt 의 rot/alpha/face 는 TK.twin 으로 전달
TKP.pose(i) -> { pose, hop, lift }   — 현재 자세 이름, hop(0~1 진행, 없으면 -1), lift(위로 뜰 px)
TKP.side(x) -> 0|1                   — x < W/2 이면 0(티노)
TKP.twinAt(x, y) -> 0|1|-1           — 마지막으로 그린 자리 기준 |x-cx| < w*0.45 && yb-h < y < yb
TKP.tap(x, y) -> boolean             — 쌍둥이를 맞으면 tapTwin 후 true. 축하 중이면 TK.spark(x,y,COLS,6)+sfx.soft 후 true.
                                       그 밖은 false (놀이가 처리). 모든 놀이의 input.down 첫 줄에서 부른다
TKP.tapTwin(i)      — hop + sfx.giggle(kind) + TK.hearts(머리 위, 6) + 자세 'clap' 0.8초 + H.read('티노'|'코코') (같은 쌍둥이 1.5초 안 재읽기 없음)
TKP.tapEmpty(x, y)  — TK.ring(x, y, 14U, 흰색) + sfx.soft() + 그쪽 쌍둥이 작은 hop. 놀이의 "빈 곳 톡"은 전부 이것
TKP.found(x, y, opt={}) — "발견 순간" 공통 반응: TK.spark(x, y, 무작위 COLS, 12) + 쌍둥이 side(opt.side ?? side(x))는
                      opt.pose(기본 'wow') 0.9초 → 'clap' 1.2초, 반대쪽은 hop 한 번. 소리는 놀이가 냄 (놀이마다 다름)
TKP.react(i, pose, sec=1.2) — 자세 덮어쓰기. i 는 0|1|'both'
TKP.celebrate(opt) — 한 판 끝 공통 축하. 이미 축하 중이면 무시
                      opt.big=false: 3.0초 / true: 4.2초. opt.onDone (필수): 끝날 때 한 번
                      t=0   sfx.fanfare(); 쌍둥이 둘 다 partyPose(엇갈린 cheer/clap) + 큰 bob(h*0.1, 속도 7) + hop
                      t=0, 0.6, 1.2  TK.spark(화면 무작위 위쪽 점, COLS, 14)  ·  매 프레임 TK.confetti(dt)
                      t=0.25 opt.word 가 없으면 TKP.say('yay' 와 'yay2' 번갈아)  (word 가 있으면 놀이가 H.read 함)
                      big 이면 t=0.4 sfx.clap()
                      t=끝-0.4 TK.flash() → t=끝-0.25 onDone() 호출 (판 바꾸기는 하얀 번짐 아래에서)
TKP.busy -> boolean — 축하 중
TKP.say(key)        — TKP.PHRASES[key] 를 H.say(text, 'p:' + key) 로. TK.muted 면 무시. 같은 키 4초 안 반복 무시
TKP.setPlace(key)   — sessionStorage 'tk-last-place' 갱신 (만나기 숲↔바다 바뀔 때)
TKP.idle() -> 초    — 마지막 입력 뒤 지난 시간
TKP.PHRASES         — 아래 표 (고정. 문구를 바꾸면 음성 파일도 다시 만들어야 하므로 WP 들은 추가·수정 금지, GM 승인 필요)
window.__tkp        — 테스트용: { inited, id, phase:'play'|'cele', celebrations, founds, lastSay,
                      twins: [{pose, x, yb, h}, {…}] (마지막 그린 값), ready:boolean }
```

### c-2. 쌍둥이 자세 규칙 (모든 놀이 공통)
우선순위: **축하 partyPose > react 덮어쓰기(타이머) > 힌트 point > 평소(idlePose)**.

| 상황 | 자세 | 비고 |
|---|---|---|
| 평소 | `happy` (티노 jump 그림·코코 laugh 그림) + bob(h*0.02) | 달리기만 `idle`/`jump`(달리는 놀이라 맞음) |
| 쌍둥이를 톡 | `clap` 0.8초 + hop + 하트 + 이름 읽기 | TKP.tapTwin |
| 발견(친구 등장·친구 깨끗·꽃 핌·자음 완성 직전) | 그쪽 `wow` 0.9초 → `clap` 1.2초 | TKP.found. 정원은 `sniff`, 목욕 욕조 안은 `splash` |
| 별 시범(힌트) | 시범 지점에 가까운 쪽 `point` 1.8초 | 티노 point 는 오른쪽, 코코 point 는 왼쪽을 원래 가리킴 → **mirror 금지** |
| 축하 | `TK.partyPose(i)` (cheer/clap 교대, 둘이 엇갈림) | TKP.celebrate |
| 잘 시간 | frame.js 그대로 | |

hop: 0.45초 동안 0→1, lift = `TK.hopY(hop, h*0.22)`. 티노는 항상 왼쪽, 코코는 항상 오른쪽(`twins[0].x < twins[1].x` 를 테스트가 매 샘플 확인).

### c-3. 힌트(대기) 규칙
- 힌트는 **frame.js 별 시범 하나로 통일** (타이밍 그대로: 열림 원이 끝난 뒤 1.6초에 첫 시범, 이후 무입력 10초(처음 3번)/25초).
- frame.js 는 시범을 시작할 때 `window.dispatchEvent(new CustomEvent('tk:demo', { detail: { x, y } }))` 를 쏜다 → TKP 가 가까운 쪽 쌍둥이를 `point` 1.8초.
- 시범 말: `__demo()` 가 `sayKey` 를 주면 frame.js 는 `TKP.say(sayKey)`, 없으면 예전처럼 `say` 문자열. **모든 지도 놀이의 `__demo` 는 `sayKey` 를 준다** (`say` 문자열도 같이 남겨 둠 — 예전 테스트 호환).

### c-4. 소리 규칙
- 말은 한 번에 하나 (H.speakSeq 가 앞 말을 끊음). 놀이는 `speechSynthesis`·`TK.say`·`H.speak` 를 **직접 부르지 않는다**.
- 배우는 말 = `H.read(단어)`, `H.saySyl(음절)`, `H.readJamo(자음)`. 안내·칭찬 = `TKP.say(key)` 만.
- 같은 대상을 빠르게 연타하면 읽기는 1.0초에 한 번만 (효과음은 매번).
- 효과음은 `TK.sfx`/`TK.tone`/`TK.noise` 만. 모든 톡에 최소 한 가지 효과음 + 한 가지 화면 반응.
- 배경음악: 만나기 'play', 달리기 'beach', 별자리 'night', 정원·목욕·실로폰 없음 (현재와 같음; 실로폰은 아이가 연주).

### c-5. 고정 문구표 `TKP.PHRASES` (음성 파일 만들 대상 — 키 `p:<키>`)
```
yay   : '우와!'
yay2  : '와아, 신난다!'
peek  : '톡! 누가 숨었을까?'
jump  : '톡 하면 폴짝 뛰어요'
rub   : '쓱쓱 문질러 봐!'
clean : '깨끗해졌다!'
water : '톡톡, 물 주자!'
drum  : '둥둥 두드려 봐!'
sweep : '쓱 쓸어 봐!'
star  : '반짝이는 별을 톡!'
trace : '반짝이는 별을 따라 쓱!'
finish: '결승선이다!'
```
(frame.js 의 '안녕!', '잘 자!', 생일 축하는 frame.js 소관 — 그대로.)

### c-6. 음성 연결 고리 (음성 담당 엔지니어용, 이 플랜은 파일 생성 안 함)
- `hangul.js` 의 내부 `play(key, fallback)` 이 URL 을 찾는 순서를 **부모 녹음 `H.voices.get(key)` → `H.pack(key)`(함수, 기본 `null`) → 없음(기기 음성)** 으로 바꾼다.
- 키: 단어 = 단어 글자 그대로, 음절 = 음절, 자음 = 'ㄱ' 등, 고정 문구 = `'p:yay'` 등.
- 놀이 코드는 이 변경과 무관하게 같은 API 를 부른다. (주의: `H.read` 는 단어 파일이 있으면 글자별 읽기를 건너뜀 — 음성 담당이 정할 일.)

### c-7. 지도 ↔ 놀이 연결 연출
- **놀이 시작 (frame.js)**: 페이지가 뜨자마자 덧그림 캔버스 `#tkfx` 에 크림색 `#fff8e7` 을 꽉 칠해 두고, `TKP.ready`(없으면 즉시) 와 900ms 중 먼저인 때에 (W/2, H*0.55) 중심 원 구멍을 0.5초(ease-out) 동안 화면 대각선 길이까지 키운다. 그동안 입력은 통과(막지 않음). `window.__frame.iris` = 'cover'|'opening'|'done'.
- **놀이에서 나감 (frame.js goodbye)**: 흰 막 위 그림을 스프라이트 대신 손그림 `o_tino_cheer`·`o_coco_cheer` 로 (손 흔들기 회전 애니메이션 그대로), 1.0초에 크림색이 화면을 덮고 1.4초에 지도로 (시간 그대로).
- **지도 (games/index.html)**: 장소 톡 → `#wipe`(크림 고정 막)가 장소 중심에서 `clip-path: circle(0 at X Y)` → `circle(150vmax at X Y)` 0.42초, 450ms 에 이동 (현재 타이머). 돌아오면 c-8.

### c-8. 테스트 공통 (WP-0 이 만드는 `tests/renewal/run.js`)
```
node tests/renewal/run.js <game|hub> [--secs 30] [--base http://localhost:8091/] [--cfg '{"stage":3}']
```
- 방향 2개: port 390x844, land 844x390 (`isMobile:true, hasTouch:true, deviceScaleFactor:1`), 컨텍스트마다 **`serviceWorkers:'block'`** (서비스워커 캐시가 고친 파일을 가리지 않게).
- `--cfg` 가 있으면 init script 로 `localStorage['tk-hangul']` 에 넣음.
- 주소: `hub` → `games/`, `meet` → `meet/?s=forest`, 그 밖 → `<game>/`.
- 순서: 열기 → 0.3초 샷(`iris`) → 1.2초 샷(`start`) → 3.5초 샷(`t3`) → `--secs` 동안 `__g.actions()` 첫 동작 실행(tap=click, path=down→move(steps 2)→up, 그 뒤 `wait` ms) → 5초마다 샷(`play_NN`), `__tkp.phase` 가 처음 'cele' 가 될 때 샷(`cele`) → 입력 없이 12초 대기, 시범 중 샷(`hint`).
- 샷 위치: `docs/renewal/shots/<game>/<view>_<label>.png` (이 폴더는 .gitignore — 커밋 안 됨, GM 이 로컬에서 봄).
- 공통 판정 (실패 시 종료 코드 1): 페이지 오류·console.error 0 / `__tkp.inited` / 이동 중 `celebrations >= 1` / 모든 샘플에서 `twins[0].x < twins[1].x` / 12초 대기 중 `__frame.demo` 가 한 번은 true 이고 그동안 어느 쌍둥이 pose === 'point'.
  `__tkp.inited` 가 false 면 "not migrated" 로 표시하고 TKP 관련 판정은 건너뜀 (WP-0 단계 확인용).
- 놀이별 판정: `tests/renewal/<game>.js` 가 있으면 `module.exports = async (page, view, util) => [{ name, ok, detail }]` 을 불러 합침.
  `util` = `{ W, H, shot(label), drive(ms), wait(ms), g(expr) }` (g 는 `page.evaluate` 축약).
- 출력: 콘솔에 JSON (`{game, view, checks:[…], errors:[…]}`) + 맨 끝 `PASS`/`FAIL`.

---

## d. 화면별 최종 명세

공통 (모든 지도 놀이):
- `TKP.init({...})` 을 파일 맨 앞(IIFE 안 상수 선언 뒤)에서. 기존 `TKMusic.play` 호출은 `o.music` 으로 옮긴다.
- `update(dt)` 첫 줄 `TKP.update(dt)`. 기존 자체 party 타이머·confetti·flash 호출은 `TKP.celebrate({onDone})` 로 바꾼다.
- `input.down` 첫 줄 `if (TKP.tap(p.x, p.y)) return;`. 기존 쌍둥이 히트 코드와 "빈 곳" 코드는 `TKP.tapEmpty` 로 교체.
- `__g`(기존 getter 전부 유지 + 아래 추가분), `__demo`(기존 동작 유지 + `sayKey`) 는 반드시 남긴다.
- `TK.twin(...)` 직접 호출은 놀이 안에서 없앤다 → `TKP.drawTwins()` 또는 `TKP.drawTwin()`.
- 코드 스타일: 줄 중간 `//` 주석 금지(`/* */` 사용), 모든 JS `node --check` 통과, 한국어 주석 좋음, 지역 변수로 `H` 를 높이 이름으로 쓰지 말 것(`HG = window.H`, 높이는 `Hh`/`H2`).

### d-0. 놀이터 지도 (games/index.html) — WP-0
핵심: 그대로의 지도 + 연결 연출 + 책상 기본 열림 + 대기 힌트.

정확한 변경:
1. 장소 `<a>` 마다 `data-place` (forest, sea, bath, run, garden, band, stars).
2. 책상: `renderMap()` 의 `on = cfg.desk !== false`; `renderDesk()` 의 선택값 `cfg.desk === false ? '0' : '1'`. 부모 설명 문구 끝에 "(처음엔 켜져 있어요)" 추가. 저장 형식(`tk-hangul.desk` true/false)은 그대로.
3. 책상 장소 그림: `background-image:url(../shared/pics/bg_stars.webp)`, 안의 그림을 `o_star` 두 개(`left:18%;top:20%;width:34%` / `left:52%;top:44%;width:28%`)로. aria-label 그대로.
4. `#wipe` 막 추가(`position:fixed;inset:0;z-index:5;background:#fff8e7;pointer-events:none;clip-path:circle(0 at 50% 50%)`). 장소 톡(열린 곳) → 장소 중심 좌표로 clip-path 를 0 → 150vmax, `transition: clip-path .42s ease-in`. `pageshow` 에서 원상복구(기존 `going=false` 처리 옆).
5. 돌아옴: 로드·`pageshow` 때 `sessionStorage['tk-last-place']` 를 읽어 그 장소가 있으면 — `#wipe` 를 그 중심에서 `circle(150vmax)` 로 시작해 `circle(0)` 으로 0.5초 접고, 장소에 `.back` (금빛 고리 box-shadow 펄스 3회 × 0.6초), 쌍둥이 `.hop`. 읽은 뒤 키 삭제.
6. 대기 힌트: 지도에서 8초 동안 pointerdown 이 없으면 열린 장소를 차례로 하나씩 `.hint`(translateY 0→-6%→0 두 번, 0.7초). 소리 없음. 부모 화면이 열려 있으면 안 함.
7. `#upd` 띠: `body:not(.par) #upd{display:none}` — 부모 화면에서만 보임. 생성 로직 그대로.
8. 부모 화면 "지도 속 놀이" 도움말 중 바뀐 놀이 4개의 `.tip` 내용을 아래로 교체 (카드 제목·부제는 그대로, 부제만 목욕·실로폰 교체):
   - 글자 목욕 부제 "흙 묻은 친구를 쓱쓱 씻겨요", tip: `<p><em>노는 법</em> 진흙·물감이 묻은 친구(공룡·고래·동물)를 손가락으로 쓱쓱 문지르면 스펀지 거품이 나며 깨끗해지고, 친구 이름을 글자마다 읽어 줘요. 깨끗해진 친구는 욕조로 풍덩! 두 친구를 씻기면 샤워.</p><p><em>익히는 것</em> 이름 통단어, 문지르기(끌기).</p><p><em>같이 놀 때</em> 깨끗해진 친구를 톡 하면 다시 읽어 줘요.</p>`
   - 글자 달리기 tip 첫 문단: `<p><em>노는 법</em> 티노와 코코가 달려요. 풍선이 다가오면 아무 때나 톡! 왼쪽을 톡 하면 티노, 오른쪽을 톡 하면 코코가 폴짝 뛰고, 풍선이 쏙 날아와 잡혀요(놓치는 일 없음). 글자가 다 모이면 "나, 비. 나비!" 하고 읽고 그림 깃발이 꽂혀요. 단어 셋이면 결승선!</p>` (나머지 문단 그대로)
   - 글자 정원 tip: `<p><em>노는 법</em> 새싹을 톡 누르거나 문지를 때마다 비가 와서 쑥쑥, 세 번이면 꽃·열매가 피고 "당근" 하고 이름을 읽어 줘요. 넷 다 피면 바구니로 쏙쏙.</p><p><em>익히는 것</em> 채소·꽃 이름, 원인과 결과.</p>`
   - 가나다 실로폰 부제 "가나다라마바, 치면 글자가 노래해요", tip 첫 문단: `<p><em>노는 법</em> 실로폰 바마다 가·나·다·라·마·바 글자가 있어 치면 그 글자를 소리 내요. 쓸면 차례로. 반짝이는 바를 따라 치면 '학교종' 노래가 돼요. 북·나팔·탬버린도 있고, 친구가 이름표를 달고 와요.</p>` (나머지 그대로)
9. 나머지(부모 패널·id·localStorage 키·manifest·SW 등록·톱니)는 **한 글자도 바꾸지 않는다**.

판정 (tests/renewal/hub.js, WP-0):
- H1 `document.querySelector('.map').innerText.trim() === ''` (지도에 글자 없음), 두 방향.
- H2 장소 7개, 각 변 ≥ 120px, 모두 화면 안 (기존 smoke 와 같은 계산).
- H3 `tk-hangul` 에 desk 없음 → 책상 `.off` 아님, 톡하면 `../stars/` 로 이동.
- H4 `desk:false` 저장 → `.off`, 톡해도 `/games/` 에 머묾.
- H5 숲 톡 150ms 뒤 `#wipe` 의 계산된 clip-path 반지름 > 0, 1초 안에 `meet/?s=forest`.
- H6 `sessionStorage['tk-last-place']='bath'` 넣고 열기 → 집 장소에 `.back`, 쌍둥이 `.hop`, 키가 지워짐.
- H7 9초 무입력 → 어떤 장소에 `.hint`.
- H8 톱니 짧게 톡 = 안 열림, 1초 꾹 = 열림, `#parent` 주소 = 열림, smoke.js 의 id 목록 전부 존재, 카드 링크 수 = 현재와 같음(6 + 5 + 3).
- H9 지도 화면에서 `#upd` 를 강제로 만들어도 보이지 않음(`offsetParent === null`).

### d-1. 공룡·고래 만나기 (meet/game.js) — WP-1
핵심 루프 (유지): 숨은 물건 4(가로 5) → 톡 → 친구가 가운데 원으로 까꿍 + 이름 읽기 → 제자리에 서서 작은 이름표 → 다 만나면 축하 → 새 판, 두 판마다 숲↔바다.

정확한 변경:
1. `TKP.init({ id:'meet', place: scene, twins:{ port:{x0:.14,x1:.86,yb:.985,h:.16}, land:{x0:.07,x1:.93,yb:.985,h:.27} }, preload:[현재 장면 bg + objs 6개 + 다른 장면 bg], music:'play' })`. 장면이 바뀔 때 `TKP.setPlace(scene)`.
2. 쌍둥이: 자체 `twins` 배열의 react/love/hop 과 `drawTwins()` 를 지우고 `TKP.drawTwins()`. `open()` 의 `twins[..].react=2.1` → `TKP.found(o.x, o.y - o.s*0.8)` (스파크는 TKP 가 내므로 기존 `TK.spark` 줄 삭제, `sfx.rustle(); sfx.boing();` 유지). `cheerTwin/bumpTwin/twinAt` → TKP.
3. 축하: `phase='party'` 진입 시 `TKP.celebrate({ onDone: nextRound })`; 기존 `TK.confetti`, `phaseT > 2.5` 타이머, `nextRound` 안 `TK.flash()` 삭제(TKP 가 함). 축하 동안 서 있는 친구들이 0.18초 간격으로 차례로 hop (이름은 다시 읽지 않음).
4. 이름표 잘림: `drawSmallTag` 의 x 를 `clamp(x, tw/2 + 6, W - tw/2 - 6)` (tw = 이름표 폭 ≈ `size * (n*1.02 + 0.7)`, drawTag 축소 고려해 tagSize 결과로 계산). `slotPose` x 도 친구 그림 폭 절반만큼 화면 안으로 clamp.
5. 바다 물건: `o_cloud` → `o_lifebuoy`.
6. 손그림이 읽히기 전 초록 타원 대체 그림: 열림 원 동안만 보이므로 그대로 두되, `drawThing` 이 `false` 일 때 타원 alpha 0.5.
7. `__demo` 에 `sayKey:'peek'`.
8. `__g` 추가: `tagRects()` → 화면에 그려진 작은 이름표 `[{x, w, y}]` (마지막 draw 에서 기록).

배치 (현재 SLOTS 그대로). 쌍둥이 키 세로 0.16H, 가로 0.27H (현재보다 약간 큼; 물건 아래줄과 겹치면 0.15/0.26 으로 되돌림 — 스크린샷으로 판단).

판정 (tests/renewal/meet.js):
- M1 두 방향 30초: `rounds >= 1`, `__tkp.celebrations >= 1`.
- M2 `cele` 순간 `tagRects()` 모든 항목 `x - w/2 >= 0 && x + w/2 <= W`.
- M3 놀이 중(축하·발견 아닐 때) 샘플에서 `__tkp.twins[*].pose === 'happy'` 가 한 번 이상, `'idle'` 은 한 번도 없음.
- M4 `?s=sea` 로 열어 `__g` 의 물건 이름에 `o_cloud` 없음 (`__g.objs` getter 추가: 물건 이름 배열).
- M5 hint 샷에 별 + `point` 자세 쌍둥이.

### d-2. 글자 달리기 (run/game.js) — WP-2
핵심 루프 (뒤집음): 둘이 달린다 → 글자 풍선이 차례로 다가옴 → **풍선이 화면에 있을 때 톡하면 그쪽 친구가 뛰고, 가장 가까운 다가오는 풍선이 친구 머리로 끌려와 퐁** → 글자가 카드로 날아가 읽힘 → 단어 완성 → 단어 셋마다 결승선 큰 축하 → 다음 길(바닷가→숲→밤).

정확한 변경:
1. 자석 점프: `jump(t)` 때 `target` 선택 = 터지지 않았고 `target` 없는 풍선 중 `b.x > t.x - th*0.5` 이고 `b.x < TK.W + th*0.5`(화면 안·곧 들어올 것) 인 것에서 가장 가까운 것. 고르면 `b.tgt = t; b.tg0 = {x:b.x, y:b.y}; b.tgT = 0`. update 에서 `b.tgT += dt/0.38`, 위치 = lerp(tg0, 친구 머리(t.x, gy - t.y - th*0.85), ease(tgT)) (스크롤 이동 무시), `tgT >= 1` 이면 `collect(b)`. 친구는 공중에 0.38초 이상 머물도록 점프 속도는 그대로(현재 체공 ≈ 0.6초).
   - 풍선이 없을 때의 톡: 그냥 점프 + `sfx.boing` (현재와 같음). 공중에서 다시 톡: 무시(현재와 같음).
   - 기존 충돌 수집(머리에 닿으면 퐁)은 그대로 남긴다 (자석 없이 닿아도 잡힘).
2. 톡 → 친구 선택: `x < W/2` 티노, 아니면 코코 (현재와 같음). 단 그 친구가 공중이면 다른 친구가 땅에 있으면 그 친구가 뜀 (두 아이 연타 때 반응 없는 톡 제거).
3. 세로 배치: `gy = Hh*0.74`, `th = min(Hh*0.2, W*0.3)` (390x844 → 117px), 쌍둥이 x = `W*0.2`, `W*0.46`. 가로 배치는 현재 값 유지(`gy .84H`, `th min(.24H,.2W)`, x .16W/.3W). 길 띠는 gy 아래 전부.
4. 풍선 간격: `spawnT` 처음 0.6초, 이후 1.4초, 화면에 최대 2개 (현재 0.8/2.2).
5. 돌멩이: `drawRock` 은 `HG.drawObj(ctx, 'o_rock', r.x, gy + r.r*0.1, r.r*1.6, r.r*2.4)` 가 true 면 끝, false 면 현재 코드 그림. 세로 화면은 돌 간격 `rand(6, 9)`초.
6. 단어 카드 글자 크기 `min(W, Hh)*0.1` (현재 .085).
7. 단어 완성: `TKP.found(W/2, Hh*0.34, {side: 0})` + 반대쪽도 `TKP.react(1,'clap',1.2)` + 기존 fanfare 대신 `sfx.sparkle()` + 350ms 뒤 `HG.read(word.w)` + 큰 그림 (현재 party 2.2초로 단축). 단어 3개마다 결승선 통과 순간 `TKP.celebrate({ big:true, onDone: () => { phase='scene'; phaseT=0; } })` + `TKP.say('finish')` (기존 finish 단계 6.5초 → 결승선 들어오는 시간 + 4.2초).
8. 쌍둥이 그리기: 자체 draw 유지하되 `TK.twin` → `TKP.drawTwin(i, 0, 0, th, { pose: t.air ? 'jump' : (TKP.busy || t.happy > 0) ? TKP.pose(i).pose : 'idle', face:'right', rot: wob })` (translate 는 현재처럼). TKP init 은 `twins:null, idlePose:'idle'`.
9. `__demo`: `sayKey:'jump'`, 풍선이 화면 오른쪽 60% 안에 있을 때 화면 왼쪽 1/4 톡 (현재).
10. `__g` 추가: `th`, `caught`(자석으로 잡은 수), `missed`(화면 왼쪽 밖으로 나간 안 잡힌 풍선 수).

판정 (tests/renewal/run.js — 주의: 공통 러너 `tests/renewal/run.js` 와 이름이 겹치므로 놀이 판정 파일은 **`tests/renewal/run_game.js`**, 러너는 `run`→`run_game.js` 를 찾도록 WP-0 이 매핑):
- R1 30초 actions: `words >= 2`, `missed === 0`.
- R2 자석: 풍선이 `t.x + speed*0.8` 쯤일 때(= 아직 머리 위 아님) 그쪽 반을 톡 → 0.6초 안에 `got` 이 하나 늘어남 (세로·가로 각각 3번 시도 모두 성공).
- R3 세로 `th >= 110`.
- R4 `cele` 샷 = 결승선 + 색종이 + 둘 다 cheer/clap.
- R5 돌멩이가 보이는 샷에 손그림 돌(눈사람 얼굴) — 사람 눈 확인.

### d-3. 글자 목욕 (bath/game.js) — WP-3
핵심 루프 (뒤집음): 흙 묻은 친구 한 마리가 욕조 위 목욕 매트에 나타남 → 손가락으로 문지르면 손가락 아래 스펀지 + 거품 + 찍찍, 얼룩이 하나씩 사라짐 → 다 깨끗하면 반짝 + 이름 읽기 + 이름표 → 2.0초 뒤 친구가 욕조로 포물선 점프 풍덩(물방울) → 다음 친구가 옆에서 들어옴 → 두 마리 씻기면 샤워 1.6초 → 축하 3초 → 다음 판(다른 얼룩 종류, 욕조 속 친구 비움).

정확한 변경:
1. 데이터: `tiles` → `friends`(2개, `H.pick(2, { pic:true, cat:['animal'] })` — 좋아하는 것 가중치로 공룡·고래가 자주 나옴; 결과가 2개 미만이면 `['오리','하마']`). 한 번에 하나만 `cur` 가 화면에 (st: 'in'(0.5초 옆에서 미끄러져 들어옴) → 'dirty' → 'clean'(2.0초) → 'jump'(0.6초) → 'tub').
2. 배치: 세로 친구 밑변 (W/2, H*0.50), 키 `min(W*0.55, H*0.28)`; 가로 (W/2, H*0.52), 키 `min(H*0.40, W*0.26)`. 밑에 `o_towel` 을 매트로 (폭 = 친구 키*1.1). 친구 그림 상자 = 폭 키*1.0(고래는 1.4) × 키.
3. 얼룩 6개: 친구 상자 안 고정 비율 자리 6개(현재 spots 자리 표 재사용, 상자 기준) + 작은 흔들림. 얼룩 크기 `r = 키*0.17`. 종류 순환 `mud→paint→leaf→sand` (현재 손그림 o_mud/o_paint/o_leafpile/o_sand). 문지르기 판정·양은 현재 `rubAt` 그대로(상자 기준).
4. 스펀지: 손가락이 눌린 채 친구 상자 근처(상자 1.2배)에 있으면 `o_sponge` 를 손가락 위치에 키*0.28 로 그림(살짝 기울기 흔들림). `__g.sponge` = 지금 그리는지.
5. 깨끗: `TKP.found(cx, top)` + `sfx.sparkle()` + `H.read(w)` + 이름표 `H.drawTag` (친구 발밑, 글자 크기 `tagSize` 방식으로 폭 W*0.8 안), 3번 반짝 링. 깨끗한 친구 톡 = 다시 읽기 + hop.
6. 풍덩: 'jump' 동안 친구가 매트 → 욕조 물 타원 가운데(티노·코코 사이)로 포물선, 크기 0.55배로 줄며 이동, 끝에 `sfx.splash()` + 물방울 14개 + 쌍둥이 둘 다 `TKP.react('both','splash',1.0)`. 'tub' 상태 친구는 쌍둥이처럼 물 타원 clip 안에 머리만(키*0.55, 좌우 살짝 흔들) 그림. 두 마리면 나란히(±물 타원 반지름*0.18).
7. 쌍둥이: 욕조 안 자체 그리기 유지, `TK.twin` → `TKP.drawTwin(i, x, yb, h, { pose: 샤워·축하·hop 중이면 'splash' 아니면 'happy' })` — 단 축하 중에는 TKP 자세(cheer/clap) 그대로. 욕조 물 clip 은 현재 `drawTubArt` 그대로.
8. 샤워·축하: 'wait'(2.2초) → 'shower'(1.6초, 현재) → `TKP.celebrate({ onDone: 다음 판 })` (기존 party 타이머·flash 삭제). 오리/장난감 고래 톡 반응은 그대로.
9. 코드 대체 그림(손그림 없는 경우의 욕조 등)은 그대로 둠. 타일 그리기 함수 `drawTile` 은 삭제(아무도 안 씀).
10. `__demo`: 현재 방식(가장 더러운 얼룩을 좌우로 쓱쓱), `sayKey:'rub'`. `__g`: `phase, rounds, spots, words`(친구 이름 2개), 추가 `cur`(지금 친구 이름), `st`(그 상태), `inTub`(욕조 속 수), `sponge`, `box`({x,y,w,h} 지금 친구 상자). `actions()` 는 현재처럼 남은 얼룩 하나를 좌우로 문지르는 path.

판정 (tests/renewal/bath.js):
- B1 `box.h >= 0.33 * min(W, H)` 두 방향.
- B2 30초 actions → `rounds >= 1`, 그 사이 `inTub` 가 0→1→2 로 늘었다가 다음 판에 0.
- B3 문지르는 path 도중 `sponge === true`, 손 떼면 false.
- B4 가로 화면: 친구 상자와 쌍둥이 그림 상자(`__tkp.twins` 의 x±0.3h, yb-h..yb) 겹침 면적 < 친구 상자의 10%.
- B5 `cele` 샷에 샤워 물방울 뒤 색종이, 욕조 속 친구 두 마리 머리.

### d-4. 글자 정원 (garden/game.js) — WP-4
핵심 루프 (유지·단축): 새싹 4개 → 톡(또는 문지르기)마다 비 → 잎 → 봉오리 → 꽃·열매 퐁 + 이름 읽기 + 이름표 → 넷 다 피면 바구니로 수확 → 축하 → 다음 씨앗 세트.

정확한 변경:
1. 시작 단계 1: `newSet` 에서 `g:1, stage:1` (흙더미+새싹 손그림 `o_sprout` 이 처음부터 보임). 톡 1번 = +1 단계 → 3번이면 4(꽃). 문지르기 양은 현재 공식 유지.
2. 크기: 세로 `S = min(W*0.19, H*0.1)`, 자리 `[[.27,.47],[.73,.47],[.27,.73],[.73,.73]]`; 가로 `S = min(W*0.09, H*0.17)`, 자리 그대로 `[[.25,.7],[.42,.7],[.58,.7],[.75,.7]]`. `bgArt` 흙 높이 계산은 현재 그대로 (세로 .36H). 윗줄 꽃 키(S*2.9 해바라기)가 화면 위 64px(집·소리 버튼) 아래인지 스크린샷 확인; 넘으면 윗줄 y 를 .5 로.
3. 공룡알: 1~3단계도 손그림 `o_dinoegg` 를 씀 — 그림 아래쪽 58%(껍데기)만 `ctx.clip` 으로 잘라, 크기 S×(1.3/1.6/1.9), 3단계는 흔들림(현재 회전식) + 금 간 선(현재 코드 선 유지). 4단계는 전체 그림(아기 공룡) + 크앙 소리(현재). 코드 알(`egg()`) 경로는 손그림이 아직 안 읽혔을 때만.
4. 흙더미: 모든 단계에서 `o_soil` 을 먼저 깔고 식물을 그 위에 (현재 1~3단계는 생략돼 알이 공중에 뜸).
5. 바구니 글자 삭제: 바구니 안 `HG.drawWord` 줄 삭제 (그림 아이콘만). 바구니 줄무늬 stroke 코드는 손그림 있으면 안 그림(현재 투명 처리 → 그냥 건너뛰기).
6. 꽃 핌: `TKP.found(p.x, p.y - S*1.6, { pose:'sniff' })` (기존 twin hop·giggle·spark 줄 대체, `sfx.sparkle()` 과 `HG.read` 와 `TK.wordPop` 은 유지). 다 핀 식물 톡 = 이름 다시 읽기 + 흔들림 (현재).
7. 축하: 'harvest' 끝 → `TKP.celebrate({ onDone: 다음 세트 })` (기존 party·flash·sparkle 정리). 쌍둥이 `TKP.init({ twins:{ port:{x0:.15,x1:.85,yb:.98,h:.19}, land:{x0:.08,x1:.92,yb:.98,h:.36} } })` + `TKP.drawTwins()`.
8. `__demo` `sayKey:'water'`. `__g` 추가: `plots()` → `[{kind, stage, x, y}]`, `S`.

판정 (tests/renewal/garden.js):
- G1 시작 직후 `plots()` 모든 stage === 1.
- G2 actions 만으로 한 판(harvest 진입)까지 tap 동작 수 ≤ 14.
- G3 세로 `S >= 70`.
- G4 좋아하는 것에 공룡 있는 설정(`--cfg '{"fav":["공룡"]}'`)에서 공룡알 칸 1~3단계 샷 = 손그림 점박이 알 (사람 눈), 흙더미 보임.
- G5 `cele` 샷 바구니에 글자 없음 (사람 눈).

### d-5. 가나다 실로폰 (band/game.js) — WP-5
핵심 루프 (유지): 자유 연주(북·실로폰·나팔·탬버린) + 반짝 바 따라 치기 → 12번(또는 노래 1곡)마다 친구 합류 → 셋이면 축하 → 친구 퇴장 → 반복.

정확한 변경:
1. `pickSyls()` → 항상 `syls = HG.GANA.slice(0, 6)` (가 나 다 라 마 바). 단계와 무관. 바를 칠 때 `HG.saySyl(syls[i])` (현재).
2. 친구 이름표: 세로 글자 크기 `H*0.026`, 가로 `H*0.034`; 친구 그림 세로 `H*0.09`, 가로 `H*0.15`. 합류 때 `TKP.found(f.hx, f.y, { side: f.hx < W/2 ? 0 : 1 })` + `HG.read(kind)` 400ms (현재).
3. 진행 표시: 노래 진행 점 24개 삭제. 친구 수 별 3개는 크기 `20*TK.U`, y `H*0.07`.
4. 쌍둥이: 춤 그리기 유지, 자세 `t.move % 2 ? 'jump' : 'happy'` (티노 'idle' 달리기 그림 제거), 축하는 TKP 자세. `TK.twin` → `TKP.drawTwin(i, …, { pose, rot: lean })`. 쌍둥이 톡 → `TKP.tap` 이 처리(기존 twin 히트 줄 삭제). 빈 곳 → `TKP.tapEmpty`.
5. 축하: `phase='party'` 진입 → `TKP.celebrate({ onDone: () => { phase='leave'; phaseT=0; band.forEach(f => f.leaving = true); } })` (기존 4초 타이머·confetti 삭제, 축하 중 랜덤 hop 은 친구들만 유지). 축하 중 악기 톡은 소리만 나고 hits 증가 없음(현재 phase 조건 그대로).
6. `__demo`: 북(`sayKey:'drum'`) / 쓸기(`sayKey:'sweep'`) 교대 (현재). `__g` 추가: `syls`.

판정 (tests/renewal/band.js):
- N1 `--cfg` stage 1, 2, 3 각각 `syls` 가 `['가','나','다','라','마','바']`.
- N2 40초 actions → `__tkp.celebrations >= 1`, `rounds >= 1`.
- N3 모든 샘플에서 `__tkp.twins[*].pose !== 'idle'`.
- N4 세로 `cele` 샷 친구 이름표가 읽힐 크기(글자 ≥ 20px, 사람 눈).

### d-6. 글자 별자리 (stars/game.js) — WP-6
핵심 루프 (유지): 다음 별 톡(또는 쓸기) → 선이 이어지며 음이 올라감 → 자음 완성(두 판에 한 번 긋기 판, 세 판마다 좋아하는 것 별자리) → 자음 이름 읽기 + 대표 그림 → 다음.

정확한 변경:
1. 별 크기 `R = min(W, H2)*0.03` (현재 .022), 히트 `max(40, R*3.2)`.
2. 완성 순간(`complete` 0.5초 뒤): `TKP.found(box.x + box.w/2, box.y + box.h/2, { side: rounds % 2 })` + 600ms 뒤 `H.readJamo`/`H.read(fig)` (현재) + `TKP.celebrate({ word: jamo || fig, onDone: () => { phase='fade'; phaseT=0; } })`; `fade` 0.5초 뒤 다음 판 (현재 party 4.2 + fade 0.8 → 3.0 + 0.5). `celebrate` 의 flash 는 fade 와 겹쳐도 됨.
3. 완성 표시: 자음 이름은 `H.drawTag(ctx, 이름, W/2, box.y + box.h + H2*0.05, min(W,H2)*0.07, { hi: -1 })` (이름표 카드, 현재 23px 글자 → 약 30px). 대표 그림은 **언덕 위 쌍둥이 사이에 서게**: 세로 (W/2, H2*0.93), 키 `min(W,H2)*0.2`; 가로 (W/2, H2*0.95), 키 `H2*0.28`; `TK.back` 으로 튀어나옴(현재). 그 아래 작은 이름표(대표 단어).
4. 쌍둥이 `TKP.init({ id:'stars', twins:{ port:{x0:.2,x1:.8,yb:.97,h:.2}, land:{x0:.12,x1:.88,yb:.97,h:.3} }, preload:['bg_stars','o_star'], music:'night' })`, 별 3개마다 하던 hop 은 `TKP.react(i,'wow',0.6)` 로. 기존 쌍둥이 히트 코드 삭제(`TKP.tap`).
5. `__demo` `sayKey:'star'`/`'trace'`. `__g` 추가: `R`, `exPos`({x, yb, h} 대표 그림 위치, 축하 중에만).

판정 (tests/renewal/stars.js):
- S1 `R >= 0.03 * min(W,H) - 0.5`.
- S2 `cele` 동안 `exPos.yb >= 0.9 * H` 이고 `exPos.x` 가 두 쌍둥이 x 사이.
- S3 완성(`phase` complete) → 다음 판 `play` 까지 ≤ 4.2초.
- S4 지도 판정 H3 와 함께: 처음 쓰는 기기에서 지도 → 별자리 진입 가능.

---

## e. 작업 묶음 (Work Packages)

### 공통 규칙 (모든 WP)
- 저장소 `/home/user/tinokoko-dino-game`, 브랜치 `claude/tinokoko-renewal`. 삭제 금지(파일·놀이·카드·설정). `assets/` 원본 수정 금지. 새 그림 생성 금지(`shared/pics`·`shared/assets` 기존 파일만).
- 기존 localStorage 키·값 형식 그대로 (`tk-hangul`, `tk-music`, `tk-blowmic`, `tk-season`, `tk-more`, `tk-old`, `tk-sleep`, `tk-hangul-log`, `tk-hangul-week`, `tk-bday-said`). 새 저장소 키는 `sessionStorage['tk-last-place']` 하나뿐.
- JS: 줄 중간 `//` 금지(`/* */`), `node --check <파일>` 통과, 외부 라이브러리·네트워크 금지(오프라인 정적 사이트).
- 성능: 매 프레임 새 Path2D·캔버스·큰 배열 만들지 않기, `shadowBlur` 는 현재 쓰는 곳 이상 늘리지 않기.
- 서버: `cd /home/user/tinokoko-dino-game && python3 -m http.server 8091` (백그라운드). 끌 때 `pkill -f http.server` 금지 → `pgrep -f "^python3 -m http.server 8091" | xargs -r kill`.
- 커밋: WP 끝에 자기 파일만 `git add <경로>` 후 커밋 (메시지 끝 Co-Authored-By/Claude-Session 줄). 놀이 WP 는 **`python3 common/build_games.py` 를 돌리지 않고 `sw.js`·`*/index.html` 을 커밋하지 않는다** (병렬 충돌 방지 — 마지막 통합에서 한 번).

### WP-0 플랫폼 (엔지니어 1명, 가장 먼저, 끝나야 WP-1~6 시작)
- 만지는 파일: `shared/play.js`(새), `shared/frame.js`, `shared/hangul.js`, `common/build_games.py`, `games/index.html`, `tests/renewal/run.js`(새), `tests/renewal/hub.js`(새), 빌드가 다시 쓰는 생성물(`*/index.html`, `sw.js`, `games/manifest.webmanifest`). `shared/tk.js` 는 **바꾸지 않는다** (필요 없음; 꼭 필요하면 GM 승인).
- 구현 명세: c 절 전체 + d-0.
  - `play.js` ≈ 220줄: c-1 함수 전부, c-2 우선순위, c-3 이벤트 수신, c-5 문구표, `window.__tkp`.
  - `frame.js`: c-7 열림 원/나감 그림·덮음, c-3 `tk:demo` 이벤트·`sayKey`, 첫 시범 시계(`start`)를 열림 원 끝난 시각으로. `__frame.iris` 추가. 나머지(잘 시간·계절·생일·SW) 그대로.
  - `hangul.js`: c-6 `H.pack = null` + `play()` URL 순서. 그 밖 무변경.
  - `build_games.py`: HTML 템플릿에 `<script src="../shared/play.js"></script>` 를 music.js 와 game.js 사이에, 루트 sw 미리 저장 `files` 에 `'shared/play.js'`. `python3 common/build_games.py` 실행.
  - `games/index.html`: d-0 1~9.
  - `tests/renewal/run.js`: c-8 그대로 (`run` 놀이의 판정 파일은 `run_game.js` 로 매핑, `hub` 는 `hub.js` 만 실행).
- 의존: 없음.
- 완료 기준: 6개 지도 놀이가 **아직 game.js 를 안 바꾼 상태로** 지금과 똑같이 동작(오류 0) + 열림 원·나감 연출이 보임 + 지도 판정 H1~H9 통과 + 기존 테스트 통과.
- 확인 (그대로 실행):
  ```
  node --check shared/play.js && node --check shared/frame.js && node --check shared/hangul.js
  python3 common/build_games.py
  grep -c 'shared/play.js' meet/index.html run/index.html bath/index.html garden/index.html band/index.html stars/index.html sw.js
  python3 -m http.server 8091 &   (저장소 루트)
  node tests/renewal/run.js hub
  for g in meet run bath garden band stars; do node tests/renewal/run.js $g --secs 20; done   # 모두 "not migrated" + 오류 0
  (python3 -m http.server 8770 &) ; node tests/frame_test.js ; node tests/hangul_test.js
  (python3 -m http.server 8772 &) ; node tests/home_test.js
  node tests/play.js bath stars garden band
  ```
  Playwright 개요(hub.js): 두 방향 × [빈 저장소 / desk:false / last-place=bath] 세 컨텍스트, H1~H9 순서대로, 샷 `docs/renewal/shots/wp0/hub_<view>_{map,wipe,back,hint,parent}.png`. 추가로 `docs/renewal/shots/wp0/meet_<view>_iris.png`(0.25초), `_bye.png`(집 버튼 톡 0.6초 뒤).
  기존 테스트가 지도 변경(책상 기본 열림 등) 때문에 실패하면 테스트 파일의 해당 기대값만 고쳐도 된다 (WP-0 만 `tests/` 기존 파일 수정 가능, 고친 줄을 커밋 메시지에 적기).

### WP-1 만나기 — `meet/game.js`, `tests/renewal/meet.js`
- 명세: d-1. 의존: WP-0. 변경 규모 ≈ 120~180줄.
- 완료 기준: M1~M5 통과 + 공통 판정 통과.
- 확인: `node --check meet/game.js && node tests/renewal/run.js meet --secs 30` (공통 러너는 `meet/?s=forest` 로 엶; M4 는 `tests/renewal/meet.js` 안에서 `meet/?s=sea` 페이지를 하나 더 열어 확인). 샷: `docs/renewal/shots/meet/` 의 `port_start, port_cele, port_hint, land_start, land_cele, land_hint` + `sea_port_start`.

### WP-2 달리기 — `run/game.js`, `tests/renewal/run_game.js`
- 명세: d-2. 의존: WP-0. 변경 규모 ≈ 120~200줄.
- 완료 기준: R1~R4 통과(R5 는 샷 확인) + 공통 판정.
- 확인: `node --check run/game.js && node tests/renewal/run.js run --secs 40`. R2 스크립트 개요: `util.g` 로 `__g` 에 임시 노출한 풍선 목록(`__g.balloons` getter 추가: `[{x,y,popped}]`)을 50ms 간격으로 읽다가 `x` 가 `twin.x + speed*0.8` 근처가 되면 그쪽 반 클릭 → 600ms 뒤 `got` 비교. 샷: `port_t3, port_play_03, port_cele, land_t3, land_cele, port_hint`.

### WP-3 목욕 — `bath/game.js`, `tests/renewal/bath.js`
- 명세: d-3. 의존: WP-0. 변경 규모 ≈ 200~280줄 (가장 큼; 욕조·샤워·오리 코드는 재사용).
- 완료 기준: B1~B5 통과 + 공통 판정.
- 확인: `node --check bath/game.js && node tests/renewal/run.js bath --secs 40`. B3 개요: `__g.box` 가운데에서 mouse.down → 10걸음 좌우 이동 중 `__g.sponge` 읽기 → up 후 다시 읽기. 샷: `port_start(흙 묻은 친구), port_play_02(스펀지·거품), port_clean(이름표), port_tub(욕조 속 친구), port_cele, land_start, land_cele`.

### WP-4 정원 — `garden/game.js`, `tests/renewal/garden.js`
- 명세: d-4. 의존: WP-0. 변경 규모 ≈ 100~160줄.
- 완료 기준: G1~G3 통과, G4·G5 샷 확인, 공통 판정.
- 확인: `node --check garden/game.js && node tests/renewal/run.js garden --secs 30 && node tests/renewal/run.js garden --secs 20 --cfg '{"fav":["공룡"],"stage":2}'`. 샷: `port_start(새싹 4개), port_egg(알 2단계), port_bloom, port_cele, land_start, land_cele`.

### WP-5 실로폰 — `band/game.js`, `tests/renewal/band.js`
- 명세: d-5. 의존: WP-0. 변경 규모 ≈ 80~140줄.
- 완료 기준: N1~N3 통과, N4 샷, 공통 판정.
- 확인: `node --check band/game.js && for s in 1 2 3; do node tests/renewal/run.js band --secs 40 --cfg "{\"stage\":$s}"; done`. 샷: `port_start, port_play_04(친구 합류), port_cele, land_start, land_cele`.

### WP-6 별자리 — `stars/game.js`, `tests/renewal/stars.js`
- 명세: d-6. 의존: WP-0. 변경 규모 ≈ 80~140줄.
- 완료 기준: S1~S3 통과 + 공통 판정 (S4 는 WP-0 의 H3).
- 확인: `node --check stars/game.js && node tests/renewal/run.js stars --secs 40` (긋기 판과 고래·공룡 별자리 판이 40초 안에 한 번씩 나오는지 로그로 확인; 안 나오면 `--secs 70`). 샷: `port_start, port_trace, port_cele, land_start, land_cele, port_hint`.

### 통합 (WP-1~6 끝난 뒤, GM 또는 WP-0 엔지니어)
```
git pull/merge 순서 상관없음 (파일 겹침 없음)
for f in shared/play.js shared/frame.js shared/hangul.js meet/game.js run/game.js bath/game.js garden/game.js band/game.js stars/game.js; do node --check $f || echo FAIL $f; done
python3 common/build_games.py
for g in hub meet run bath garden band stars; do node tests/renewal/run.js $g --secs 40 || echo FAIL $g; done
node docs/renewal/smoke.js   (BASE=http://localhost:8091/ 로)
기존 테스트 4종 (WP-0 확인 목록과 같음)
git add sw.js */index.html games/manifest.webmanifest && 커밋
```

### 범위 밖 (하지 않는다)
- 새 그림 생성·요청, `bg_map.webp` 제작 (오면 현재 코드가 자동으로 씀).
- 음성 파일 생성·음성 엔진 교체 (c-6 고리만 만든다).
- 부모 화면 구조·문구 개편 (d-0 8번의 도움말 4개 교체만).
- 숨은 놀이 5개(까꿍·그림책·짝꿍·발자국·배)와 예전 게임 3개의 코드 변경 (빌드로 play.js 태그가 붙는 것 외).
- 루트 러너(`index.html`), `rainbow-bubbles`, `peekaboo` 단독 페이지.
- 3D, 점수·수집·실패·시간 제한, 아이 화면 안내 글자.
- 배포(`common/deploy_pages.sh`) — 사용자 확인 뒤 별도.

---

## f. 오너 최종 인수 점검표

자동 (전부 PASS 여야 함):
- [ ] `tests/renewal/run.js` hub + 6개 놀이 두 방향 PASS, 오류 0.
- [ ] 기존 `frame_test.js`, `home_test.js`, `hangul_test.js`, `tests/play.js`, `docs/renewal/smoke.js` 통과.
- [ ] 모든 바뀐 JS `node --check` 통과, `grep -nE '[;)}] *//' <바뀐 js>` 결과를 눈으로 보고 줄 중간 주석 없음.
- [ ] `git diff --stat 69fba8c..` 에 삭제된 파일 0, `assets/` 변경 0, `shared/pics` 변경 0.
- [ ] `sw.js` 미리 저장 목록에 `shared/play.js`.

스크린샷으로 내가 직접 볼 것 (세로·가로 각각):
- [ ] 지도: 글자 0, 7곳 모두 열림(새 기기), 책상이 밤하늘 그림, 장소 톡 때 크림 원이 그 장소에서 퍼짐, 돌아오면 그 장소 반짝.
- [ ] 6개 놀이 첫 화면 (`start`): 3초 안에 "무엇을 톡할지" 하나가 분명함 (숨은 머리 / 다가오는 풍선 / 흙 묻은 친구 / 새싹 / 반짝 바 / 숨 쉬는 별).
- [ ] 쌍둥이: 티노 왼쪽·코코 오른쪽, 평소 달리기 그림이 아닌 서 있는 그림(달리기 놀이 제외), 힌트 때 가운데를 가리킴, 축하 때 만세·손뼉 엇갈림.
- [ ] 축하: 6개 놀이 모두 같은 모양(팡파르·색종이·만세)·같은 길이(3초, 결승선만 4.2초)·하얀 번짐으로 다음 판.
- [ ] 코드로 그린 대체 그림이 놀이 중(열림 원 이후) 보이지 않음: 돌멩이·공룡알·실로폰은 의도된 잉크 그림만.
- [ ] 화면 밖으로 잘린 이름표·그림 없음 (만나기 축하, 정원 윗줄 꽃, 실로폰 친구).
- [ ] 아이가 읽어야 하는 안내 글자 없음 (보이는 글자는 배우는 단어·글자·이름표뿐).

손으로 (실기기 또는 Playwright 터치 에뮬레이션):
- [ ] 아무 곳이나 10번 톡 → 10번 모두 소리 + 화면 반응.
- [ ] 집 버튼 → "안녕" 손그림 인사 → 지도, 같은 장소 반짝.
- [ ] 부모 톱니 1초 꾹, 모든 설정 저장·복원, 숨은 카드 2묶음 열림·기억, 책상 끔 → 지도 책상 흐림.
- [ ] 잘 시간 10분 설정 → 놀이 중 잠듦, 해 버튼 1초 꾹 깨움 (frame 무변경 확인).
- [ ] 비행기 모드(서비스워커 설치 뒤) 지도·6개 놀이 열림.

---

## 남은 위험 (owner 판단)
1. 책상 기본 열림은 1차 설계의 의도적 잠금을 뒤집는다. 사용자가 "별자리는 부모와만" 을 원했다면 `desk !== false` 한 줄을 `=== true` 로 되돌리면 된다 (부모 화면 문구 포함).
2. 목욕 재설계가 가장 큰 변경(≈250줄). 가로 화면에서 친구와 욕조 속 쌍둥이 머리가 겹칠 수 있어 B4 로 막았지만, 실패하면 친구 키를 0.36H 로 낮추는 것이 대응.
3. 달리기 자석 점프는 "몸으로 맞추는 재미"를 줄인다. 3살 기준으로 성공이 더 중요하다고 판단했다. 기존 충돌 수집은 남겨 큰 아이는 직접 맞혀도 됨.
4. 모바일에서 놀이 첫 시범의 말은 사용자 동작 전이라 무음일 수 있다 (브라우저 정책). 시각 시범(별+쌍둥이 point)이 그래서 중요하다.
5. 실제 아이폰 Safari 미확인 (clip-path 원 전환, 열림 원 캔버스, 세션 저장소). Chromium 에서만 확인 예정.
6. 음성 파일 연결(`H.pack`) 후 `H.read` 가 단어 파일만 있으면 글자별 읽기가 사라진다 — 음성 담당이 음절 파일도 만들거나 `H.read` 를 조정해야 한다 (이 플랜 범위 밖).
7. `tests/renewal/run.js` 이름이 달리기 놀이(`run`)와 겹쳐 판정 파일을 `run_game.js` 로 둔다 — 엔지니어가 헷갈리지 않게 WP-0 이 러너 안에 매핑을 하드코딩.
