const CACHE_NAME = 'qa-nexus-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // PWA 설치 요건을 충족하기 위한 최소한의 fetch 이벤트 리스너
  event.respondWith(fetch(event.request).catch(() => new Response('Network error')));
});
