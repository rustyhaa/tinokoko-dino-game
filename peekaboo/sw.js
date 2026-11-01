// 예전 게임별 오프라인 저장을 정리하는 파일.
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
