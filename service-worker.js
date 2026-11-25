/* Sterni-App Service Worker
 *
 * Ziel: Installierte Apps (iPhone, iPad, Android, Desktop) erhalten neue Versionen
 * automatisch, ohne Neuinstallation – und funktionieren trotzdem offline.
 *
 * Strategie:
 * - App-Dateien (HTML, JS, CSS, JSON, Manifest): "Netzwerk zuerst". Online wird immer
 *   die aktuelle, zusammenpassende Version geladen; offline greift der Cache.
 * - Bilder/Icons/Schriften: "Cache zuerst" mit Aktualisierung im Hintergrund.
 * - Fremde Server (Supabase, Wetter, Karten, Fonts) werden nicht angefasst.
 * - Benutzerdaten liegen in localStorage/IndexedDB und werden nie gelöscht;
 *   beim Aktivieren werden nur alte "sterni-app-*"-Caches entfernt.
 *
 * WICHTIG: Bei jeder Veröffentlichung APP_VERSION erhöhen (und version.json anpassen).
 * Dadurch ändert sich diese Datei, der Browser erkennt die neue Version automatisch.
 */
const APP_VERSION = '1.0.4';
const CACHE_NAME = `sterni-app-${APP_VERSION}`;
const CACHE_PREFIX = 'sterni-app-';
const NETWORK_TIMEOUT_MS = 6000;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './anglertreff.html',
  './manifest.webmanifest',
  './version.json',
  './style.css',
  './legal-footer.css',
  './quiz-live.css',
  './responsive.css',
  './anglertreff.css',
  './anglertreff-basis.css',
  './anglertreff-config.js',
  './anglertreff-hinweis.js',
  './anglertreff.js',
  './js/data.js',
  './js/quiz-data.js',
  './js/quiz-history.js',
  './js/api.js',
  './js/quiz.js',
  './js/quiz-online.js',
  './js/quiz-live.js',
  './js/maps.js',
  './js/knot-lexikon.js',
  './js/three.min.js',
  './js/knot-animator-3d.js',
  './js/knots/palomar-3d.js',
  './knoten-vorschau.html',
  './js/app.js',
  './js/app-update.js',
  './icons/orange-fish-180.png',
  './icons/orange-fish-192.png',
  './icons/orange-fish-512.png',
  './assets/hero/angelpanorama.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Einzeln laden: eine fehlende Datei darf die Installation nicht verhindern.
    await Promise.all(PRECACHE_ASSETS.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res.ok) await cache.put(url, res);
      } catch (_) { /* offline während der Installation – später nachladen */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((n) => n !== CACHE_NAME && (n.startsWith(CACHE_PREFIX)))
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

function isAppFile(request, url) {
  if (request.mode === 'navigate') return true;
  return /\.(html|js|mjs|css|json|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith('/');
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function fromCache(request) {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(request)) ||
         (await cache.match(request, { ignoreSearch: true })) ||
         (await cache.match('./')) ||
         (await cache.match('./index.html'));
}

async function networkFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  try {
    // Bei Navigation request.url nutzen, um mode:'navigate'-Beschränkungen zu vermeiden
    const fetchPromise = request.mode === 'navigate'
      ? fetch(request.url, { cache: 'no-cache' })
      : fetch(request, { cache: 'no-cache' });
    const res = await Promise.race([
      fetchPromise,
      timeout(NETWORK_TIMEOUT_MS)
    ]);
    if (res && res.ok && (res.type === 'basic' || res.type === 'default')) {
      const copy = res.clone();
      event.waitUntil(cache.put(request, copy));
    }
    return res;
  } catch (err) {
    const cached = await fromCache(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const update = fetch(request).then((res) => {
    if (res && res.ok && res.type === 'basic') cache.put(request, res.clone());
    return res;
  }).catch(() => undefined);
  if (cached) {
    event.waitUntil(update);
    return cached;
  }
  const res = await update;
  return res || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, APIs, CDN: unverändert
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  event.respondWith(isAppFile(request, url) ? networkFirst(event) : cacheFirst(event));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'GET_VERSION' && event.ports[0]) {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});
