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

## 시트 4 — 글자 까꿍 숨는 물건 (`sheet4.png`, 14칸 + 빈칸 2)

까꿍에서 그림을 가리는 큰 물건들. 시트 공통 문장 뒤에 붙인다. **뒤에 숨은 그림을 가릴 만큼 통통하고 큼직하게.**

```
1 big round gray beach rock
2 sandcastle with three small towers and a little red flag
3 red toy sand bucket with a blue handle
4 big pink scallop seashell
5 clump of green seaweed
6 brown log lying on its side
7 round leafy green bush
8 tree stump with rings on top
9 big red mushroom with white dots
10 patch of colorful flowers
11 mossy rock with green moss on top
12 small orange camping tent
13 round golden hay bale
14 fluffy white cloud
15 leave this cell completely empty pure white
16 leave this cell completely empty pure white
```


## 첫소리 배 그림 (2026-11-12)

### ① 배경 낱장 → `bg_sea.png` (가로 16:9, 가장 큰 크기로 한 장)

```
Wide 16:9 background scenery for a toddler's game, same hand-drawn children's picture-book style as the attached characters: soft colored-pencil and crayon texture, thin dark brown ink lines, warm pastel colors, gentle paper grain.
Scene: a calm sunny seaside seen from the beach. Top 30%: light blue sky with two or three soft clouds and a small round sun in the upper left. Middle band (from 30% to 62% of the height): wide calm turquoise sea with gentle rolling waves, small white foam lines and a tiny island with one palm tree far away on the right horizon. Bottom 38%: smooth warm sand beach with a soft wet-sand edge and a few tiny shells.
Keep the middle of the sea and the sand open and simple (a boat and characters will be placed on top). No boats, no people, no animals, no characters, no text, no letters.
```

### ② 배 부품 시트 → `sheet5.png` (2×2, 흰 배경)

```
Draw one square image split into a 2x2 grid of 4 separate cute illustrations on a plain pure white background, with clear white space between the cells, one subject per cell, centered, nothing touching the cell edges, no grid lines, no text, no letters, no numbers.
Art style for every cell (match the attached characters if provided): hand-drawn children's picture-book illustration, soft colored-pencil and crayon texture, thin dark brown ink outline, warm pastel colors, chubby rounded toy-like shapes.
Cells in reading order (top-left, top-right, bottom-left, bottom-right):
1 a cute wooden toy sailboat hull only, exact side view facing right, wide and low, red-orange painted planks with a white stripe and five round yellow portholes, a wooden rail on top, flat empty deck, NO mast, NO sail, nobody on board
2 a tall wooden mast with one big curved triangular sail with red and white horizontal stripes and a small yellow flag on top, side view, the mast is a straight vertical pole at the left edge of the sail, nothing else
3 a red and white striped life ring buoy
4 a cute round white seagull flying with wings spread, friendly face
```

받은 그림은 저장소 `art/sheets/` 에 `bg_sea.png`, `sheet5.png` 로 올리면 Claude가 잘라서 연결한다.

## 시트 6 — 새 공룡 8 + 새 고래 8 (`sheet6.png`, 2026-11-12)

시트 공통 문장(위) 뒤에 붙인다. 참고 그림으로 `sheet3.png` 를 함께 붙이면 화풍이 맞는다.

```
Every animal is a cute chubby BABY version, full body, side view facing right unless noted, smiling, no sharp teeth, no claws showing. Make each species easy to tell apart by its key feature.
1 baby Pachycephalosaurus on two legs, big smooth dome head with little bumps around it, light brown with tan belly
2 baby Parasaurolophus on four legs, long curved tube crest sweeping back from its head, green with yellow stripes
3 baby Velociraptor on two legs, small and slim, soft feathers on arms and tail, orange-red with cream belly, playful
4 baby Diplodocus, very long neck stretched forward and very long whip tail, low body, gray-blue
5 baby Iguanodon standing on two legs, thumb spike shaped like a small rounded cone, olive green
6 baby Allosaurus on two legs, two small rounded bumps above the eyes, tan with brown stripes, gentle smile
7 baby Mosasaurus swimming in a small splash, long body, four paddle flippers, tail fin, blue-green, no water background
8 baby Plesiosaurus swimming, long thin neck, small head, round body, four big paddle flippers, teal, no water background
9 minke whale, small sleek dark gray whale with a white band on each flipper, pointed snout
10 gray whale, mottled gray with white spots and little barnacle patches, no dorsal fin, gentle bumps on its back
11 bowhead whale, round black body, big curved smiling mouth with a white chin, no dorsal fin
12 fin whale, very long slim gray body, white underside and white right jaw, small dorsal fin far back
13 Korean finless porpoise, small smooth light gray porpoise with a round head and a natural smile, NO dorsal fin
14 long-finned pilot whale, black with a big round bulging forehead, long thin flippers
15 pink Amazon river dolphin, pink body, long thin beak, round forehead
16 Indo-Pacific bottlenose dolphin jumping out of a small splash, gray with light speckled belly
```

칸 순서 → 파일: d_파키케팔로사우루스 · d_파라사우롤로푸스 · d_벨로키랍토르 · d_디플로도쿠스 · d_이구아노돈 · d_알로사우루스 · d_모사사우루스 · d_플레시오사우루스 · h_밍크고래 · h_귀신고래 · h_북극고래 · h_참고래 · h_상괭이 · h_들쇠고래 · h_분홍돌고래 · h_남방큰돌고래

### 시트 6·7 화풍 맞추기 (첫 시도는 크레용 질감이 너무 거칠고 점선 테두리라 탈락)

`sheet3.png` 를 참고 그림으로 꼭 붙이고, 시트 공통 문장 대신 아래 문장을 앞에 붙인다.

```
Draw a 4x4 grid sprite sheet of 16 separate cute illustrations, square image, plain pure white background, equal-size cells with clear white space between cells, one subject per cell, centered, nothing touching the cell edges, no grid lines, no text, no letters, no numbers, no labels.
Match the attached reference sheet's style exactly: clean cute sticker-like children's book illustration, smooth solid continuous dark brown outline of even thickness (NOT dashed, NOT dotted, NOT stitched), smooth soft pastel color fills with only light gentle colored-pencil shading, almost no grain or crayon texture, simple shapes, big shiny black eyes with a white highlight, pink rosy cheeks, small happy smile, chubby rounded baby proportions, friendly for a 3-year-old, no sharp teeth, no claws, no splash or water unless written.
Cells in reading order (left to right, top to bottom):
```

## 시트 7 — 공룡 8 + 고래 8 더 (`sheet7.png`)

```
1 baby Carnotaurus on two legs, two short rounded horns above the eyes, tiny arms, red-brown with light belly
2 baby Dilophosaurus on two legs, two thin rounded crests on top of its head, yellow-green with dark stripes
3 baby Gallimimus running on two long legs, small head, long neck, slim like an ostrich, sandy beige
4 baby Maiasaura on four legs, small bump crest above the eyes, duck-like snout, soft green, motherly gentle face
5 baby Psittacosaurus on two legs, parrot-like round beak, a few soft quills on its tail, light orange
6 baby Quetzalcoatlus flying, very big wings spread, long beak, tall head crest, light blue and white
7 baby Amargasaurus on four legs, two rows of soft rounded spines along its neck, long neck and tail, light purple
8 baby Therizinosaurus sitting, fluffy soft feathers, round tummy, long but blunt rounded claws, cream and light brown
9 short-beaked common dolphin, side view, yellow and gray hourglass pattern on its side, dark back
10 Pacific white-sided dolphin, side view, black back, white belly, light gray stripes on its sides, curved dark fin
11 Risso's dolphin, side view, light gray with soft white scratch lines, round blunt head, no beak, tall fin
12 harbour porpoise, small round dark gray porpoise, small triangle fin, short snout
13 vaquita, tiny round gray porpoise with dark rings around the eyes like a panda and dark lips
14 pygmy sperm whale, small round gray whale with a short square head and a small mouth underneath
15 Cuvier's beaked whale, side view, long smooth tan-gray body, short beak, small fin far back
16 North Pacific right whale, side view, round black body, big curved mouth, white rough bumps on its head, no dorsal fin
```

칸 순서 → 파일: d_카르노타우루스 · d_딜로포사우루스 · d_갈리미무스 · d_마이아사우라 · d_프시타코사우루스 · d_케찰코아틀루스 · d_아마르가사우루스 · d_테리지노사우루스 · h_참돌고래 · h_낫돌고래 · h_고추돌고래 · h_쇠돌고래 · h_바키타 · h_꼬마향유고래 · h_민부리고래 · h_북방긴수염고래

## 글자 정원·글자 목욕 그림 (2026-11-12) — 시트 2장 + 배경 시트 1장

캐릭터 시트는 위 '시트 6·7 화풍 맞추기' 문장을 앞에 붙이고 `sheet3.png` 를 참고 그림으로 붙인다. 배경은 '배경 공통 문장'을 앞에 붙이고 `bg_sea.png` 를 참고로 붙인다.

### 시트 8 — 글자 정원 (`sheet8.png`)
```
1 a small round mound of soft brown garden soil, front view
2 a tiny green sprout with two round leaves coming out of a little soil mound
3 a small green plant with four leaves on a soil mound
4 a closed pink flower bud on a green stem with two leaves
5 a red tulip with green leaves
6 an orange carrot with green leafy top, just pulled out
7 a big yellow sunflower with green leaves and a smiling brown center
8 a red strawberry with green leaves and tiny seeds
9 a round orange pumpkin with a curly green stem
10 a cream dinosaur egg with green spots, cracked on top, a tiny green baby dinosaur head peeking out, smiling
11 an empty woven wicker harvest basket with a handle
12 a small fluffy gray-blue rain cloud with a few blue raindrops below
13 a small green watering can, side view
14 a cute round bumblebee flying, yellow and black stripes, small wings
15 leave this cell completely empty pure white
16 leave this cell completely empty pure white
```

### 시트 9 — 글자 목욕 (`sheet9.png`)
```
1 a cute white bathtub with short golden feet, front view, empty, rounded rim
2 a yellow rubber duck with orange beak, side view facing left
3 a silver shower head on a curved pipe, side view, a few water drops
4 a pink bar of soap with a few bubbles
5 a yellow bath sponge
6 a fluffy cluster of white soap foam bubbles
7 a flat round splat of brown mud
8 a flat colorful splat of paint, blue and pink
9 a small flat pile of green and orange autumn leaves
10 a flat patch of beach sand with a tiny shell
11 a small toy sailboat for the bath, blue and red
12 a folded soft striped towel, blue and white
13 leave this cell completely empty pure white
14 leave this cell completely empty pure white
15 leave this cell completely empty pure white
16 leave this cell completely empty pure white
```

### 배경 시트 C (`bgsheet3.png`)
```
1 cozy bright bathroom, light blue square tiles on the wall, a small round window with sky, white tiled floor along the bottom, empty
2 sunny backyard garden, white wooden fence in the back, blue sky with soft clouds, a wide flat strip of brown soil garden bed across the lower third, empty
3 wide open sky with soft white clouds above a gentle green meadow along the very bottom, lots of empty sky space
4 leave this panel completely empty pure white
```

칸 → 파일: 시트 8 `o_soil o_sprout o_leaves o_bud w_튤립 w_당근 w_해바라기 w_딸기 w_호박 o_dinoegg o_basket o_raincloud o_can w_벌` · 시트 9 `o_tub o_duck o_shower o_soap o_sponge o_foam o_mud o_paint o_leafpile o_sand o_toyboat o_towel` · 배경 C `bg_bath bg_garden bg_sky(내 이름 방울)`

## 시트 10 — 티노·코코 동작 (`sheet10.png`, 2026-11-12)

`assets/tino_jump_v2.png`·`assets/coco_laugh_v2.png` 를 **꼭** 참고 그림으로 붙인다 (캐릭터가 똑같아야 함).

```
Draw a 4x4 grid character pose sheet of 16 separate full-body illustrations, square image, plain pure white background, equal-size cells with clear white space between cells, one character per cell, centered, nothing touching the cell edges, no grid lines, no text, no letters, no numbers.
The two characters must look EXACTLY like the attached reference characters (same face, colors, proportions, clothes, line style): the yellow baby dinosaur "Tino" with white t-shirt with a small green dinosaur print and blue shorts, and the black-and-white baby orca "Coco" with a light blue t-shirt with a white wave print and blue shorts. Tino has orange back spikes and a yellow tail (the tail is yellow, not white). Same clean cute sticker-like children's book style, smooth solid dark brown outline, soft colors, big shiny eyes, rosy cheeks.
Cells in reading order (left to right, top to bottom):
1 Tino clapping hands happily, eyes closed smiling
2 Tino cheering with both arms up high, mouth open
3 Tino pointing to the right with one arm, excited face
4 Tino surprised, round mouth, hands on cheeks
5 Tino sitting and splashing water with both hands, small water drops around
6 Tino sniffing a small pink flower held in one hand, eyes closed
7 Tino giving a thumbs up and winking
8 Tino sleeping curled up sitting, eyes closed, peaceful
9 Coco clapping hands happily, eyes closed smiling
10 Coco cheering with both arms up high, mouth open
11 Coco pointing to the right with one arm, excited face
12 Coco surprised, round mouth, hands on cheeks
13 Coco sitting and splashing water with both hands, small water drops around
14 Coco sniffing a small pink flower held in one hand, eyes closed
15 Coco giving a thumbs up and winking
16 Coco sleeping curled up sitting, eyes closed, peaceful
```

## 시트 11 — 놀이 부품 (`sheet11.png`)

`sheet3.png` 를 참고 그림으로 붙이고 '시트 6·7 화풍 맞추기' 문장을 앞에 붙인다.

```
1 a shiny red balloon with a curly string, blank, no face
2 a shiny yellow balloon with a curly string, blank, no face
3 a shiny blue balloon with a curly string, blank, no face
4 a shiny green balloon with a curly string, blank, no face
5 a blank square light wooden letter tile with rounded corners, front view, nothing written
6 a blank cream paper name tag, wide rounded rectangle with a thin golden border, nothing written
7 one dinosaur footprint pressed into sand, three round chubby toes, top view
8 a toy xylophone with six rainbow colored bars from long to short, front view, blank bars
9 a red toy drum with two drumsticks
10 a shiny golden toy trumpet, side view
11 a wooden tambourine with small silver jingles
12 a shiny plain golden star with soft glow, no face
13 a small triangle flag on a thin stick, blank, no text, red
14 a finish line arch with a checkered banner, blank, no text
15 a cute colorful music note
16 a puffy pink heart
```

칸 → 파일: 시트 10 `o_tino_clap cheer point wow splash sniff thumb sleep`, `o_coco_…` 같은 순서 · 시트 11 `o_balloon_r/y/b/g o_tile o_tag o_foot o_xylo o_drum o_horn o_tamb o_star o_flag o_finish o_note o_heart`
