# WP-0 platform 메모 (게임 엔지니어용)

완성: `shared/play.js`(TKP), `shared/frame.js`(열림 원·나감 연출·`tk:demo`·`sayKey`), `shared/hangul.js`(`H.pack` 고리), `common/build_games.py`(play.js 태그·precache), `games/index.html`(d-0), `tests/renewal/run.js`·`hub.js`.
빌드 결과(`*/index.html`, `sw.js`)는 이미 `play.js` 태그가 들어간 상태로 만들어 두었음 — 놀이 WP 는 build 를 돌리지도 커밋하지도 않는다.
**지도 책상은 gm-addendum 대로 기본 잠김 (`cfg.desk === true` 일 때만 열림)**. 목소리 파일 토글은 보류라 부모 화면에 없음.

## TKP 시그니처 (구현 그대로, 계약 c 절과 같음)
- `TKP.init(o) -> TKP` : `o.id, place, twins:{port:{x0,x1,yb,h},land:{…}}|null, idlePose('happy'), preload:['bg_x','o_y'], music`. 호출 전에는 완전히 비활성(`tap` 은 false). `place` 를 `sessionStorage['tk-last-place']` 에 즉시 기록. `TKP.ready` 를 새로 만듦.
- `TKP.ready` : Promise (init 전에는 이미 풀려 있음). `TKP.inited`, `TKP.busy`(축하 중).
- `TKP.update(dt)` : game.update 맨 앞에서. 쌍둥이 hop/react/hint 타이머, 축하 진행(색종이 포함).
- `TKP.drawTwins()` : `o.twins` 배치로 둘 다 그림 (port 는 `TK.H >= TK.W`).
- `TKP.drawTwin(i, x, yb, h, opt={}) -> w` : `opt.pose` 강제 자세, `opt.rot/alpha/face/sx/sy` 는 TK.twin 으로 전달.
- `TKP.pose(i) -> {pose, hop, lift}`, `TKP.side(x)`, `TKP.twinAt(x,y)`, `TKP.tap(x,y)`, `TKP.tapTwin(i)`, `TKP.tapEmpty(x,y)`, `TKP.found(x,y,{side,pose})`, `TKP.react(i|'both', pose, sec=1.2)`, `TKP.celebrate({big,word,onDone})`, `TKP.say(key)`, `TKP.setPlace(key)`, `TKP.idle()`, `TKP.PHRASES`, `window.__tkp`.

## 계약 정리 (clarifications)
1. **drawTwin 의 기록 좌표**: 놀이가 `translate`/`scale` 을 건 채 (0,0) 에 그려도(달리기) `__tkp.twins[i]` 와 `twinAt` 에는 현재 변환(`ctx.getTransform`, DPR 나눔)을 거친 **화면 좌표** 가 들어감. 회전은 무시.
2. **bob/hop 적용**: `opt.pose` 를 주지 않으면 평소 bob(h*0.02)과 hop 높이가 적용. `opt.pose` 를 강제하면 평소 bob·hop 은 없음 (놀이가 위치를 직접 정함). 단 **축하 중**에는 강제 자세여도 큰 bob(h*0.1, 속도 7)과 hop 이 적용됨(달리기가 `TKP.pose(i).pose` 를 넘겨 축하 때 같이 뛰게).
3. **tap 순서**: ① 쌍둥이를 맞으면(축하 중에도) tapTwin 후 true ② 축하 중이면 spark+soft 후 true ③ 아니면 false. `TKP.init` 전에는 항상 false.
4. **tapEmpty 의 hop**: 그쪽 쌍둥이 hop 높이 0.5배.
5. **축하 길이**: `busy` 는 `dur`(3.0/4.2초) 동안 true. `onDone` 은 `dur-0.25` 에, `TK.flash` 는 `dur-0.4` 에 한 번. `dur` 에 phase 가 'play' 로 돌아옴(0.25초는 하얀 번짐 아래라 보이지 않음). 이미 축하 중이면 `celebrate` 무시. `onDone` 예외는 console.warn 으로만.
6. **found**: 반대쪽 쌍둥이는 hop 한 번. `opt.side` 가 있으면 그쪽, 없으면 `side(x)`. 쌍둥이 자세 대기열이 덮어쓰기(이전 react 는 사라짐).
7. **힌트**: `tk:demo` 의 `detail.x` 로 **마지막에 그린 쌍둥이 중 가까운 쪽**(아직 안 그렸으면 `side(x)`)을 `point` 1.8초. 자세 우선순위 = 축하 > react > 힌트 > idlePose.
8. **say**: `TK.muted` 면 무시, 같은 키 4초 안 반복 무시, `H.say(text, 'p:'+key)`. 없는 키는 무시(조용히). `__tkp.lastSay` 에 키 기록.
9. **tapTwin 읽기**: 같은 쌍둥이 1.5초 안 재읽기 없음(효과음·하트·hop 은 매번).
10. **preload**: `H.lazyImg(이름)` 을 40ms 마다 확인, 전부 읽히거나 900ms 에 `ready`. 파일이 없어도 900ms 후 풀림.
11. 전역 리스너(pointerdown/keydown capture, `tk:demo`)는 첫 `init` 에서 한 번만 걸림. `TKP.init` 두 번째 호출은 설정만 갈아 끼움(리스너 중복 없음).

## frame.js (놀이 연결)
- `#tkfx` 에 크림색 `#fff8e7` 을 덮어 두고 `TKP.ready`(init 안 한 페이지는 즉시)와 900ms 중 먼저인 때 (W/2, H*0.55) 에서 0.5초 ease-out 으로 구멍을 엶. `window.__frame.iris` = `'cover'|'opening'|'done'`. 첫 별 시범 시계는 열림이 끝난 시각부터 1.6초. `window.TK_FRAME = { iris:false }` 로 끌 수 있음 (기본 켬, 모든 frame.js 페이지).
- 시범: `__demo()` 가 `sayKey` 를 주면 `TKP.say(sayKey)`, 아니면 `say` 문자열. 시작할 때 `tk:demo`{x,y} 이벤트.
- 나감: 손그림 `o_tino_cheer`/`o_coco_cheer`(손 흔들기 그대로), 1.0초에 `#tkbye.cream`(크림색), 1.4초에 지도.
- 지도(games/index.html)는 장소를 톡할 때 `sessionStorage['tk-last-place']` 를 **스스로 기록**하므로 TKP 로 옮기지 않은 놀이도 돌아오면 그 장소가 반짝임. `.back`·`.hop`·`.hint` 클래스와 `#wipe` 는 d-0 명세 그대로 (`.back` 의 부모 화면 버튼 CSS 충돌을 피하려고 기존 규칙을 `button.back` 으로 좁힘).

## 음성 고리 (hangul.js, 기본 꺼짐)
- `H.pack(key)` 는 **함수**(gm-addendum). `localStorage['tk-voicepack']==='1'` 이고 `shared/voice/pack.json`({"v":1,"files":{키:파일}})을 읽었고 키가 있을 때만 주소, 아니면 null. pack.json 은 켜져 있을 때만 hangul.js 가 한 번 fetch, 실패는 조용히. 부모 화면 토글은 없음(보류) — 켜려면 콘솔에서 `localStorage['tk-voicepack']='1'`.
- `play()` 순서: 부모 녹음 → `H.pack` → 기기 음성. `H.read/H.readJamo` 는 조각(음절·낱말, 자음은 이름·대표 단어)별로 pack 파일이 하나라도 있으면 조각별 재생(없는 조각만 기기 음성), `H.hi` 강조도 따라감. 부모 녹음이 있는 낱말은 지금처럼 녹음만 재생. 조각 키: `p:yay`·낱말·음절·자음 이름('기역'). `H.packInfo()`/`H.packLoad()`/`H.packOn()` 보조.
- build_games.py 는 `shared/voice/` 가 있으면 안의 파일을 sw.js precache 에 넣음(없으면 아무 일 없음).

## 테스트 러너 사용법
```
cd /home/user/tinokoko-dino-game && python3 -m http.server 8091 &      (또는 --serve 로 러너가 임시 서버를 띄움)
node tests/renewal/run.js <meet|run|bath|garden|band|stars> --secs 30 [--cfg '{"stage":3}'] [--base http://localhost:8092/] [--shots 폴더]
node tests/renewal/run.js hub            # 지도·부모·연출 (tests/renewal/hub.js)
node tests/renewal/run.js pages          # 엔진 11 + 단독 2 열림, TKP 존재
```
- 놀이별 판정은 `tests/renewal/<놀이>.js` (run 은 `run_game.js`): `module.exports = async (page, view, util) => [{name, ok, detail}]`, `util = {W, H, shot(label), drive(ms, {each}), wait(ms), g(expr)}`. 러너가 방향(port 390x844 / land 844x390)마다 호출. `view` = `{name, w, h}`.
- 러너는 `__tkp.inited` 가 false 면 "TKP not migrated" 로 표시하고 TKP 판정은 건너뜀. 이동 후엔 `celebrations>=1`, 쌍둥이 x 순서, 12초 무입력 중 별 시범과 `point` 자세를 확인.
- 콘솔 오류 수집에서 **제외**하는 것: `shared/voice/*`·`shared/pics/bg_map.webp`(아직 없는 선택 그림, 지도가 시도해 404) 의 "Failed to load resource" 한 줄. 페이지 오류·그 밖 console.error 는 실패.
- 판정 파일 안에서 다른 페이지를 열어야 하면(M4 의 `?s=sea`) `page.context().newPage()` 를 쓰고 오류 수집은 직접.
- 서버 끌 때 `pkill -f http.server` 금지.

## 알려진 사항
- `rainbow-bubbles` 는 원래부터 `shared/assets/tino_laugh_v3.png`·`tino_sleep.png`·`coco_sleep.png` 404 세 줄이 남음(이번 변경과 무관). `pages` 판정에서 그 세 줄은 허용.
- `tests/play.js`(file://)는 Pretendard 글꼴 CORS 오류 두 줄을 항상 남김(기존 동작).
- 열림 원은 첫 페인트 직후 frame.js 가 실행될 때부터 덮음(그 전 한 프레임은 게임 배경).
