/**
 * visitor-tracker.js - Zentrale, datenschutzkonforme Besucherstatistik für die Sterni-App
 * 
 * Datenschutz-Grundsätze:
 * - Keine IP-Adressen, keine GPS-Daten, keine Gerätekennungen.
 * - Standardmäßig rein anonyme Aufrufzählung (user_id = null, display_name = null).
 * - Personenbezogene Zuordnung ausschließlich bei aktiver, freiwilliger Einwilligung des Mitglieds.
 * - Jederzeit widerrufbar.
 */
(() => {
  'use strict';

  const SESSION_STORAGE_KEY = 'sterni-visitor-session';
  const CONSENT_STORAGE_KEY = 'sterni-analytics-consent-v1';
  const AUTH_STORAGE_KEY = 'petri-treff-session-v1';

  // Flüchtige Sitzungs-ID für zusammenhängende Navigation (nur für die aktuelle Browser-Sitzung)
  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!id) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
        sessionStorage.setItem(SESSION_STORAGE_KEY, id);
      }
      return id;
    } catch {
      return 's-temp-' + Date.now();
    }
  }

  // Ermittelt die gespeicherte Authentifizierungssitzung aus dem Anglertreff
  function getAuthSession() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.access_token && parsed?.user?.id) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Prüft die lokale Einwilligung des Nutzers
  function hasConsent() {
    try {
      return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  // Konfiguration für Supabase
  function getConfig() {
    return window.ANGLERTREFF_CONFIG || {
      url: 'https://bcromlwxyckaefqdsnmd.supabase.co',
      publishableKey: 'sb_publishable_xGO3n969bfiRX7UYQnt0lA_ITenUkaH'
    };
  }

  let lastTrackedArea = '';
  let lastTrackedTime = 0;

  // Seitenaufruf erfassen
  async function track(areaName) {
    if (!areaName) return;
    const now = Date.now();
    // Gleiche Seite innerhalb von 4 Sekunden nicht doppelt zählen
    if (areaName === lastTrackedArea && now - lastTrackedTime < 4000) {
      return;
    }
    lastTrackedArea = areaName;
    lastTrackedTime = now;

    const config = getConfig();
    if (!config?.url || !config?.publishableKey) return;

    const auth = getAuthSession();
    const consent = hasConsent();

    // Nur bei eingeloggtem Zustand UND ausdrücklicher Einwilligung personenbezogen
    let userId = null;
    let displayName = null;
    let token = null;

    if (auth && consent) {
      userId = auth.user.id;
      displayName = auth.user.user_metadata?.display_name || auth.user.email?.split('@')[0] || 'Mitglied';
      token = auth.access_token;
    }

    const payload = {
      session_id: getSessionId(),
      page_area: areaName,
      user_id: userId,
      display_name: displayName
    };

    try {
      await fetch(config.url + '/rest/v1/app_visits', {
        method: 'POST',
        headers: {
          'apikey': config.publishableKey,
          'Authorization': 'Bearer ' + (token || config.publishableKey),
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
    } catch {
      // Fehler still ignorieren, damit die App-Nutzung niemals beeinträchtigt wird
    }
  }

  // Einwilligung speichern (lokal und bei bestehender Sitzung in der DB)
  async function setConsent(consented) {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, consented ? 'true' : 'false');
    } catch {}

    const auth = getAuthSession();
    const config = getConfig();
    if (auth && config?.url) {
      try {
        await fetch(config.url + '/rest/v1/treff_analytics_consent', {
          method: 'POST',
          headers: {
            'apikey': config.publishableKey,
            'Authorization': 'Bearer ' + auth.access_token,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            user_id: auth.user.id,
            consented: !!consented,
            updated_at: new Date().toISOString()
          }),
          signal: AbortSignal.timeout(6000)
        });
      } catch {
        // Fehler tolerieren
      }
    }
  }

  // Einwilligung aus der Datenbank synchronisieren (wenn angemeldet)
  async function syncConsent() {
    const auth = getAuthSession();
    const config = getConfig();
    if (!auth || !config?.url) return;
    try {
      const res = await fetch(config.url + '/rest/v1/treff_analytics_consent?user_id=eq.' + encodeURIComponent(auth.user.id) + '&select=consented', {
        headers: {
          'apikey': config.publishableKey,
          'Authorization': 'Bearer ' + auth.access_token
        },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          localStorage.setItem(CONSENT_STORAGE_KEY, rows[0].consented ? 'true' : 'false');
        }
      }
    } catch {}
  }

  // Automatische Erfassung anhand der URL und Route
  function detectArea() {
    const pathname = location.pathname.toLowerCase();
    if (pathname.endsWith('anglertreff.html') || pathname.endsWith('anglertreff')) {
      return 'Anglertreff';
    }
    const hash = (location.hash || '#start').replace('#', '').split('?')[0].toLowerCase();
    const map = {
      'start': 'Startseite',
      '': 'Startseite',
      'quiz': 'Wissens-Quiz',
      'spots': 'Angelspots & Gewässer',
      'wissen': 'Fischarten & Wissen',
      'angeln': 'Angelpraxis',
      'knoten': 'Knotenschule',
      'wetter': 'Angelwetter',
      'navigation': 'Boot & Navigation',
      'journal': 'Fangtagebuch',
      'wartung': 'Wartung & Pflege',
      'hinweise': 'Datenschutz & Hinweise',
      'installation': 'Installation & PWA'
    };

    if (hash.startsWith('knoten')) return 'Knotenschule';
    return map[hash] || ('Bereich: ' + hash);
  }

  function autoTrack() {
    const area = detectArea();
    track(area);
  }

  // Initialisierung beim Laden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoTrack();
      syncConsent();
    });
  } else {
    autoTrack();
    syncConsent();
  }

  // Auf Navigation und Hashwechsel hören
  window.addEventListener('hashchange', autoTrack);
  window.addEventListener('sterni-session-changed', syncConsent);

  // Öffentliche API
  window.SterniTracker = {
    track,
    hasConsent,
    setConsent,
    syncConsent,
    getSessionId
  };
})();
