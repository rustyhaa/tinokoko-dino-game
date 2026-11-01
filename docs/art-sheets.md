# 한 번에 던지는 그림 요청 (격자 시트 방식)

그림 55장을 하나씩 뽑지 않고 격자로 그리게 해서 **캐릭터 시트 3번 + 배경 시트 2번 = 5번**에 끝낸다.
받은 시트는 Claude가 칸별로 잘라 배경을 지우고 이름을 붙인다 (`docs/art-prompts.md` 의 파일 이름 그대로).

- 도구: Meta AI(뮤즈 이미지), ChatGPT, Gemini 어느 것이든. 참고 그림 첨부가 되면 `assets/tino_jump_v2.png`·`assets/coco_laugh_v2.png` 를 함께 붙인다.
- 칸이 합쳐지거나 순서가 틀리거나 글자가 들어간 칸만 나중에 따로 다시 뽑으면 된다.
- 받은 그림은 저장소 `art/sheets/` 에 올리기 (맨 아래 '올리는 곳').

## 시트 공통 문장 (매 시트 앞에 붙임)

```
Draw a 4x4 grid sprite sheet of 16 separate cute illustrations, square image, plain pure white background, equal-size cells with clear white space between cells, one subject per cell, centered, nothing touching the cell edges, no grid lines, no text, no letters, no numbers, no labels.
Art style for every cell (match the attached characters if provided): hand-drawn children's picture-book illustration, soft colored-pencil and crayon texture, thin dark brown-black ink outline with slightly wobbly lines, warm pastel colors, rosy cheeks and big shiny friendly eyes on living things, chubby rounded proportions, friendly for a 3-year-old, no sharp teeth.
Cells in reading order (left to right, top to bottom):
```

## 시트 1 — 동물·사람 (16)

```
1 smiling young mom with long brown hair and pink top, upper body
2 smiling young dad with short dark hair, round glasses, light blue shirt, upper body
3 butterfly with pink and light-blue wings
4 white bunny sitting, pink inner ears
5 round green frog sitting
6 lavender jellyfish with wavy tentacles
7 red crab with round claws raised
8 yellow duckling standing
9 chubby lavender-gray hippo sitting
10 round blue whale with light belly and small water spout
11 lion cub with fluffy orange mane
12 round friendly soft purple spider with eight short chubby legs
13 green baby long-neck dinosaur
14 round orange fish
15 pink starfish with a face
16 fluffy yellow chick
```

## 시트 2 — 먹을 것·물건 (16)

```
1 red apple with a green leaf
2 bunch of three yellow bananas
3 bunch of purple grapes
4 small white-and-blue milk carton with a straw, blank carton
5 red tomato with green leaves
6 green cucumber
7 slice of pizza
8 wedge of yellow cheese with holes
9 brown acorn with cap
10 yellow child's sun hat with ribbon
11 child's blue jean shorts
12 round green tree with brown trunk
13 smiling sun with soft rays
14 toy train engine with one car, red and blue, side view
15 retro orange radio with antenna, blank front
16 smiling planet Earth
```

## 시트 3 — 공룡 7 + 고래 7 + 2 (16)

```
1 baby Tyrannosaurus rex on two legs, big head, tiny arms, small rounded teeth smiling, green-brown
2 baby Triceratops, frill and three short rounded horns, orange-tan
3 baby Stegosaurus, two rows of rounded back plates, teal with orange plates
4 baby Brachiosaurus, very long neck reaching up, light blue-green
5 baby Ankylosaurus, low wide armored body with bumps, club tail, sandy brown
6 baby Spinosaurus, tall rounded red-orange sail on its back, long snout
7 baby Pteranodon flying, wings spread, head crest, purple-gray
8 round brown owl with ear tufts
9 humpback whale with very long white flippers, side view
10 blue whale, long slender blue-gray body with light spots, side view
11 orca, black back, white belly and eye patch, tall dorsal fin, side view
12 sperm whale with huge square head, gray, side view
13 bottlenose dolphin jumping
14 white beluga whale with round forehead
15 narwhal with one long straight spiral tusk, rounded tip
16 glowing yellow star with a smiling face
```

## 배경 시트 2장 (2×2 격자, 캐릭터 시트처럼 잘라 씀)

한 장에 배경 4칸씩, **2번 요청**으로 7장면을 받는다. 세로 화면은 Claude가 각 칸의 가운데를 잘라 쓴다.
배경은 칸이 커야 하므로 **도구에서 고를 수 있는 가장 큰 크기(정사각형)** 로 받는다.

### 배경 공통 문장 (매 시트 앞에 붙임)

```
Draw one square image split into a 2x2 grid of 4 separate wide 16:9 background scenes, with a thick pure white gap between the panels and a white border around the outside. Each panel is its own complete scene; nothing crosses from one panel to another.
Art style for every panel (match the attached characters if provided): hand-drawn children's picture-book illustration, soft colored-pencil and crayon texture, thin dark brown ink lines, warm pastel colors, gentle paper grain.
Background scenery only: no characters, no animals, no people, no text, no letters, no numbers, no labels.
In each panel keep the middle calm, simple and low-contrast (game objects go on top), and let the left and right sides continue the same scenery.
Panels in reading order (top-left, top-right, bottom-left, bottom-right):
```

### 배경 시트 A (`bgsheet1.png`)

```
1 calm night sky from deep navy to soft indigo, a few tiny stars, crescent moon in the upper right, gentle dark teal grassy hill along the bottom
2 sunny beach, light blue sky with a few clouds, soft green hills far away, wide empty warm sand across the middle and bottom (no footprints), calm sea on the right side
3 cozy small theater stage, purple curtains on both sides, warm spotlights, wooden stage floor along the bottom, empty stage
4 cozy playroom front view, cream wall, soft wooden table top filling the lower third, a sunny window
```

### 배경 시트 B (`bgsheet2.png`)

```
1 bright beach, sand in the lower half, calm sea and sky above, open empty space on the sand
2 sunny forest meadow, soft grass in the lower half, trees far in the back
3 quiet night meadow, big soft moon, dark blue sky, grass in the lower half
4 leave this panel completely empty pure white
```

칸 순서 → 파일: A1 `bg_stars` · A2 `bg_steps` · A3 `bg_band` · A4 `bg_shapes` · B1 `bg_pk_beach` · B2 `bg_pk_forest` · B3 `bg_pk_night`

## 올리는 곳

저장소 `art/sheets/` 에 `sheet1.png`~`sheet3.png`, `bgsheet1.png`, `bgsheet2.png` 로 올린다 (브랜치 `claude/tinokoko-games-pack`).
자르기는 `python3 common/cut_sheets.py` (Claude가 실행) → `art/cut/` 에 칸별 파일.
