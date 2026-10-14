const CACHE = 'noxcount-v1';
const ASSETS = ['./', 'index.html', 'styles.css', 'firebase-config.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'js/app.js', 'js/store.js', 'js/i18n.js', 'js/charts.js', 'js/cloud.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Firebase y demás: directo a la red
  e.respondWith(
    fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
