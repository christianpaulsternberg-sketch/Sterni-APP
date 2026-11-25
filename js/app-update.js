/* Sterni-App – automatische Aktualisierung
 *
 * - Registriert den Service Worker relativ (funktioniert unter /Sterni-APP/ auf GitHub Pages).
 * - Prüft beim Start, bei Rückkehr aus dem Hintergrund, bei pageshow (iOS) und bei
 *   wiederhergestellter Verbindung auf eine neue Version.
 * - Eine neue Version wird im Hintergrund geladen und übernimmt sofort die Kontrolle;
 *   die Seite wird genau einmal neu geladen – aber nicht, während gerade getippt wird.
 * - Schutz gegen Endlos-Neuladen über sessionStorage.
 * - Benutzerdaten (localStorage, Anmeldungen) werden nicht angefasst.
 */
(() => {
  if (!('serviceWorker' in navigator)) return;

  const SW_URL = './service-worker.js';
  const RELOAD_GUARD_KEY = 'sterni_sw_reload_at';
  const RELOAD_GUARD_MS = 15000;
  const hadController = !!navigator.serviceWorker.controller;
  let pendingReload = false;
  let reloading = false;
  let lastCheck = 0;

  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.type !== 'button' && el.type !== 'submit';
  }

  function tryReload() {
    if (!pendingReload || reloading) return;
    if (document.hidden || isTyping()) return; // später erneut versuchen
    let last = 0;
    try { last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0; } catch (_) {}
    if (Date.now() - last < RELOAD_GUARD_MS) { pendingReload = false; return; }
    try { sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now())); } catch (_) {}
    reloading = true;
    location.reload();
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Erste Installation: Seite läuft bereits mit aktuellen Dateien – kein Neuladen nötig.
    if (!hadController) return;
    pendingReload = true;
    tryReload();
  });

  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryReload(); });
  document.addEventListener('focusout', () => setTimeout(tryReload, 300));

  function register() {
    navigator.serviceWorker.register(SW_URL, { scope: './', updateViaCache: 'none' })
      .then((reg) => {
        window.STERNI_APP_UPDATE = { check: () => reg.update(), reg };
        const check = (force) => {
          const now = Date.now();
          if (!force && now - lastCheck < 3000) return;
          lastCheck = now;
          reg.update().catch(() => {});
        };
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            check();
            tryReload();
          }
        });
        window.addEventListener('pageshow', (e) => { if (e.persisted) { check(); tryReload(); } });
        window.addEventListener('online', () => { check(true); tryReload(); });
        // Falls bereits eine neue Version wartet (älterer Worker ohne skipWaiting):
        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => console.warn('Service Worker konnte nicht registriert werden:', err));
  }

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
})();
