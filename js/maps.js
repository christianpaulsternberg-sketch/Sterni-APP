window.STERNI_MAPS = (() => {
  const FAV_KEY = "sterni_map_favorites_v1";

  let spotsMap = null;
  let spotsMarker = null;
  let currentSpot = { lat: 52.145, lon: 14.668, name: "Oder bei Eisenhüttenstadt", region: "Brandenburg" };
  let spotGbifKm = 1;

  let navMap = null;
  let navMarker = null;
  let navPolyline = null;
  let watchId = null;
  let recording = false;
  let trackPoints = [];
  let totalDistKm = 0;
  let tripStartTime = null;

  function loadFavs() {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveFavs(list) {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  }

  function initSpotsMap() {
    if (spotsMap) {
      setTimeout(() => spotsMap.invalidateSize(), 120);
      return;
    }
    const container = document.getElementById("spots-map");
    if (!container || typeof L === "undefined") return;

    spotsMap = L.map(container).setView([currentSpot.lat, currentSpot.lon], 11);
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(spotsMap);

    const emodnet = L.tileLayer.wms("https://ows.emodnet-bathymetry.eu/wms", {
      layers: "emodnet:mean_atlas_land",
      format: "image/png",
      transparent: true,
      opacity: 0.45,
      attribution: "EMODnet Bathymetry"
    });

    L.control.layers({ "OpenStreetMap": osm }, { "EMODnet Wassertiefe": emodnet }).addTo(spotsMap);

    spotsMarker = L.marker([currentSpot.lat, currentSpot.lon]).addTo(spotsMap);

    spotsMap.on("click", async (e) => {
      await selectSpotCoords(e.latlng.lat, e.latlng.lng);
    });

    // Initial load
    document.getElementById("spot-water").value = currentSpot.name;
    document.getElementById("spot-region").value = currentSpot.region;
    renderSchonzeiten();
    loadSpotData();
    renderFavorites();
  }

  async function selectSpotCoords(lat, lon, customName = null, customRegion = null) {
    currentSpot.lat = +lat.toFixed(5);
    currentSpot.lon = +lon.toFixed(5);
    if (spotsMap && spotsMarker) {
      spotsMarker.setLatLng([currentSpot.lat, currentSpot.lon]);
      spotsMap.panTo([currentSpot.lat, currentSpot.lon]);
    }
    document.getElementById("spot-coords-label").textContent =
      `Gewählte Position: ${currentSpot.lat}° N, ${currentSpot.lon}° O`;

    if (customName) {
      currentSpot.name = customName;
      document.getElementById("spot-water").value = customName;
    }
    if (customRegion !== null) {
      currentSpot.region = customRegion;
      document.getElementById("spot-region").value = customRegion;
    }

    if (!customName || customRegion === null) {
      try {
        const rev = await window.STERNI_API.reverseGeocode(currentSpot.lat, currentSpot.lon);
        if (rev) {
          const addr = rev.address || {};
          const waterName = rev.name || addr.water || addr.river || addr.lake || addr.town || addr.village || addr.city || "Kartenposition";
          if (!customName) {
            currentSpot.name = waterName;
            document.getElementById("spot-water").value = waterName;
          }
          if (customRegion === null && addr.state) {
            currentSpot.region = addr.state;
            const sel = document.getElementById("spot-region");
            const hasOpt = [...sel.options].some((o) => o.value === addr.state);
            sel.value = hasOpt ? addr.state : "";
          }
        }
      } catch {
        // Ignore reverse geocode errors
      }
    }

    renderSchonzeiten();
    await loadSpotData();
  }

  async function loadSpotData() {
    const condEl = document.getElementById("spot-conditions-output");
    const weatherEl = document.getElementById("spot-weather-output");
    const levelEl = document.getElementById("spot-waterlevel-output");
    const gbifEl = document.getElementById("spot-gbif-output");
    const fish = document.getElementById("spot-fish").value;

    condEl.textContent = "Lade Fangbedingungen …";
    weatherEl.textContent = "Lade Wetterdaten …";
    levelEl.textContent = "Prüfe Pegelstände …";
    gbifEl.textContent = "Lade Fischbestand …";

    // Weather + Score
    try {
      const w = await window.STERNI_API.fetchWeather(currentSpot.lat, currentSpot.lon);
      const score = window.STERNI_API.computeFishingScore(w, fish);
      condEl.innerHTML = `
        <p style="margin:0 0 0.5rem"><strong>${score.total} / 100 · ${score.verdict}</strong> (Zielfisch: ${fish})</p>
        <ul class="clean-list small-meta" style="margin:0;padding-left:1.1rem">
          ${score.items.map((i) => `<li>${i.label}: <strong>${i.pts} / ${i.max}</strong></li>`).join("")}
        </ul>
      `;

      const c = w.current;
      const sr = w.sunrise ? w.sunrise.slice(11, 16) : "—";
      const ss = w.sunset ? w.sunset.slice(11, 16) : "—";
      weatherEl.innerHTML = `
        <p style="margin:0 0 0.35rem"><strong>${c.temp} °C</strong> (gefühlt ${c.apparent} °C)</p>
        <p class="small-meta" style="margin:0">Luftdruck: ${c.pressure} hPa (3h: ${w.pressureDelta3h >= 0 ? "+" : ""}${w.pressureDelta3h} hPa)</p>
        <p class="small-meta" style="margin:0">Wind: ${c.windSpeed} km/h (${window.STERNI_API.degToCompass(c.windDir)}), Böen ${c.gusts} km/h</p>
        <p class="small-meta" style="margin:0">Bewölkung: ${c.cloud}% · Regen: ${c.rain} mm · Feuchte: ${c.humidity}%</p>
        <p class="small-meta" style="margin:0.25rem 0 0">↑ Sonnenaufgang ${sr} Uhr · ↓ Sonnenuntergang ${ss} Uhr</p>
      `;
    } catch {
      condEl.textContent = "Wetterdaten derzeit nicht abrufbar.";
      weatherEl.textContent = "Wetterdaten derzeit nicht abrufbar.";
    }

    // PEGELONLINE
    try {
      const levels = await window.STERNI_API.fetchWaterLevels(currentSpot.lat, currentSpot.lon, 25);
      if (!levels.length) {
        levelEl.textContent = "Keine PEGELONLINE-Messstelle im Umkreis von 25 km.";
      } else {
        levelEl.innerHTML = levels
          .map((l) => {
            const val = l.measurement ? `${l.measurement.value} ${l.unit}` : "kein aktueller Messwert";
            const dist = l.distKm != null ? `${l.distKm.toFixed(1)} km` : "";
            return `<p class="small-meta" style="margin:0 0 0.35rem"><strong>${l.name}</strong> (${l.water}, ${dist}): <strong>${val}</strong></p>`;
          })
          .join("");
      }
    } catch {
      levelEl.textContent = "Pegeldaten derzeit nicht abrufbar.";
    }

    // GBIF
    await loadSpotGbif();
  }

  async function loadSpotGbif() {
    const gbifEl = document.getElementById("spot-gbif-output");
    gbifEl.textContent = "Lade Fischbestand …";
    try {
      const res = await window.STERNI_API.fetchFishOccurrences(currentSpot.lat, currentSpot.lon, spotGbifKm);
      if (!res.species.length) {
        gbifEl.textContent = `Keine GBIF-Fischmeldungen im Radius von ${spotGbifKm} km gefunden.`;
      } else {
        gbifEl.innerHTML = `
          <p class="small-meta" style="margin:0 0 0.35rem">${res.total} Meldungen im Umkreis von ${spotGbifKm} km:</p>
          <ul class="clean-list small-meta" style="margin:0;padding-left:1.1rem">
            ${res.species.map((s) => `<li><em>${s.name}</em> (${s.count}×)</li>`).join("")}
          </ul>
        `;
      }
    } catch {
      gbifEl.textContent = "GBIF-Fischbestand derzeit nicht abrufbar.";
    }
  }

  function renderSchonzeiten() {
    const el = document.getElementById("spot-schonzeiten-output");
    const region = document.getElementById("spot-region").value;
    const water = document.getElementById("spot-water").value.trim();

    if (!region) {
      el.textContent = "Bitte Bundesland unter „Bundesland prüfen“ auswählen, um Landesrichtwerte anzuzeigen.";
      return;
    }

    const rows = window.STERNI_DATA.SCHONZEITEN_BY_STATE[region];
    if (!rows) {
      el.textContent = "Keine Daten für dieses Bundesland hinterlegt.";
      return;
    }

    el.innerHTML = `
      <p class="small-meta" style="margin:0 0 0.4rem">Orientierungswerte für <strong>${region}</strong>${water ? ` (${water})` : ""} – am Gewässer gilt stets der örtliche Erlaubnisschein:</p>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Fischart</th><th>Mindestmaß</th><th>Schonzeit</th></tr></thead>
          <tbody>
            ${rows.map((r) => `<tr><td>${r.fish}</td><td>${r.min}</td><td>${r.season}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderFavorites() {
    const listEl = document.getElementById("spot-favorites-list");
    const favs = loadFavs();
    if (!favs.length) {
      listEl.innerHTML = `<p class="muted small-meta">Noch keine Kartenpositionen als Favorit gespeichert.</p>`;
      return;
    }
    listEl.innerHTML = "";
    favs.forEach((f, idx) => {
      const card = document.createElement("div");
      card.className = "entry-card";
      card.innerHTML = `
        <div class="entry-card-head">
          <div><strong></strong><div class="small-meta muted"></div></div>
          <div class="action-row" style="margin:0">
            <button type="button" class="btn-outline btn-xs load-fav">Laden</button>
            <button type="button" class="btn-ghost btn-xs del-fav">✕</button>
          </div>
        </div>
      `;
      card.querySelector("strong").textContent = f.name;
      card.querySelector(".muted").textContent = `${f.region || "Deutschland"} · ${f.lat}° N, ${f.lon}° O`;
      card.querySelector(".load-fav").addEventListener("click", () => selectSpotCoords(f.lat, f.lon, f.name, f.region || ""));
      card.querySelector(".del-fav").addEventListener("click", () => {
        const next = loadFavs();
        next.splice(idx, 1);
        saveFavs(next);
        renderFavorites();
      });
      listEl.appendChild(card);
    });
  }

  function bindSpotsEvents() {
    document.getElementById("spot-region")?.addEventListener("change", renderSchonzeiten);
    document.getElementById("spot-water")?.addEventListener("input", renderSchonzeiten);
    document.getElementById("spot-fish")?.addEventListener("change", loadSpotData);
    document.getElementById("spot-refresh-btn")?.addEventListener("click", loadSpotData);

    document.getElementById("spot-gbif-radii")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-km]");
      if (!btn) return;
      spotGbifKm = Number(btn.dataset.km);
      document.querySelectorAll("#spot-gbif-radii button").forEach((b) => b.classList.toggle("active", b === btn));
      loadSpotGbif();
    });

    document.getElementById("map-spot-search-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = document.getElementById("map-spot-search").value.trim();
      if (!q) return;
      const resBox = document.getElementById("map-search-results");
      resBox.hidden = false;
      resBox.innerHTML = `<div class="disambig-item">Suche „${q}“ …</div>`;
      try {
        const hits = await window.STERNI_API.geocodeSearch(q);
        if (!hits.length) {
          resBox.innerHTML = `<div class="disambig-item">Keine Treffer gefunden.</div>`;
          return;
        }
        resBox.innerHTML = "";
        hits.slice(0, 8).forEach((h) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "disambig-item";
          btn.textContent = h.display_name;
          btn.addEventListener("click", () => {
            resBox.hidden = true;
            const shortName = h.name || h.display_name.split(",")[0];
            const state = h.address?.state || "";
            selectSpotCoords(Number(h.lat), Number(h.lon), shortName, state);
          });
          resBox.appendChild(btn);
        });
      } catch {
        resBox.innerHTML = `<div class="disambig-item">Suche fehlgeschlagen.</div>`;
      }
    });

    document.getElementById("spot-use-gps-btn")?.addEventListener("click", () => {
      if (!navigator.geolocation) {
        window.STERNI_APP?.toast("GPS wird von diesem Browser nicht unterstützt.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => selectSpotCoords(pos.coords.latitude, pos.coords.longitude),
        () => window.STERNI_APP?.toast("Standortfreigabe abgelehnt oder nicht verfügbar.")
      );
    });

    document.getElementById("spot-save-fav-btn")?.addEventListener("click", () => {
      const favs = loadFavs();
      const name = document.getElementById("spot-water").value.trim() || currentSpot.name;
      const region = document.getElementById("spot-region").value;
      favs.unshift({ name, region, lat: currentSpot.lat, lon: currentSpot.lon });
      saveFavs(favs.slice(0, 30));
      renderFavorites();
      window.STERNI_APP?.toast(`Kartenposition „${name}“ gespeichert.`);
    });

    document.getElementById("spot-share-btn")?.addEventListener("click", async () => {
      const name = document.getElementById("spot-water").value.trim() || currentSpot.name;
      const url = `https://www.openstreetmap.org/?mlat=${currentSpot.lat}&mlon=${currentSpot.lon}#map=14/${currentSpot.lat}/${currentSpot.lon}`;
      const text = `Mein Angelspot „${name}“ (${currentSpot.lat}, ${currentSpot.lon}): ${url}`;
      try {
        await navigator.clipboard.writeText(text);
        window.STERNI_APP?.toast("Spot-Link kopiert!");
      } catch {
        window.STERNI_APP?.toast(text);
      }
    });

    document.getElementById("export-spots-btn")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(loadFavs(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "sterni-karten-spots.json";
      a.click();
    });

    document.getElementById("import-spots-input")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (Array.isArray(parsed)) {
          saveFavs(parsed);
          renderFavorites();
          window.STERNI_APP?.toast("Karten-Spots eingelesen.");
        }
      } catch {
        window.STERNI_APP?.toast("Ungültige JSON-Datei.");
      }
      e.target.value = "";
    });
  }

  // ==================== BOAT NAVIGATION & GPX ====================
  function initNavMap() {
    if (navMap) {
      setTimeout(() => navMap.invalidateSize(), 120);
      return;
    }
    const container = document.getElementById("nav-map");
    if (!container || typeof L === "undefined") return;

    navMap = L.map(container).setView([53.45, 12.68], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(navMap);

    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
      attribution: "© OpenSeaMap"
    }).addTo(navMap);

    navPolyline = L.polyline([], { color: "#ff4549", weight: 4 }).addTo(navMap);
  }

  async function selectNavWater(hit) {
    const name = hit.name || hit.display_name?.split(",")[0] || "Gewässer";
    const lat = Number(hit.lat); const lon = Number(hit.lon);
    const selected = document.getElementById("nav-water-selected");
    const list = document.getElementById("nav-water-sections");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    selected.textContent = `${name} · ${hit.address?.country || hit.address?.state || "Geografischer Treffer"} · ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° O`;
    list.innerHTML = "<p class=\"muted small-meta\">Suche benannte Teilabschnitte …</p>";
    if (navMap) {
      if (!navMarker) navMarker = L.marker([lat, lon]).addTo(navMap);
      else navMarker.setLatLng([lat, lon]);
      navMarker.bindPopup(`<strong>${name}</strong>`).openPopup();
      navMap.setView([lat, lon], 11);
    }
    try {
      const sections = await window.STERNI_API.fetchWaterSections(lat, lon, name);
      list.innerHTML = "";
      if (!sections.length) {
        list.innerHTML = '<p class="muted small-meta">Für diesen Treffer sind aktuell keine benannten Teilabschnitte in den Datenquellen erfasst.</p>';
        return;
      }
      sections.forEach((section) => {
        const button = document.createElement("button");
        button.type = "button"; button.className = "section-chip-btn";
        button.innerHTML = '<span class="section-chip-type"></span><strong></strong><span class="small-meta muted"></span>';
        button.querySelector(".section-chip-type").textContent = section.type;
        button.querySelector("strong").textContent = section.name;
        button.querySelector(".muted").textContent = `${section.distKm.toFixed(1)} km · ${section.source}`;
        button.addEventListener("click", () => selectNavWater({ name: section.name, display_name: `${section.name} (${section.type})`, lat: section.lat, lon: section.lon, address: hit.address || {} }));
        list.appendChild(button);
      });
    } catch {
      list.innerHTML = '<p class="muted small-meta">Die Gewässerdatenquelle ist momentan nicht erreichbar.</p>';
    }
  }

  function bindNavEvents() {
    const gpsBtn = document.getElementById("nav-gps-toggle-btn");
    const recBtn = document.getElementById("nav-record-btn");

    document.getElementById("nav-water-search-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = document.getElementById("nav-water-search").value.trim();
      const results = document.getElementById("nav-water-results");
      if (!query) return;
      results.hidden = false; results.innerHTML = '<div class="disambig-item">Suche weltweit …</div>';
      try {
        const hits = (await window.STERNI_API.geocodeSearch(query)).filter((hit) => {
          const hitClass = hit.class || hit.category || "";
          return hitClass === "waterway" || hitClass === "natural" || hit.type === "water";
        });
        if (!hits.length) { results.innerHTML = '<div class="disambig-item">Kein benanntes Gewässer gefunden.</div>'; return; }
        results.innerHTML = "";
        hits.slice(0, 8).forEach((hit) => {
          const button = document.createElement("button"); button.type = "button"; button.className = "disambig-item"; button.textContent = hit.display_name;
          button.addEventListener("click", () => { results.hidden = true; selectNavWater(hit); });
          results.appendChild(button);
        });
      } catch { results.innerHTML = '<div class="disambig-item">Gewässersuche derzeit nicht erreichbar.</div>'; }
    });

    gpsBtn?.addEventListener("click", () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        recording = false;
        gpsBtn.textContent = "GPS einschalten";
        recBtn.disabled = true;
        recBtn.textContent = "Fahrt aufzeichnen";
        document.getElementById("nav-coords").textContent = "Ausgeschaltet";
        document.getElementById("tile-speed-readout").textContent = "Aktuelle Geschwindigkeit — km/h";
        return;
      }
      if (!navigator.geolocation) {
        window.STERNI_APP?.toast("GPS wird von diesem Browser nicht unterstützt.");
        return;
      }
      gpsBtn.textContent = "GPS ausschalten";
      recBtn.disabled = false;
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, accuracy } = pos.coords;
          const kmh = speed != null && speed >= 0 ? speed * 3.6 : 0;
          const kn = kmh / 1.852;

          document.getElementById("nav-speed-kmh").textContent = `${kmh.toFixed(1)} km/h`;
          document.getElementById("nav-speed-kn").textContent = `${kn.toFixed(1)} kn`;
          document.getElementById("tile-speed-readout").textContent = `Aktuelle Geschwindigkeit ${kmh.toFixed(1)} km/h`;
          document.getElementById("nav-coords").textContent = `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;
          document.getElementById("nav-accuracy").textContent = `Genauigkeit ±${Math.round(accuracy)} m`;

          if (navMap) {
            if (!navMarker) {
              navMarker = L.circleMarker([latitude, longitude], {
                radius: 8,
                color: "#fff",
                fillColor: "#ff4549",
                fillOpacity: 1
              }).addTo(navMap);
              navMap.setView([latitude, longitude], 14);
            } else {
              navMarker.setLatLng([latitude, longitude]);
            }
          }

          if (recording) {
            const pt = { lat: latitude, lon: longitude, time: new Date().toISOString() };
            if (trackPoints.length > 0) {
              const prev = trackPoints[trackPoints.length - 1];
              const seg = window.STERNI_API.haversineKm(prev.lat, prev.lon, pt.lat, pt.lon);
              if (seg >= 0.005) {
                totalDistKm += seg;
                trackPoints.push(pt);
              }
            } else {
              trackPoints.push(pt);
            }
            if (navPolyline) navPolyline.setLatLngs(trackPoints.map((p) => [p.lat, p.lon]));
            document.getElementById("nav-dist-km").textContent = `${totalDistKm.toFixed(2).replace(".", ",")} km`;
            const mins = tripStartTime ? Math.floor((Date.now() - tripStartTime) / 60000) : 0;
            document.getElementById("nav-duration-min").textContent = `${mins} min`;
          }
        },
        () => window.STERNI_APP?.toast("GPS-Signal konnte nicht empfangen werden."),
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
    });

    recBtn?.addEventListener("click", () => {
      recording = !recording;
      if (recording && !tripStartTime) tripStartTime = Date.now();
      recBtn.textContent = recording ? "Aufzeichnung pausieren" : "Fahrt aufzeichnen";
      recBtn.classList.toggle("active", recording);
    });

    document.getElementById("nav-center-btn")?.addEventListener("click", () => {
      if (navMap && navMarker) navMap.setView(navMarker.getLatLng(), 15);
      else window.STERNI_APP?.toast("Noch keine GPS-Position vorhanden.");
    });

    document.getElementById("nav-new-trip-btn")?.addEventListener("click", () => {
      trackPoints = [];
      totalDistKm = 0;
      tripStartTime = recording ? Date.now() : null;
      if (navPolyline) navPolyline.setLatLngs([]);
      document.getElementById("nav-dist-km").textContent = "0,00 km";
      document.getElementById("nav-duration-min").textContent = "0 min";
      window.STERNI_APP?.toast("Neue Fahrt gestartet.");
    });

    document.getElementById("nav-export-gpx-btn")?.addEventListener("click", () => {
      if (!trackPoints.length) {
        window.STERNI_APP?.toast("Noch keine Trackpunkte aufgezeichnet.");
        return;
      }
      const trkpts = trackPoints
        .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}"><time>${p.time}</time></trkpt>`)
        .join("\n");
      const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sterni-App Petri Heil">
  <trk><name>Bootsfahrt ${new Date().toLocaleDateString("de-DE")}</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>`;
      const blob = new Blob([gpx], { type: "application/gpx+xml" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sterni-bootsfahrt-${new Date().toISOString().slice(0, 10)}.gpx`;
      a.click();
    });
  }

  function init() {
    bindSpotsEvents();
    bindNavEvents();
  }

  return {
    init,
    initSpotsMap,
    initNavMap,
    selectSpotCoords
  };
})();
