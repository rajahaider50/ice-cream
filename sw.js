const CACHE_NAME = 'ice-cream-pos-v2.6';

// List of local application files to cache for offline functionality
const assetsToCache = [
    './',
    'splash.html',
    'index.html',
    'view.html',
    'add.html',
    'history.html',
    'setting.html',
    'manifest.json'
];

// Service Worker Installation & Core Assets Caching
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching local app assets');
            return cache.addAll(assetsToCache);
        }).then(() => self.skipWaiting()).catch((err) => {
            console.log('[SW] Installation cache note:', err);
        })
    );
});

// Service Worker Activation & Old Cache Cleanup
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Clearing outdated cache version:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Request Handling (Safe Network-First with Cache Fallback)
self.addEventListener('fetch', (event) => {
    // Skip non-http/https requests (like chrome-extension:// or file://)
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.mode === 'navigate') {
                        return caches.match('index.html');
                    }
                });
            })
    );
});