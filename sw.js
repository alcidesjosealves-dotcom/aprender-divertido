
const STATIC_CACHE = 'quiz-static-v3';
const DYNAMIC_CACHE = 'quiz-dynamic-v3';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/questions/questions.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(req.url, res.clone());
            return res;
          });
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
