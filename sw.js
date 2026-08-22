const CACHE_NAME = 'ice-cream-stock-v1';
const assetsToCache = [
    'splash.html',
    'index.html',
    'view.html',
    'add.html',
    'setting.html',
    'manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(assetsToCache);
        })
    );
});

// Fetch Event (Offline Support)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});