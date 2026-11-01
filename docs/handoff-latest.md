# 핸드오프: 티노코코 한글 놀이터 — 다음 단계(docs/next-plan.md) 진행

## 다음 한 걸음
`docs/next-plan.md` 를 읽고 사용자에게 A(실기기 점검) 결과를 물은 뒤, 답을 기다리는 동안 C-1부터 시작: `tests/*.js` 의 하드코딩 경로(`/home/user/tinokoko-dino-game`, 포트 8770/8772)를 저장소 기준 상대 경로로 바꾸고 `tests/run.sh` 로 서버 띄우기+전체 테스트를 한 줄로 만든다.

## 작업 위치
- 저장소: `rustyhaa/tinokoko-dino-game`, 클론 `/home/user/tinokoko-dino-game` (새 세션이면 `git clone` 후 `git checkout claude/tinokoko-games-pack`)
- 원본 브랜치: `claude/tinokoko-games-pack` (이 문서 커밋 시점 기준 최신)
- 배포: `gh-pages` = 루트 러너(index.html, assets/) + 게임 폴더들. 갱신 방법: 별도 worktree에서 `git checkout gh-pages` 후 `git checkout claude/tinokoko-games-pack -- index.html sw.js shared games common docs bath boat shapes stars garden band blow rainbow-bubbles peekaboo` → 커밋·푸시
- 사이트: https://rustyhaa.github.io/tinokoko-dino-game/games/ (이 세션 네트워크에선 github.io 접속 불가, 로컬 http.server로 확인함)
- 백업(건드리지 말 것): `backup/playground-20261101`(한글 전 코드 9ea35fc), `backup/gh-pages-20261101`(한글 전 배포 c052520)

## 끝난 것 (Playwright Chromium으로 확인, 콘솔 오류 0)
- 9개 게임 한글 전환 + 부모 설정(아이 이름·단계①②③·이번 주 글자·녹음·기기 음성 시험·오늘 본 글자·잘 시간) — `tests/play.js`, `hangul_test.js`
- 공룡·고래 반영(좋아하는 것 설정, 별자리·공룡알·장난감 고래·실로폰 친구, 단어 3배) — `tests/fav_test.js`
- 집 버튼 톡 한 번(러너 포함), 별 시범, 잘 시간, 놀이터 앱 하나+오프라인 — `frame_test.js`, `home_test.js`
- 다음 기획 `docs/next-plan.md` 작성

## 남은 것
1. 사용자 실기기 점검(A) 결과 반영 — iOS Safari 음성·녹음·설치 전부 **미확인**
2. C-1 테스트 한 줄화 → C-2 그림 캐시(`shared/hangul.js` 의 `H.drawPic`) → C-3 스프라이트 축소 사본
3. B-1 손가락 따라 긋기(stars), B-2 녹음 마법사(games/index.html)

## 알아둘 것
- 구조: `shared/tk.js`(엔진) + `shared/hangul.js`(단어 사전·그림·자음 획·읽기·녹음·설정) + `shared/frame.js`(집 버튼·별 시범·잘 시간·모바일 보정·SW 등록) + 게임별 `game.js`. `rainbow-bubbles/`, `peekaboo/` 는 엔진 이전 단독 HTML.
- 빌드: `python3 common/build_games.py` — 게임 index.html·아이콘·`shared/assets` 복사·루트 `sw.js`(파일 해시로 버전) 생성. 게임 파일 바꾸면 반드시 다시 실행.
- 게임 약속: `window.__demo()`(별 시범 내용), `window.__g.actions()`(자동 테스트용 다음 입력), `window.__paused`(잘 시간·나갈 때 멈춤).
- 게임 파일 안의 `H` 는 화면 높이인 곳이 있어 한글 모듈은 `HG = window.H` 로 씀(boat·garden·blow·band·rainbow·peekaboo).
- 사용자 규칙: 스프라이트 원본 PNG 수정 금지(사본만), 실패·점수·수집 금지, 아이 화면 안내 글자 금지. 커밋 끝에 Co-Authored-By/Claude-Session 줄.
- 헛다리: frame.js 경로를 `../` 고정으로 했다가 루트 러너에서 깨짐 → `document.currentScript.src` 기준으로 바꿈. 무지개 줄 끝 글자는 너무 작아 무지개 위 일곱 칸 줄로 옮김. `pkill -f http.server` 는 실행 중인 셸까지 죽이니 `pgrep -f "^python3 -m http.server"` 로 골라 kill.
- 이 세션 GitHub Pages 설정 API는 막혀 있음(사용자가 직접 설정 완료함).
