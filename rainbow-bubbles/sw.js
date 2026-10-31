// 무지개 방울 오프라인 캐시: 한 번 열면 인터넷 없이도 실행. 파일을 바꾸면 VERSION 을 올릴 것.
const VERSION = 'rainbow-v5';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './assets/tino_run_v2.png', './assets/tino_jump_v2.png', './assets/coco_run_v2.png', './assets/coco_jump_v2.png', './assets/coco_laugh_v2.png'];
const OPTIONAL = ['./assets/tino_laugh_v3.png', './assets/tino_sleep.png', './assets/coco_sleep.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(CORE);
    await Promise.all(OPTIONAL.map(u => c.add(u).catch(() => {})));   // 없는 선택 그림은 건너뜀
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
