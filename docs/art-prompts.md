# 그림 만들기 프롬프트 (티노·코코 화풍으로 통일)

작성: 2026-11-01 · 대상: 메인 5개 게임(글자 까꿍·자음 짝꿍·글자 별자리·공룡 발자국 길·가나다 실로폰)
목표: 지금 코드로 그린 단순한 도형 그림을 티노·코코와 같은 손그림 일러스트로 바꾸기.

## 0. 만드는 법

1. ChatGPT(이미지 생성) 또는 Gemini에서 **새 대화**를 연다.
2. 저장소의 `assets/tino_jump_v2.png`, `assets/coco_laugh_v2.png` 두 장을 **먼저 첨부**한다 (화풍 참고용).
3. 아래 **1. 공통 스타일**을 한 번 붙여 넣고, 그다음부터는 목록의 한 줄씩(또는 3~4개씩) 요청한다.
4. 마음에 드는 것만 내려받아 **파일 이름을 표의 `파일` 칸대로** 바꾼다.
5. 다 모이면 대화에 첨부하거나 저장소 `art/` 폴더에 올려 주면, 크기 맞추기·배경 정리·WebP 변환·게임 연결은 Claude가 한다.

규칙
- 그림 안에 **글자·숫자·한글 절대 없음** (AI가 자주 글자를 넣음 → 들어가면 다시 생성).
- 사물 그림: **투명 배경 PNG, 정사각형 1024×1024, 사물 하나만 가운데, 잘리지 않게 여백**. 투명이 안 되는 도구면 순백 배경.
- 무섭거나 날카로운 모습 금지 (이빨·발톱은 둥글고 작게). 3살 아이용.
- 같은 대화 안에서 계속 만들면 화풍이 잘 유지된다. 화풍이 흐트러지면 1번 스타일을 다시 붙여 넣는다.

## 1. 공통 스타일 (맨 처음 한 번 붙여 넣기)

```
I attached two character images (Tino the yellow dinosaur and Coco the orca). Match their art style exactly for every image I ask for next:
hand-drawn children's picture-book illustration, soft colored-pencil and crayon texture, thin dark brown-black ink outline with slightly wobbly hand-drawn lines, warm pastel colors, gentle grain on the fills, rosy cheeks and big shiny friendly eyes on living things, chubby rounded cute proportions, simple shapes readable at small size.
Rules for every image: no text, no letters, no numbers, no watermark. Single subject, centered, full body, nothing cut off, generous empty margin. Transparent background PNG, square 1024x1024. No cast shadow on the ground. Friendly and safe for a 3-year-old: no sharp teeth, no scary expressions.
Reply only with the image.
```

## 2. 단어 그림 (29장) — 모든 게임 공통

| 파일 | 단어 | 요청 문장 |
|---|---|---|
| `w_엄마.png` | 엄마 | a smiling young mom, long brown hair, pink top, waving, upper body |
| `w_아빠.png` | 아빠 | a smiling young dad, short dark hair, round glasses, light blue shirt, waving, upper body |
| `w_나비.png` | 나비 | a cute butterfly with pink and light-blue wings, smiling face |
| `w_토끼.png` | 토끼 | a cute white bunny sitting, long ears with pink inside, smiling |
| `w_개구리.png` | 개구리 | a cute round green frog sitting, big eyes on top, wide smile |
| `w_해파리.png` | 해파리 | a cute lavender jellyfish with wavy tentacles, smiling face |
| `w_게.png` | 게 | a cute red crab with raised round claws, smiling |
| `w_오리.png` | 오리 | a cute yellow duckling standing, orange beak and feet |
| `w_하마.png` | 하마 | a cute chubby lavender-gray hippo sitting, small ears, smiling |
| `w_고래.png` | 고래 | a cute round blue whale with a light belly, small water spout, smiling |
| `w_사자.png` | 사자 | a cute lion cub sitting, fluffy orange mane, smiling |
| `w_거미.png` | 거미 | a cute round friendly spider, soft purple, eight short chubby legs, big eyes (not scary) |
| `w_공룡.png` | 공룡 | a cute green baby long-neck dinosaur standing, smiling |
| `w_사과.png` | 사과 | a shiny red apple with one green leaf |
| `w_바나나.png` | 바나나 | a bunch of three yellow bananas |
| `w_포도.png` | 포도 | a bunch of purple grapes with a green leaf |
| `w_우유.png` | 우유 | a small milk carton, white and blue, with a straw (no text on the carton) |
| `w_토마토.png` | 토마토 | a round red tomato with green leaves on top |
| `w_오이.png` | 오이 | a fresh green cucumber |
| `w_피자.png` | 피자 | a slice of pizza with cheese and round toppings |
| `w_치즈.png` | 치즈 | a wedge of yellow cheese with holes |
| `w_도토리.png` | 도토리 | a brown acorn with a cap |
| `w_모자.png` | 모자 | a child's yellow sun hat with a ribbon |
| `w_바지.png` | 바지 | a pair of child's blue jean shorts |
| `w_나무.png` | 나무 | a round green tree with a brown trunk |
| `w_해.png` | 해 | a smiling sun with soft rays |
| `w_기차.png` | 기차 | a cute toy train engine with one car, red and blue, side view |
| `w_라디오.png` | 라디오 | a retro orange radio with an antenna and round speaker (no text) |
| `w_지구.png` | 지구 | a smiling planet Earth, blue oceans and green land |

## 3. 공룡 7종 (종마다 특징이 분명하게, 모두 아기처럼 귀엽게)

| 파일 | 이름 | 요청 문장 |
|---|---|---|
| `d_티라노사우루스.png` | 티라노사우루스 | a cute baby Tyrannosaurus rex standing on two legs, big head, tiny arms, small rounded teeth in a happy smile, green-brown |
| `d_트리케라톱스.png` | 트리케라톱스 | a cute baby Triceratops on four legs, frill behind the head, three short rounded horns, orange-tan |
| `d_스테고사우루스.png` | 스테고사우루스 | a cute baby Stegosaurus on four legs, two rows of rounded back plates, short tail spikes, teal green with orange plates |
| `d_브라키오사우루스.png` | 브라키오사우루스 | a cute baby Brachiosaurus, very long neck reaching up, front legs longer than back legs, light blue-green |
| `d_안킬로사우루스.png` | 안킬로사우루스 | a cute baby Ankylosaurus, low wide armored body with round bumps, club tail, sandy brown |
| `d_스피노사우루스.png` | 스피노사우루스 | a cute baby Spinosaurus, tall rounded sail on its back, long snout, standing, soft red-orange sail |
| `d_프테라노돈.png` | 프테라노돈 | a cute baby Pteranodon flying with wings spread, crest on the head, soft purple-gray |

## 4. 고래 7종

| 파일 | 이름 | 요청 문장 |
|---|---|---|
| `h_혹등고래.png` | 혹등고래 | a cute humpback whale, very long white flippers, bumpy head, dark blue-gray, side view |
| `h_대왕고래.png` | 대왕고래 | a cute blue whale, long slender body, blue-gray with light spots, side view (looks long and big) |
| `h_범고래.png` | 범고래 | a cute orca, black back, white belly and white eye patch, tall dorsal fin, side view |
| `h_향유고래.png` | 향유고래 | a cute sperm whale, huge square head, small lower jaw, gray, side view |
| `h_돌고래.png` | 돌고래 | a cute bottlenose dolphin jumping, light gray, smiling |
| `h_벨루가.png` | 벨루가 | a cute white beluga whale, round bulging forehead, smiling, side view |
| `h_일각고래.png` | 일각고래 | a cute narwhal, spotted gray body, one long straight spiral tusk (rounded tip), side view |

## 5. 까꿍 친구 5장 (단어 그림과 겹치지 않는 것만)

| 파일 | 이름 | 요청 문장 |
|---|---|---|
| `f_물고기.png` | 물고기 | a cute round orange fish, smiling |
| `f_불가사리.png` | 불가사리 | a cute pink starfish with a smiling face |
| `f_병아리.png` | 병아리 | a cute fluffy yellow chick |
| `f_부엉이.png` | 부엉이 | a cute round brown owl with big eyes and ear tufts |
| `f_별.png` | 별 | a cute glowing yellow star with a smiling face |

## 6. 배경 (게임마다 가로 1장 + 세로 1장)

배경은 아래 문장을 **공통 스타일 대신** 붙인다 (투명 아님, 직사각형).

```
Same art style as the attached characters (hand-drawn picture-book, colored-pencil texture, warm pastel).
Background scenery only: no characters, no animals, no people, no text, no letters.
Keep the middle area calm and simple (game objects will be placed on top). Soft, low-contrast details so small objects stay readable.
Make two versions: landscape 1920x1080 and portrait 1080x1920.
```

| 파일 (가로 / 세로) | 게임 | 장면 |
|---|---|---|
| `bg_stars_l.png` / `bg_stars_p.png` | 글자 별자리 | calm night sky, deep navy to soft indigo, a few tiny stars, crescent moon in the top-right corner, gentle dark teal grassy hill along the bottom edge |
| `bg_steps_l.png` / `bg_steps_p.png` | 공룡 발자국 길 | sunny beach: light blue sky with a few clouds, soft green hills far away, wide warm sand across the middle and bottom, calm sea on the right side (landscape) / along the bottom (portrait). Leave the sand empty — no footprints |
| `bg_band_l.png` / `bg_band_p.png` | 가나다 실로폰 | a cozy small stage with purple curtains on both sides, warm spotlights, wooden stage floor along the bottom, empty stage |
| `bg_shapes_l.png` / `bg_shapes_p.png` | 자음 짝꿍 | a cozy playroom seen from the front: cream wall, soft wooden table top filling the lower third, a window with sunlight, simple toys on a far shelf (blurred, small) |
| `bg_pk_beach_l.png` / `bg_pk_beach_p.png` | 글자 까꿍 (바닷가) | bright beach with sand in the lower half, sea and sky above, open space on the sand |
| `bg_pk_forest_l.png` / `bg_pk_forest_p.png` | 글자 까꿍 (숲) | sunny forest meadow, soft grass in the lower half, trees far in the back |
| `bg_pk_night_l.png` / `bg_pk_night_p.png` | 글자 까꿍 (밤) | quiet night meadow with a big soft moon, dark blue sky, grass in the lower half |

## 7. (2차, 나중에) 까꿍 숨는 물건 14장

바위·모래성·양동이·조개·해초·통나무·덤불·그루터기·버섯·꽃밭·이끼 바위·텐트·건초더미·구름. 1~6이 자리 잡은 뒤 같은 방식으로.

## 합계

1차: 사물 48장(단어 29 + 공룡 7 + 고래 7 + 친구 5) + 배경 14장(7장면 × 가로·세로).
