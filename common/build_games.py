#!/usr/bin/env python3
"""티노코코 놀이터 조립기 (저장소 루트에서 실행: python3 common/build_games.py)

구조
  shared/tk.js, shared/frame.js   공통 엔진 / 공통 틀(집 버튼·별 시범·잘 시간·인사·모바일 보정)  ← 직접 작성
  shared/assets/*.png             저장소 assets/ 의 *_v2 스프라이트 5장을 원본 그대로 복사         ← 이 스크립트
  shared/icons/icon-*.png         놀이터 앱 아이콘 (코드로 그림)                                    ← 이 스크립트
  <게임>/game.js                  게임 규칙                                                           ← 직접 작성
  <게임>/index.html               공통 틀 HTML (tk.js + frame.js + game.js)                           ← 이 스크립트
  <게임>/icons/icon-192.png       놀이터 카드용 그림                                                  ← 이 스크립트
  rainbow-bubbles/, peekaboo/     엔진 이전에 만든 단독 게임 (index.html 직접 작성, frame.js 연결)
  <게임>/sw.js                    예전 게임별 오프라인 저장을 지우는 정리용                          ← 이 스크립트
  games/index.html                놀이터(게임 고르기·부모 도움말·잘 시간)                             ← 직접 작성
  games/manifest.webmanifest      놀이터 앱 정보 (앱은 이것 하나)                                    ← 이 스크립트
  sw.js (사이트 맨 위)            놀이터 전체 오프라인 저장                                           ← 이 스크립트
"""
import hashlib, json, math, os, shutil
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = ['tino_run_v2', 'tino_jump_v2', 'coco_run_v2', 'coco_jump_v2', 'coco_laugh_v2']
GAMES = {   # 엔진(tk.js)으로 만든 게임
    'bath':   ('티노코코 목욕탕',     '#d8f1ff'),
    'boat':   ('티노코코 배 태우기',  '#9fdcff'),
    'shapes': ('티노코코 그림자 짝꿍', '#fff3d6'),
    'stars':  ('티노코코 별자리 잇기', '#1c2656'),
    'garden': ('티노코코 꼬마 정원',  '#bfe9ff'),
    'band':   ('티노코코 쿵짝 악단',  '#5a2a6e'),
    'blow':   ('티노코코 비눗방울 후', '#a8e0ff'),
}
STANDALONE = ['rainbow-bubbles', 'peekaboo']

HTML = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>{title}</title>
<link rel="manifest" href="../games/manifest.webmanifest">
<meta name="theme-color" content="{color}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="티노코코 놀이터">
<link rel="apple-touch-icon" href="../shared/icons/icon-180.png">
<style>
  html,body{{margin:0;height:100%;overflow:hidden;background:{color};touch-action:none;
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}}
  canvas{{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none}}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script src="../shared/tk.js"></script>
<script src="game.js"></script>
<script src="../shared/frame.js"></script>
</body>
</html>
"""

KILL_SW = """// 예전 게임별 오프라인 저장을 정리하는 파일.
// 지금은 놀이터 앱 하나(사이트 맨 위 sw.js)로 합쳤다. 예전에 이 게임만 따로 설치한 기기에서
// 이 파일을 받으면 옛 저장을 지우고 스스로 물러난 뒤 화면을 새로 연다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith('playground-')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(c => c.navigate(c.url));
  })());
});
"""

ROOT_SW = """// 티노코코 놀이터 오프라인 저장 (사이트 맨 위에 하나). 한 번 열면 인터넷 없이도 모든 게임이 열린다.
// 저장된 것을 먼저 보여주고, 인터넷이 되면 뒤에서 새 파일로 바꿔 둔다 (다음에 열 때 반영).
// VERSION 과 목록은 common/build_games.py 가 만든다.
const VERSION = '{version}';
const PRECACHE = {precache};
self.addEventListener('install', e => {{
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('playground-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
}});
self.addEventListener('fetch', e => {{
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {{
    const hit = await c.match(req, {{ ignoreSearch: true }});
    const net = fetch(req).then(res => {{ if (res && res.ok && res.type === 'basic') c.put(req, res.clone()); return res; }}).catch(() => hit);
    return hit || net;
  }}));
}});
"""


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def game_icon(name, color, n):
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
        d.polygon(pts, fill=(255, 214, 50)); c(W * .5, W * .72, W * .15, (60, 50, 60))
    elif name == 'stars':
        P = [(.2, .3), (.38, .22), (.55, .35), (.75, .28), (.68, .55), (.42, .62)]
        d.line([(x * W, y * W) for x, y in P] + [(P[0][0] * W, P[0][1] * W)], fill=(255, 240, 160), width=int(W * .015))
        for x, y in P: c(x * W, y * W, W * .035, (255, 250, 200))
        d.rectangle([0, W * .8, W, W], fill=(47, 93, 90))
    elif name == 'garden':
        d.rectangle([0, W * .65, W, W], fill=(140, 96, 60)); d.rectangle([W * .48, W * .4, W * .52, W * .66], fill=(80, 170, 85))
        for k in range(6): a = k * math.pi / 3; c(W * .5 + math.cos(a) * W * .1, W * .34 + math.sin(a) * W * .1, W * .08, (255, 120, 160))
        c(W * .5, W * .34, W * .07, (255, 220, 80))
    elif name == 'band':
        d.rectangle([W * .2, W * .45, W * .8, W * .78], fill=(233, 80, 80)); d.ellipse([W * .2, W * .68, W * .8, W * .88], fill=(200, 60, 60))
        d.ellipse([W * .2, W * .35, W * .8, W * .55], fill=(255, 240, 215), outline=(200, 180, 150), width=int(W * .01))
    elif name == 'blow':
        c(W * .58, W * .42, W * .25, (190, 230, 255), (255, 255, 255), int(W * .02)); c(W * .5, W * .34, W * .06, (255, 255, 255))
        d.line([(W * .2, W * .85), (W * .38, W * .62)], fill=(255, 160, 80), width=int(W * .04)); c(W * .4, W * .6, W * .07, None, (255, 160, 80), int(W * .025))
    return im.resize((n, n), Image.LANCZOS)


def playground_icon(n):
    """놀이터 앱 아이콘: 하늘 + 무지개 + 티노(노란 머리·주황 등뼈)와 코코(검은 머리·흰 얼굴·흰 패치)."""
    S = 4; W = n * S
    im = Image.new('RGB', (W, W)); d = ImageDraw.Draw(im)
    for y in range(W):
        t = y / W; d.line([(0, y), (W, y)], fill=(int(143 + 80 * t), int(212 + 30 * t), 255))
    d.rectangle([0, W * .74, W, W], fill=(111, 191, 90))
    cols = [(255, 90, 95), (255, 159, 67), (255, 214, 50), (76, 210, 100), (58, 167, 255), (100, 100, 225), (176, 92, 240)]
    cx, cy, R = W / 2, W * .74, W * .44
    for i, col in enumerate(cols):
        r = R - i * W * .03; d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=col)
    r = R - 7 * W * .03; d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=(200, 235, 255))
    c = lambda x, y, r, f: d.ellipse([x - r, y - r, x + r, y + r], fill=f)
    tx, ty, hr = W * .32, W * .66, W * .16   # 티노
    for a in (200, 235, 270, 305):
        rad = a * math.pi / 180; c(tx + math.cos(rad) * hr, ty + math.sin(rad) * hr, W * .045, (255, 154, 46))
    c(tx, ty, hr, (250, 214, 90))
    kx, ky = W * .68, W * .66   # 코코
    d.polygon([(kx - W * .02, ky - hr * .9), (kx + W * .05, ky - hr * 1.45), (kx + W * .06, ky - hr * .85)], fill=(35, 40, 56))
    c(kx, ky, hr, (35, 40, 56)); d.pieslice([kx - hr, ky - hr, kx + hr, ky + hr], 10, 170, fill=(251, 251, 247))
    d.ellipse([kx + hr * .25, ky - hr * .7, kx + hr * .8, ky - hr * .3], fill=(251, 251, 247))
    for x, y in ((tx - W * .05, ty), (tx + W * .05, ty), (kx - W * .05, ky + W * .005), (kx + W * .05, ky + W * .005)):
        c(x, y, W * .022, (25, 20, 30)); c(x + W * .007, y - W * .008, W * .007, (255, 255, 255))
    return im.resize((n, n), Image.LANCZOS)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def build():
    os.makedirs(os.path.join(ROOT, 'shared', 'assets'), exist_ok=True)
    for s in SPRITES:
        shutil.copy2(os.path.join(ROOT, 'assets', s + '.png'), os.path.join(ROOT, 'shared', 'assets', s + '.png'))
    for n in (180, 192, 512):
        os.makedirs(os.path.join(ROOT, 'shared', 'icons'), exist_ok=True)
        playground_icon(n).save(os.path.join(ROOT, 'shared', 'icons', 'icon-%d.png' % n))
    for name, (title, color) in GAMES.items():
        out = os.path.join(ROOT, name)
        assert os.path.exists(os.path.join(out, 'game.js')), name + '/game.js 가 없습니다'
        write(os.path.join(out, 'index.html'), HTML.format(title=title, color=color))
        os.makedirs(os.path.join(out, 'icons'), exist_ok=True)
        game_icon(name, color, 192).save(os.path.join(out, 'icons', 'icon-192.png'))
        p512 = os.path.join(out, 'icons', 'icon-512.png')
        if os.path.exists(p512): os.remove(p512)
        write(os.path.join(out, 'sw.js'), KILL_SW)
    for name in STANDALONE:
        write(os.path.join(ROOT, name, 'sw.js'), KILL_SW)
        p512 = os.path.join(ROOT, name, 'icons', 'icon-512.png')
        if os.path.exists(p512): os.remove(p512)
    man = {'name': '티노코코 놀이터', 'short_name': '티노코코 놀이터', 'lang': 'ko', 'start_url': './', 'scope': '../', 'id': './',
           'display': 'fullscreen', 'display_override': ['fullscreen', 'standalone'], 'orientation': 'any',
           'background_color': '#eaf7ff', 'theme_color': '#8fd4ff',
           'icons': [{'src': '../shared/icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                     {'src': '../shared/icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                     {'src': '../shared/icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}
    write(os.path.join(ROOT, 'games', 'manifest.webmanifest'), json.dumps(man, ensure_ascii=False, indent=2) + '\n')
    # 사이트 맨 위 sw.js: 놀이터에 필요한 파일 전부
    files = ['index.html', 'games/', 'games/index.html', 'games/manifest.webmanifest', 'shared/tk.js', 'shared/frame.js']
    files += sorted('assets/' + f for f in os.listdir(os.path.join(ROOT, 'assets')) if f.endswith('.png'))   # 러너 그림
    files += ['shared/assets/%s.png' % s for s in SPRITES] + ['shared/icons/icon-%d.png' % n for n in (180, 192, 512)]
    for name in list(GAMES) + STANDALONE:
        files += [name + '/', name + '/index.html', name + '/icons/icon-192.png']
        if name in GAMES: files.append(name + '/game.js')
    h = hashlib.md5()
    for f in files:
        p = os.path.join(ROOT, f, 'index.html') if f.endswith('/') else os.path.join(ROOT, f)
        with open(p, 'rb') as fh: h.update(fh.read())
    version = 'playground-' + h.hexdigest()[:10]
    write(os.path.join(ROOT, 'sw.js'), ROOT_SW.format(version=version, precache=json.dumps(['./'] + ['./' + f for f in files], ensure_ascii=False, indent=1)))
    print('built', len(GAMES), 'engine games +', len(STANDALONE), 'standalone,', len(files), 'precached files,', version)


if __name__ == '__main__':
    build()
