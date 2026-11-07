#!/usr/bin/env bash
# 사이트(GitHub Pages) 배포: 작업 브랜치의 게임 파일을 gh-pages 브랜치에 옮겨 푸시한다.
#   저장소 루트에서:  bash common/deploy_pages.sh
# 순서: 빌드 → 작업 트리가 깨끗한지 확인(빌드 결과까지 커밋돼 있어야 함) → 임시 worktree 에 gh-pages 받기
#       → 게임 파일 복사 → 바뀐 게 있으면 커밋·푸시. 원본 브랜치·백업 브랜치는 건드리지 않음.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
# 배포할 경로: 공통 파일 + build_games.py 의 게임 목록(GAMES·STANDALONE·THREE_D)에서 자동으로 (새 게임 폴더를 빠뜨리지 않게)
GAME_DIRS=$(python3 -c "import sys; sys.path.insert(0,'common'); import build_games as b; print(' '.join(list(b.GAMES) + b.STANDALONE + b.THREE_D))")
PATHS=(index.html sw.js shared games common docs $GAME_DIRS)

python3 common/build_games.py
if [ -n "$(git status --porcelain -- "${PATHS[@]}")" ]; then
  echo "중단: 커밋 안 된 변경이 있습니다 (빌드 결과 포함). 먼저 커밋·푸시하세요." >&2
  git status --short -- "${PATHS[@]}" >&2
  exit 1
fi

WT="$(mktemp -d)/gh-pages"
cleanup() { git worktree remove --force "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git fetch -q origin gh-pages
git worktree add -q --detach "$WT" origin/gh-pages
(
  cd "$WT"
  git checkout "$SRC_BRANCH" -- "${PATHS[@]}"
  git add -A
  if git diff --cached --quiet; then echo "바뀐 것 없음: 배포 생략"; exit 0; fi
  git commit -q -m "GitHub Pages: ${SRC_BRANCH} $(git rev-parse --short "$SRC_BRANCH") 배포

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  for i in 1 2 3 4; do git push -q origin HEAD:gh-pages && break; sleep $((2 ** i)); done
  echo "배포 완료: gh-pages $(git rev-parse --short HEAD)"
)
