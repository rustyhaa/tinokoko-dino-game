#!/usr/bin/env python3
"""티노코코 미니게임 폴더 조립기.

각 게임 폴더(<name>/game.js 는 직접 작성)에 아래를 만들어 넣는다.
  index.html            공통 틀 (제목·색·홈 화면 앱 링크 + tk.js + game.js)
  tk.js                 common/tk.js 복사본 (폴더 하나만 옮겨도 동작하게)
  assets/*.png          저장소 assets/ 의 *_v2 스프라이트 5장을 원본 그대로 복사
  manifest.webmanifest  홈 화면 앱 정보
  sw.js                 오프라인 캐시
  icons/icon-192.png, icon-512.png   코드로 그린 앱 아이콘

사용: python3 common/build_games.py   (저장소 루트에서)
"""
import json, math, os, shutil
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = ['tino_run_v2', 'tino_jump_v2', 'coco_run_v2', 'coco_jump_v2', 'coco_laugh_v2']
GAMES = {
    'bath':   ('티노코코 목욕탕',     '목욕탕',     '#d8f1ff'),
    'boat':   ('티노코코 배 태우기',  '배 태우기',  '#9fdcff'),
    'shapes': ('티노코코 그림자 짝꿍', '그림자 짝꿍', '#fff3d6'),
    'stars':  ('티노코코 별자리 잇기', '별자리 잇기', '#1c2656'),
    'garden': ('티노코코 꼬마 정원',  '꼬마 정원',  '#bfe9ff'),
    'band':   ('티노코코 쿵짝 악단',  '쿵짝 악단',  '#5a2a6e'),
    'blow':   ('티노코코 비눗방울 후', '비눗방울 후', '#a8e0ff'),
}
VERSION = 'v1'

HTML = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>{title}</title>
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="{color}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="{short}">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<style>
  html,body{{margin:0;height:100%;overflow:hidden;background:{color};touch-action:none;
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}}
  canvas{{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none}}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script src="tk.js"></script>
<script src="game.js"></script>
</body>
</html>
"""

SW = """// {short} 오프라인 캐시: 한 번 열면 인터넷 없이도 실행. 파일을 바꾸면 VERSION 을 올릴 것.
const VERSION = '{name}-{version}';
const CORE = {core};
self.addEventListener('install', e => {{ e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
}});
self.addEventListener('fetch', e => {{
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, {{ ignoreSearch: true }}).then(hit => hit || fetch(e.request)));
}});
"""


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def icon(name, color, n):
    S = 4; W = n * S
    im = Image.new('RGB', (W, W), hexrgb(color)); d = ImageDraw.Draw(im)
    c = lambda x, y, r, f, o=None, w=0: d.ellipse([x - r, y - r, x + r, y + r], fill=f, outline=o, width=w)
    if name == 'bath':
        d.rectangle([0, W * .7, W, W], fill=(191, 224, 242))
        for k in range(6): c(W * (.22 + k * .11), W * .5, W * .07, (255, 255, 255))
        d.rounded_rectangle([W * .12, W * .52, W * .88, W * .8], radius=W * .1, fill=(255, 255, 255), outline=(200, 225, 240), width=int(W * .01))
        c(W * .72, W * .42, W * .09, (255, 216, 74)); c(W * .62, W * .33, W * .06, (255, 216, 74))
        d.polygon([(W * .56, W * .33), (W * .5, W * .35), (W * .56, W * .37)], fill=(255, 154, 60))
    elif name == 'boat':
        d.rectangle([0, W * .62, W, W], fill=(63, 176, 232))
        d.polygon([(W * .15, W * .55), (W * .85, W * .55), (W * .72, W * .75), (W * .28, W * .75)], fill=(233, 100, 80))
        d.rectangle([W * .48, W * .2, W * .52, W * .55], fill=(140, 90, 60))
        d.polygon([(W * .52, W * .22), (W * .52, W * .5), (W * .78, W * .5)], fill=(255, 255, 255))
    elif name == 'shapes':
        c(W * .32, W * .35, W * .14, (255, 90, 95)); d.rectangle([W * .3, W * .16, W * .34, W * .23], fill=(120, 80, 40))
        pts = [(W * .7 + math.cos(-math.pi / 2 + i * math.pi / 5) * (W * .15 if i % 2 == 0 else W * .065), W * .35 + math.sin(-math.pi / 2 + i * math.pi / 5) * (W * .15 if i % 2 == 0 else W * .065)) for i in range(10)]
        d.polygon(pts, fill=(255, 214, 50))
        c(W * .5, W * .72, W * .15, (60, 50, 60))
    elif name == 'stars':
        P = [(.2, .3), (.38, .22), (.55, .35), (.75, .28), (.68, .55), (.42, .62)]
        d.line([(x * W, y * W) for x, y in P] + [(P[0][0] * W, P[0][1] * W)], fill=(255, 240, 160), width=int(W * .015))
        for x, y in P: c(x * W, y * W, W * .035, (255, 250, 200))
        d.rectangle([0, W * .8, W, W], fill=(47, 93, 90))
    elif name == 'garden':
        d.rectangle([0, W * .65, W, W], fill=(140, 96, 60))
        d.rectangle([W * .48, W * .4, W * .52, W * .66], fill=(80, 170, 85))
        for k in range(6): a = k * math.pi / 3; c(W * .5 + math.cos(a) * W * .1, W * .34 + math.sin(a) * W * .1, W * .08, (255, 120, 160))
        c(W * .5, W * .34, W * .07, (255, 220, 80))
    elif name == 'band':
        d.ellipse([W * .2, W * .35, W * .8, W * .55], fill=(255, 230, 200))
        d.rectangle([W * .2, W * .45, W * .8, W * .78], fill=(233, 80, 80))
        d.ellipse([W * .2, W * .68, W * .8, W * .88], fill=(200, 60, 60))
        d.ellipse([W * .2, W * .35, W * .8, W * .55], fill=(255, 240, 215), outline=(200, 180, 150), width=int(W * .01))
    elif name == 'blow':
        c(W * .58, W * .42, W * .25, (190, 230, 255), (255, 255, 255), int(W * .02))
        c(W * .5, W * .34, W * .06, (255, 255, 255))
        d.line([(W * .2, W * .85), (W * .38, W * .62)], fill=(255, 160, 80), width=int(W * .04))
        c(W * .4, W * .6, W * .07, None, (255, 160, 80), int(W * .025))
    return im.resize((n, n), Image.LANCZOS)


def build(name):
    title, short, color = GAMES[name]
    out = os.path.join(ROOT, name)
    assert os.path.exists(os.path.join(out, 'game.js')), name + '/game.js 가 없습니다'
    os.makedirs(os.path.join(out, 'assets'), exist_ok=True)
    os.makedirs(os.path.join(out, 'icons'), exist_ok=True)
    shutil.copyfile(os.path.join(ROOT, 'common', 'tk.js'), os.path.join(out, 'tk.js'))
    for s in SPRITES:
        shutil.copy2(os.path.join(ROOT, 'assets', s + '.png'), os.path.join(out, 'assets', s + '.png'))
    with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(HTML.format(title=title, short=short, color=color))
    man = {'name': title, 'short_name': short, 'lang': 'ko', 'start_url': './index.html', 'scope': './', 'display': 'fullscreen',
           'orientation': 'any', 'background_color': color, 'theme_color': color,
           'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                     {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                     {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}
    with open(os.path.join(out, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=2)
    core = ['./', './index.html', './manifest.webmanifest', './tk.js', './game.js', './icons/icon-192.png', './icons/icon-512.png'] + ['./assets/%s.png' % s for s in SPRITES]
    with open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(SW.format(short=short, name=name, version=VERSION, core=json.dumps(core)))
    for n in (192, 512):
        icon(name, color, n).save(os.path.join(out, 'icons', 'icon-%d.png' % n))
    print('built', name)


if __name__ == '__main__':
    import sys
    for g in (sys.argv[1:] or [g for g in GAMES if os.path.exists(os.path.join(ROOT, g, 'game.js'))]):
        build(g)
