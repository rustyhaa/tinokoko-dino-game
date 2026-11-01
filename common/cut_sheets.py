#!/usr/bin/env python3
"""격자 시트 자르기 (저장소 루트에서: python3 common/cut_sheets.py)

art/sheets/ 의 시트를 칸별로 잘라 art/cut/ 에 저장한다. 원본 시트는 건드리지 않는다.
  sheet1~3.png   4x4 캐릭터 시트 → 흰 배경을 투명으로, 320x320 PNG (시트 1024px 기준 칸 원래 크기 정도) (art/cut/w_나비.png …)
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
    'bgsheet1.png': (2, 2, ['bg_stars', 'bg_steps', 'bg_band', 'bg_shapes']),
    'bgsheet2.png': (2, 2, ['bg_pk_beach', 'bg_pk_forest', 'bg_pk_night', None]),
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
        if not cb: print(f'  ! {name}: 열 틈을 못 찾아 똑같이 나눔 (행 {y0})'); cb = equal(a.shape[1], cols)
        out += [(x0, y0, x1, y1) for (x0, x1) in cb]
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
        for (x0, y0, x1, y1), nm in zip(cells(im, rows, cols, fn), names):
            if not nm: continue
            c = im.crop((x0, y0, x1, y1))
            if fn.startswith('bg'):
                c = trim_white(c).convert('RGB')   # 원래 크기 그대로 (게임이 화면에 꽉 차게 잘라 그림)
                c.save(os.path.join(OUT, nm + '.png')); made.append((nm, c))
                if c.width < 1000: print(f'  ! {nm}: 칸 {c.width}x{c.height}px — 큰 화면에선 흐릴 수 있음')
            else:
                o = fit(cutout(c), 320); o.save(os.path.join(OUT, nm + '.png')); made.append((nm, o))
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
