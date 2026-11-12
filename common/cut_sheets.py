#!/usr/bin/env python3
"""격자 시트 자르기 (저장소 루트에서: python3 common/cut_sheets.py)

art/sheets/ 의 시트를 칸별로 잘라 art/cut/ 에 저장한다. 원본 시트는 건드리지 않는다.
  sheet1~3.png   4x4 캐릭터 시트 → 흰 배경을 투명으로, 여백 없이 긴 변 최대 320px PNG (art/cut/w_나비.png …)
  bgsheet1~2.png 2x2 배경 시트   → 흰 테두리 잘라냄, 원래 크기 (art/cut/bg_stars.png …). 게임이 화면 비율에 맞게 잘라 그림
칸 나누기: 흰 틈(가로·세로로 거의 흰 줄)을 찾아 나누고, 개수가 안 맞으면 똑같이 나눔(경고 출력).
확인용으로 art/cut/_contact.png (자른 결과 한눈에) 를 만든다.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, 'art', 'sheets'), os.path.join(ROOT, 'art', 'cut')

SHEETS = {   # 파일 → (행, 열, 칸 이름들 / None 은 버림)
    'sheet1.png': (4, 4, ['w_엄마', 'w_아빠', 'w_나비', 'w_토끼', 'w_개구리', 'w_해파리', 'w_게', 'w_오리',
                          'w_하마', 'w_고래', 'w_사자', 'w_거미', 'w_공룡', 'f_물고기', 'f_불가사리', 'f_병아리']),
    'sheet2.png': (4, 4, ['w_사과', 'w_바나나', 'w_포도', 'w_우유', 'w_토마토', 'w_오이', 'w_피자', 'w_치즈',
                          'w_도토리', 'w_모자', 'w_바지', 'w_나무', 'w_해', 'w_기차', 'w_라디오', 'w_지구']),
    'sheet3.png': (4, 4, ['d_티라노사우루스', 'd_트리케라톱스', 'd_스테고사우루스', 'd_브라키오사우루스', 'd_안킬로사우루스', 'd_스피노사우루스', 'd_프테라노돈', 'f_부엉이',
                          'h_혹등고래', 'h_대왕고래', 'h_범고래', 'h_향유고래', 'h_돌고래', 'h_벨루가', 'h_일각고래', 'f_별']),
    'sheet4.png': (4, 4, ['o_rock', 'o_castle', 'o_bucket', 'o_shell', 'o_weed', 'o_log', 'o_bush', 'o_stump',
                          'o_mushroom', 'o_flowers', 'o_mossrock', 'o_tent', 'o_hay', 'o_cloud', None, None]),
    'sheet5.png': (2, 2, ['o_boat_hull', 'o_boat_sail', 'o_lifebuoy', 'o_gull']),   # 첫소리 배 부품
    'sheet6.png': (4, 4, ['d_파키케팔로사우루스', 'd_파라사우롤로푸스', 'd_벨로키랍토르', 'd_디플로도쿠스', 'd_이구아노돈', 'd_알로사우루스', 'd_모사사우루스', 'd_플레시오사우루스',
                          'h_밍크고래', 'h_귀신고래', 'h_북극고래', 'h_참고래', 'h_상괭이', 'h_들쇠고래', 'h_분홍돌고래', 'h_남방큰돌고래']),
    'sheet7.png': (4, 4, ['d_카르노타우루스', 'd_딜로포사우루스', 'd_갈리미무스', 'd_마이아사우라', 'd_프시타코사우루스', 'd_케찰코아틀루스', 'd_아마르가사우루스', 'd_테리지노사우루스',
                          'h_참돌고래', 'h_낫돌고래', 'h_고추돌고래', 'h_쇠돌고래', 'h_바키타', 'h_꼬마향유고래', 'h_민부리고래', 'h_북방긴수염고래']),
    'sheet8.png': (4, 4, ['o_soil', 'o_sprout', 'o_leaves', 'o_bud', 'w_튤립', 'w_당근', 'w_해바라기', 'w_딸기',
                          'w_호박', 'o_dinoegg', 'o_basket', 'o_raincloud', 'o_can', 'w_벌', None, None]),   # 글자 정원
    'sheet9.png': (4, 4, ['o_tub', 'o_duck', 'o_shower', 'o_soap', 'o_sponge', 'o_foam', 'o_mud', 'o_paint',
                          'o_leafpile', 'o_sand', 'o_toyboat', 'o_towel', None, None, None, None]),   # 글자 목욕
    'sheet10.png': (4, 4, ['o_tino_clap', 'o_tino_cheer', 'o_tino_point', 'o_tino_wow', 'o_tino_splash', 'o_tino_sniff', 'o_tino_thumb', 'o_tino_sleep',
                           'o_coco_clap', 'o_coco_cheer', 'o_coco_point', 'o_coco_wow', 'o_coco_splash', 'o_coco_sniff', 'o_coco_thumb', 'o_coco_sleep']),   # 티노·코코 동작
    'sheet11.png': (4, 4, ['o_balloon_r', 'o_balloon_y', 'o_balloon_b', 'o_balloon_g', 'o_tile', 'o_tag', 'o_foot', 'o_xylo',
                           'o_drum', 'o_horn', 'o_tamb', 'o_star', 'o_flag', 'o_finish', 'o_note', 'o_heart']),   # 놀이 부품
    'bgsheet1.png': (2, 2, ['bg_stars', 'bg_steps', 'bg_band', 'bg_shapes']),
    'bgsheet2.png': (2, 2, ['bg_pk_beach', 'bg_pk_forest', 'bg_pk_night', None]),
    'bgsheet3.png': (2, 2, ['bg_bath', 'bg_garden', 'bg_sky', None]),
}
WHITE = 236   # 이보다 밝으면(세 채널 모두) 흰색으로 봄


def bands(ink, n, axis):
    """ink: 2D bool. axis=0 이면 행 방향 띠. 흰 틈으로 나눈 띠 n개 (start,end) 또는 None."""
    prof = ink.mean(axis=1 - axis)
    on = prof > 0.004
    runs, i, L = [], 0, len(on)
    while i < L:
        if on[i]:
            j = i
            while j < L and on[j]: j += 1
            runs.append([i, j]); i = j
        else: i += 1
    # 아주 가는 틈(칸 안의 여백)은 이어 붙임: 가장 넓은 틈 n-1개만 경계로
    while len(runs) > n:
        gaps = [runs[k + 1][0] - runs[k][1] for k in range(len(runs) - 1)]
        k = int(np.argmin(gaps)); runs[k][1] = runs[k + 1][1]; del runs[k + 1]
    return [tuple(r) for r in runs] if len(runs) == n else None


def equal(L, n): return [(round(L * k / n), round(L * (k + 1) / n)) for k in range(n)]


def cells(im, rows, cols, name):
    a = np.asarray(im.convert('RGB')); ink = (a < WHITE).any(axis=2)
    rb = bands(ink, rows, 0)
    if not rb: print(f'  ! {name}: 행 틈을 못 찾아 똑같이 나눔'); rb = equal(a.shape[0], rows)
    out = []
    for (y0, y1) in rb:
        cb = bands(ink[y0:y1], cols, 1)
        fb = not cb
        if fb: print(f'  ! {name}: 열 틈을 못 찾아 똑같이 나눔 → 덩어리별로 칸 배정 (행 {y0})'); cb = equal(a.shape[1], cols)
        out += [(x0, y0, x1, y1, fb) for (x0, x1) in cb]
    return out


def cutout(cell):
    """흰 배경 → 투명: 가장자리에서 이어진 흰 영역만 지움 (눈 흰자 등 안쪽 흰색은 남김)."""
    rgb = cell.convert('RGB'); a = np.asarray(rgb)
    white = ((a >= WHITE).all(axis=2) * 255).astype(np.uint8)
    m = Image.fromarray(np.pad(white, 1, constant_values=255), 'L').copy()   # copy: numpy 공유 버퍼면 floodfill 이 안 먹음
    ImageDraw.floodfill(m, (0, 0), 128)
    bg = (np.asarray(m)[1:-1, 1:-1] == 128)
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.8))
    out = rgb.convert('RGBA'); out.putalpha(alpha)
    box = out.getbbox()
    return out.crop(box) if box else out


# 테두리로 둘러싸인 흰 구멍을 지울 그림: 이름 → 씨앗 점(비율). 그 점에서 이어진 흰 부분만 투명
HOLES = {
    'o_boat_hull': [(x / 40, 0.2) for x in range(2, 39)],   # 난간 기둥 사이
    'o_lifebuoy': [(0.5, 0.5)],                              # 가운데 구멍
    'o_basket': [(0.5, 0.2), (0.4, 0.15), (0.6, 0.15)],     # 손잡이 안쪽
}
def clear_holes(im, seeds):
    a = np.asarray(im).copy(); h, w = a.shape[:2]
    white = ((a[..., :3] >= WHITE).all(axis=2)) & (a[..., 3] > 0)
    m = Image.fromarray((white * 255).astype(np.uint8), 'L').copy()
    for fx, fy in seeds:
        x, y = int(fx * (w - 1)), int(fy * (h - 1))
        if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    hole = np.asarray(m) == 128
    a[hole, 3] = 0
    return Image.fromarray(a, 'RGBA')


def own_blobs(im, x0, y0, x1, y1):
    """칸을 좌우로 25% 넓혀 자른 뒤, 잉크 덩어리 중 무게중심이 원래 칸 안에 있는 것만 남기고 나머지는 흰색으로."""
    m = round((x1 - x0) * 0.25); X0, X1 = max(0, x0 - m), min(im.width, x1 + m)
    c = im.crop((X0, y0, X1, y1)).convert('RGB'); a = np.asarray(c).copy()
    k = 4   # 1/4 크기에서 덩어리 찾기 (크레용 점 같은 작은 조각이 많아도 빠르게)
    ink = Image.fromarray(((a < WHITE).any(axis=2) * 255).astype(np.uint8), 'L').filter(ImageFilter.MaxFilter(5))
    sm = ink.resize((max(1, ink.width // k), max(1, ink.height // k)), Image.BOX).point(lambda v: 255 if v > 20 else 0)
    lab = np.asarray(sm).copy(); keep = np.zeros(lab.shape, bool)
    while True:
        ys, xs = np.where(lab == 255)
        if not len(xs): break
        t = Image.fromarray(lab, 'L').copy(); ImageDraw.floodfill(t, (int(xs[0]), int(ys[0])), 100)
        lab = np.asarray(t).copy(); comp = lab == 100; lab[comp] = 0
        cy, cx = np.where(comp)
        if x0 - X0 <= cx.mean() * k + k / 2 < x1 - X0: keep |= comp
    keep = np.asarray(Image.fromarray(keep.astype(np.uint8) * 255, 'L').resize(ink.size, Image.NEAREST)) > 0
    a[~keep] = 255
    return Image.fromarray(a, 'RGB')


def fit(im, size, pad=0.06):
    s = size * (1 - 2 * pad) / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im); return canvas


def trim_white(im):
    a = np.asarray(im.convert('RGB')); ink = (a < WHITE).any(axis=2)
    ys, xs = np.where(ink)
    if not len(xs): return im
    return im.crop((xs.min() + 2, ys.min() + 2, xs.max() - 1, ys.max() - 1))   # 테두리 1~2px 안쪽으로


def main():
    global SRC, OUT
    if len(sys.argv) > 2: SRC, OUT = sys.argv[1], sys.argv[2]   # 시험용: 다른 폴더
    os.makedirs(OUT, exist_ok=True)
    made = []
    for fn, (rows, cols, names) in SHEETS.items():
        p = os.path.join(SRC, fn)
        if not os.path.exists(p): print('없음:', fn); continue
        im = Image.open(p); print(f'{fn} {im.size[0]}x{im.size[1]} → {rows}x{cols}')
        for (x0, y0, x1, y1, fb), nm in zip(cells(im, rows, cols, fn), names):
            if not nm: continue
            if fb and not fn.startswith('bg'):   # 이웃 그림과 세로로 겹침: 넓게 잘라 몸통이 이 칸에 있는 덩어리만 남김
                c = own_blobs(im, x0, y0, x1, y1)
            else: c = im.crop((x0, y0, x1, y1))
            if fn.startswith('bg'):
                c = trim_white(c).convert('RGB')   # 원래 크기 그대로 (게임이 화면에 꽉 차게 잘라 그림)
                c.save(os.path.join(OUT, nm + '.png')); made.append((nm, c))
                if c.width < 1000: print(f'  ! {nm}: 칸 {c.width}x{c.height}px — 큰 화면에선 흐릴 수 있음')
            else:
                o = cutout(c)
                if nm in HOLES: o = clear_holes(o, HOLES[nm])
                k = 320 / max(o.size)   # 여백 없이 그림에 딱 맞게 (게임이 밑변에 세움)
                if k < 1: o = o.resize((round(o.width * k), round(o.height * k)), Image.LANCZOS)
                o.save(os.path.join(OUT, nm + '.png')); made.append((nm, o))
    for fn in sorted(os.listdir(SRC)) if os.path.isdir(SRC) else []:   # 낱장 배경 (bg_sea.png 처럼 이름이 bg_ 로 시작): 흰 테두리만 잘라 그대로
        if fn.startswith('bg_') and fn.endswith('.png'):
            c = trim_white(Image.open(os.path.join(SRC, fn))).convert('RGB'); c.save(os.path.join(OUT, fn)); made.append((fn[:-4], c)); print('낱장 배경', fn, c.size)
    if made:   # 한눈에 보기
        t = 160; cols = 8; rows = (len(made) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * t, rows * t), (200, 210, 225))
        for i, (nm, o) in enumerate(made):
            th = o.copy(); th.thumbnail((t - 8, t - 8))
            sheet.paste(th, ((i % cols) * t + 4, (i // cols) * t + 4), th if th.mode == 'RGBA' else None)
        sheet.save(os.path.join(OUT, '_contact.png'))
    print('완료:', len(made), '개 →', OUT)


if __name__ == '__main__':
    main()
