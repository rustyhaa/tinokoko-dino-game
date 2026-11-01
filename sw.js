// 티노코코 놀이터 오프라인 저장 (사이트 맨 위에 하나). 한 번 열면 인터넷 없이도 모든 게임이 열린다.
// 저장된 것을 먼저 보여주고, 인터넷이 되면 뒤에서 새 파일로 바꿔 둔다 (다음에 열 때 반영).
// VERSION 과 목록은 common/build_games.py 가 만든다.
const VERSION = 'playground-853ebb91bb';
const PRECACHE = [
 "./",
 "./index.html",
 "./games/",
 "./games/index.html",
 "./games/manifest.webmanifest",
 "./shared/tk.js",
 "./shared/frame.js",
 "./shared/hangul.js",
 "./assets/coco_jump_v2.png",
 "./assets/coco_laugh_v2.png",
 "./assets/coco_run_flip.png",
 "./assets/coco_run_v2.png",
 "./assets/coco_walk_flip.png",
 "./assets/coco_walk_v2.png",
 "./assets/tino_jump_v2.png",
 "./assets/tino_laugh_v2.png",
 "./assets/tino_run_flip.png",
 "./assets/tino_run_v2.png",
 "./assets/tino_walk_flip.png",
 "./assets/tino_walk_v2.png",
 "./shared/assets/tino_run_v2.png",
 "./shared/assets/tino_jump_v2.png",
 "./shared/assets/coco_run_v2.png",
 "./shared/assets/coco_jump_v2.png",
 "./shared/assets/coco_laugh_v2.png",
 "./shared/icons/icon-180.png",
 "./shared/icons/icon-192.png",
 "./shared/icons/icon-512.png",
 "./bath/",
 "./bath/index.html",
 "./bath/icons/icon-192.png",
 "./bath/game.js",
 "./boat/",
 "./boat/index.html",
 "./boat/icons/icon-192.png",
 "./boat/game.js",
 "./shapes/",
 "./shapes/index.html",
 "./shapes/icons/icon-192.png",
 "./shapes/game.js",
 "./stars/",
 "./stars/index.html",
 "./stars/icons/icon-192.png",
 "./stars/game.js",
 "./garden/",
 "./garden/index.html",
 "./garden/icons/icon-192.png",
 "./garden/game.js",
 "./band/",
 "./band/index.html",
 "./band/icons/icon-192.png",
 "./band/game.js",
 "./blow/",
 "./blow/index.html",
 "./blow/icons/icon-192.png",
 "./blow/game.js",
 "./steps/",
 "./steps/index.html",
 "./steps/icons/icon-192.png",
 "./steps/game.js",
 "./rainbow-bubbles/",
 "./rainbow-bubbles/index.html",
 "./rainbow-bubbles/icons/icon-192.png",
 "./peekaboo/",
 "./peekaboo/index.html",
 "./peekaboo/icons/icon-192.png"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('playground-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
