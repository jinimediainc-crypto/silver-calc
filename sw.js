// =================================================================
// JINI JEWELS ECOSYSTEM - SERVICE WORKER PWA ENGINE
// =================================================================
const CACHE_NAME = "jini-jewels-vault-v4";

// Explicit array mapping of all operational app shell files
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./retail.html",
    "./backoffice.html",
    "./inventory.html",
    "./billing.html",
    "./firebase-config.js",
    "./manifest.json",
    "https://cdn.tailwindcss.com",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js",
    "https://unpkg.com/html5-qrcode",
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.min.js"
];

// Self-install event loop lifecycle handle
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("⚡ PWA Storage: Pre-caching application shell assets smoothly...");
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Cache activation event loop: purges legacy file iterations instantly
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheKeys) => {
            return Promise.all(
                cacheKeys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("🗑️ Storage Cleared: Flushing legacy service cache entry:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// High-speed fetch interception loop handler: network first strategy fallback loop
self.addEventListener("fetch", (event) => {
    // Block tracking analytics and foreign cloud parameters from breaking fetch loops
    if (!event.request.url.startsWith(self.location.origin) && !event.request.url.startsWith('https://')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If network response evaluates cleanly, clone and map into local cache registry
                if (response && response.status === 200 && response.type === 'basic') {
                    const cacheCopy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, cacheCopy);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failure asset fallback lookup routine
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    
                    // Fallback to basic root shell mapping if navigating sub-pages offline
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
