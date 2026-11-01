#!/usr/bin/env python3
"""배경 7장을 한 번에 생성 (OpenAI 이미지 API, 내 PC에서 실행)

준비 (한 번만)
  pip install openai
  OpenAI API 키를 환경 변수 OPENAI_API_KEY 에 넣기 (키를 이 파일에 쓰지 말 것)
    PowerShell:  $env:OPENAI_API_KEY = "sk-..."      (그 창에서만 유효)

실행 (저장소 루트에서)
  python common/gen_backgrounds.py              # 7장 전부
  python common/gen_backgrounds.py bg_steps     # 하나만 다시

결과
  art/bg/bg_stars.png ... 7장 (가로 1536x1024). 이미 있는 파일은 건너뜀 (다시 뽑으려면 지우고 실행).
  assets/tino_jump_v2.png, coco_laugh_v2.png 를 화풍 참고로 함께 보냄.
비용: 장당 수십~수백 원 수준(고품질 기준, 정확한 값은 OpenAI 요금표 확인).
"""
import base64, os, sys
from openai import OpenAI

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'art', 'bg')
REFS = [os.path.join(ROOT, 'assets', n) for n in ('tino_jump_v2.png', 'coco_laugh_v2.png')]

STYLE = (
    "Wide landscape background scenery for a toddler's Korean-letter game. "
    "Match the art style of the attached character images exactly: hand-drawn children's picture-book illustration, "
    "soft colored-pencil and crayon texture, thin dark brown ink lines, warm pastel colors, gentle paper grain. "
    "Do NOT draw the characters. No characters, no animals, no people, no text, no letters, no numbers. "
    "Keep the middle area calm, simple and low-contrast so small game objects stay readable on top. "
    "The left and right thirds continue the same scenery so the center can be cropped to a portrait screen. Scene: "
)
SCENES = {
    'bg_stars':     "calm night sky from deep navy to soft indigo, a few tiny stars, crescent moon in the upper right, gentle dark teal grassy hill along the bottom edge",
    'bg_steps':     "sunny beach, light blue sky with a few clouds, soft green hills far away, wide empty warm sand across the middle and bottom (no footprints), calm sea on the right side",
    'bg_band':      "cozy small theater stage, purple curtains on both sides, warm spotlights, wooden stage floor along the bottom, empty stage",
    'bg_shapes':    "cozy playroom seen from the front, cream wall, soft wooden table top filling the lower third, a sunny window, a few blurry toys on a far shelf",
    'bg_pk_beach':  "bright beach, sand in the lower half, calm sea and sky above, open empty space on the sand",
    'bg_pk_forest': "sunny forest meadow, soft grass in the lower half, trees far in the back",
    'bg_pk_night':  "quiet night meadow, big soft moon, dark blue sky, grass in the lower half",
}


def main():
    if not os.environ.get('OPENAI_API_KEY'):
        sys.exit('OPENAI_API_KEY 환경 변수가 없습니다.')
    os.makedirs(OUT, exist_ok=True)
    client = OpenAI()
    names = sys.argv[1:] or list(SCENES)
    for name in names:
        path = os.path.join(OUT, name + '.png')
        if os.path.exists(path):
            print('있음, 건너뜀:', path); continue
        print('생성 중:', name, flush=True)
        refs = [open(p, 'rb') for p in REFS if os.path.exists(p)]
        try:
            if refs:   # 참고 그림과 함께 (화풍 맞추기)
                r = client.images.edit(model='gpt-image-1', image=refs, prompt=STYLE + SCENES[name], size='1536x1024', quality='high')
            else:
                r = client.images.generate(model='gpt-image-1', prompt=STYLE + SCENES[name], size='1536x1024', quality='high')
        except Exception as e:
            print('  실패:', e); continue
        finally:
            for f in refs: f.close()
        with open(path, 'wb') as f:
            f.write(base64.b64decode(r.data[0].b64_json))
        print('  저장:', path)


if __name__ == '__main__':
    main()
