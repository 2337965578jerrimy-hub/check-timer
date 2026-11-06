// Service worker for offline use.
// Strategy: serve from cache first (works with no network), refresh the cache in the
// background when online, so a newly uploaded version is used on the next launch.
var CACHE = 'check-timer-v1';
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  // cache:'reload' = take the files from the server, not from the browser's own HTTP cache
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      var key = req.mode === 'navigate' ? 'index.html' : req;
      return cache.match(key, { ignoreSearch: true }).then(function (hit) {
        // cache:'no-cache' = always ask the server (GitHub Pages lets browsers keep a copy for 10 min,
        // which made a new upload take several launches to show up)
        var update = fetch(req.url, { cache: 'no-cache' }).then(function (res) {
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || update;
      });
    })
  );
});
