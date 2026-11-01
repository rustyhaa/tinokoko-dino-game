# 자동 확인 스크립트 (Playwright, 저장소에 있는 Chromium 사용)

모두 저장소 루트를 `/home/user/tinokoko-dino-game` 로 가정한다(경로가 하드코딩됨). 스크린샷은 `tests/shots/`(git 제외).

| 파일 | 확인 내용 | 서버 |
|---|---|---|
| `play.js <게임...>` | 엔진 게임(bath boat shapes stars garden band blow)을 `__g.actions()` 대로 실제 입력해 한 판 끝까지, 가로·세로 | 불필요(file://) |
| `rainbow_test.js` | 가나다 방울 데스크톱·폰·태블릿, 터치 드래그 | 불필요 |
| `pk1.js` | 글자 까꿍 세 장면 순환 | 불필요 |
| `frame_test.js` | 9개 게임 × 기기 6종 별 시범, 잘 시간, 놀이터 화면, 오프라인 | `python3 -m http.server 8770` |
| `home_test.js` | 집 버튼 톡 → 놀이터 (러너·게임) | `python3 -m http.server 8772` |
| `hangul_test.js` | 부모 설정(이름·단계·이번 주 글자), 가짜 마이크 녹음, 단계별 동작 | 8770 |
| `fav_test.js` | 공룡·고래: 별자리·공룡알·장난감 고래·실로폰 친구, 단어 빈도 | 불필요 |

빌드는 먼저: `python3 common/build_games.py`
