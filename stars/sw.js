// 별자리 잇기 오프라인 캐시: 한 번 열면 인터넷 없이도 실행. 파일을 바꾸면 VERSION 을 올릴 것.
const VERSION = 'stars-v1';
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./tk.js", "./game.js", "./icons/icon-192.png", "./icons/icon-512.png", "./assets/tino_run_v2.png", "./assets/tino_jump_v2.png", "./assets/coco_run_v2.png", "./assets/coco_jump_v2.png", "./assets/coco_laugh_v2.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
