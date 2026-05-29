const CACHE_NAME = 'jini-calc-cache-v1';

// Install process: skip waiting to force immediate update
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate process: claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Fetch process: Network-First strategy (Fixes the update issue)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If network is available, save a fresh copy to cache and return it
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // If offline, return the cached version
                return caches.match(event.request);
            })
    );
});
