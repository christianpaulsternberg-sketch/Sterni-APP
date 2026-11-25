// Service Worker for Sterni-App
// Version identifier – update manually when releasing a new version
const CACHE_VERSION = 'v1-20231125';
const CACHE_NAME = `sterni-app-cache-${CACHE_VERSION}`;

// List of resources to precache. Update this list when new assets are added.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.webmanifest',
  '/icons/orange-fish-180.png',
  '/icons/orange-fish-192.png',
  // JS bundles
  '/js/app.js',
  '/version.json',
  '/js/api.js',
  '/js/knot-lexikon.js',
  '/js/knot-illustrations.js',
  // Add other essential assets as needed
];

self.addEventListener('install', (event) => {
  // Perform install steps: cache essential assets.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Force the waiting service worker to become active.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove old caches that don't match the current version.
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name.startsWith('sterni-app-cache-')) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  // Claim clients so that the newly activated SW controls pages immediately.
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass cross‑origin requests (e.g., analytics) – let them go to network.
  if (url.origin !== location.origin) {
    return;
  }

  // Try cache first, fall back to network, then cache the response for future.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful (200) responses.
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Optional: return a fallback page for navigation requests.
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Listen for messages from the page (e.g., to trigger skipWaiting).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
