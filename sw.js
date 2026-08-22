const CACHE_NAME = 'ice-cream-pos-v3.0';

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

// External CDN assets required for the full native-app look & offline mode
const cdnAssetsToCache = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap'
];

// Service Worker Installation & Core Assets Caching
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching local app assets');
            // Cache each asset individually so a single failure never blocks installation
            const localAssets = assetsToCache.map((asset) => {
                return cache.add(asset).catch((err) => {
                    console.log('[SW] Skipped asset during install:', asset, err);
                });
            });
            const externalAssets = cdnAssetsToCache.map((asset) => {
                return cache.add(asset).catch((err) => {
                    console.log('[SW] Skipped CDN asset during install:', asset, err);
                });
            });
            return Promise.all([...localAssets, ...externalAssets]);
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

// Fetch Request Handling (Safe Hybrid Strategy)
// - Page navigations: Network-First with offline cache fallback (always fresh data when online)
// - Static & CDN assets: Stale-While-Revalidate (instant load + background update)
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Skip non-http/https requests (like chrome-extension:// or file://)
    if (!request.url.startsWith('http')) return;

    // Only handle safe GET requests
    if (request.method !== 'GET') return;

    // Navigation Requests: Network-First with Cache Fallback (full offline support)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        return caches.match('index.html');
                    });
                })
        );
        return;
    }

    // Static Assets (local + CDN): Stale-While-Revalidate for instant native-like loading
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => cachedResponse);
            return cachedResponse || fetchPromise;
        })
    );
});
