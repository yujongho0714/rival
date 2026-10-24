// 아이 영상 분석기 - 오프라인/설치용 서비스 워커
const APP = 'video-analyzer-v1';
const LIB = 'video-analyzer-lib-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== APP && k !== LIB).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol === 'blob:' || url.protocol === 'data:') return;
  // 사람 인식 모델·라이브러리: 한 번 받으면 저장해서 인터넷 없이도 사용
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'storage.googleapis.com') {
    e.respondWith(caches.open(LIB).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // 앱 파일: 인터넷 되면 최신 버전, 안 되면 저장된 버전
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(APP).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  }
});
