# 한 번에 던지는 그림 요청 (격자 시트 방식)

그림 62장을 하나씩 뽑지 않고, **한 장에 16개씩 격자로** 그리게 해서 **4번 + 배경 7번 = 11번**에 끝낸다.
받은 시트는 Claude가 칸별로 잘라 배경을 지우고 이름을 붙인다 (`docs/art-prompts.md` 의 파일 이름 그대로).

- 도구: Meta AI(뮤즈 이미지), ChatGPT, Gemini 어느 것이든. 참고 그림 첨부가 되면 `assets/tino_jump_v2.png`·`assets/coco_laugh_v2.png` 를 함께 붙인다.
- 칸이 합쳐지거나 순서가 틀리거나 글자가 들어간 칸만 나중에 따로 다시 뽑으면 된다.
- 받은 그림은 대화에 첨부하거나 저장소 `art/` 폴더에 올리기. 파일 이름은 `sheet1.png` … `bg_stars.png` 처럼.

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

## 배경 7장 (각각 따로, 가로 16:9 한 장만)

세로 화면은 Claude가 가운데를 잘라 쓴다. 그래서 **중요한 것은 가운데, 양옆은 비슷한 풍경이 이어지게** 요청한다.

```
Wide 16:9 background scenery, same hand-drawn picture-book colored-pencil style, warm pastel.
No characters, no animals, no people, no text. Calm simple middle area. The left and right thirds continue the same scenery so the center can be cropped to portrait.
Scene:
```

| 파일 | 장면 (Scene: 뒤에 붙임) |
|---|---|
| `bg_stars.png` | calm night sky deep navy to indigo, tiny stars, crescent moon upper right, dark teal grassy hill along the bottom |
| `bg_steps.png` | sunny beach, light blue sky with clouds, soft green hills far away, wide empty warm sand in the middle and bottom, calm sea on the right |
| `bg_band.png` | cozy small stage, purple curtains both sides, warm spotlights, wooden floor at the bottom, empty |
| `bg_shapes.png` | cozy playroom front view, cream wall, wooden table top filling the lower third, sunny window |
| `bg_pk_beach.png` | bright beach, sand in the lower half, sea and sky above |
| `bg_pk_forest.png` | sunny forest meadow, grass in the lower half, trees far back |
| `bg_pk_night.png` | quiet night meadow, big soft moon, dark blue sky, grass in the lower half |
