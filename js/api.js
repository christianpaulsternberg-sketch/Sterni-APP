window.STERNI_API = (() => {
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  async function geocodeSearch(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=12&accept-language=de&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding fehlgeschlagen (${res.status})`);
    return res.json();
  }

  async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=de&lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  }

  async function fetchWeather(lat, lon) {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      hourly: "temperature_2m,precipitation_probability,precipitation,surface_pressure,wind_speed_10m,cloud_cover",
      daily: "sunrise,sunset",
      timezone: "auto",
      forecast_days: "2"
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!res.ok) throw new Error(`Wetterabruf fehlgeschlagen (${res.status})`);
    const data = await res.json();

    const cur = data.current || {};
    const hourly = data.hourly || {};
    const times = hourly.time || [];
    const nowTime = cur.time ? cur.time.slice(0, 13) : "";
    let idx = times.findIndex((t) => t.startsWith(nowTime));
    if (idx < 0) idx = 0;

    const pNow = cur.surface_pressure ?? hourly.surface_pressure?.[idx] ?? 1013;
    const pPrev3 = idx >= 3 ? hourly.surface_pressure?.[idx - 3] : hourly.surface_pressure?.[0];
    const pressureDelta3h = pPrev3 != null ? +(pNow - pPrev3).toFixed(1) : 0;

    const tNow = cur.temperature_2m ?? hourly.temperature_2m?.[idx] ?? 12;
    const tPrev6 = idx >= 6 ? hourly.temperature_2m?.[idx - 6] : hourly.temperature_2m?.[0];
    const tempDelta6h = tPrev6 != null ? +(tNow - tPrev6).toFixed(1) : 0;

    return {
      current: {
        temp: cur.temperature_2m,
        apparent: cur.apparent_temperature,
        humidity: cur.relative_humidity_2m,
        pressure: pNow,
        windSpeed: cur.wind_speed_10m,
        windDir: cur.wind_direction_10m,
        gusts: cur.wind_gusts_10m,
        rain: cur.rain ?? cur.precipitation ?? 0,
        cloud: cur.cloud_cover
      },
      sunrise: data.daily?.sunrise?.[0] || "",
      sunset: data.daily?.sunset?.[0] || "",
      pressureDelta3h,
      tempDelta6h,
      hourly: times.slice(idx, idx + 24).map((t, offset) => ({
        time: t,
        temp: hourly.temperature_2m?.[idx + offset],
        rainProb: hourly.precipitation_probability?.[idx + offset],
        wind: hourly.wind_speed_10m?.[idx + offset],
        pressure: hourly.surface_pressure?.[idx + offset]
      }))
    };
  }

  function computeFishingScore(weather, targetFish = "Zander") {
    const c = weather.current;
    const items = [];
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1;

    // 1. Dämmerung
    let dawnPts = 6;
    if ((hour >= 5 && hour <= 8) || (hour >= 16 && hour <= 21)) dawnPts = 14;
    else if (hour >= 22 || hour <= 4) dawnPts = targetFish === "Zander" || targetFish === "Aal" || targetFish === "Wels" ? 13 : 8;
    items.push({ label: "Dämmerung / Tageszeit", pts: dawnPts, max: 14 });

    // 2. Jahreszeit / Monat
    let seasonPts = 10;
    if (month >= 4 && month <= 11) seasonPts = 12;
    if (targetFish === "Forelle" && (month >= 4 && month <= 9)) seasonPts = 13;
    items.push({ label: "Jahreszeit / Monat", pts: seasonPts, max: 13 });

    // 3. Lufttemperatur
    const temp = Number(c.temp ?? 12);
    let tempPts = 8;
    if (temp >= 8 && temp <= 22) tempPts = 12;
    else if (temp >= 3 && temp < 8) tempPts = 9;
    else if (temp < 0 || temp > 30) tempPts = 5;
    items.push({ label: "Lufttemperatur", pts: tempPts, max: 12 });

    // 4. Windstärke
    const wind = Number(c.windSpeed ?? 10);
    let windPts = 10;
    if (wind >= 6 && wind <= 22) windPts = 13;
    else if (wind > 35) windPts = 4;
    else if (wind < 6) windPts = 9;
    items.push({ label: "Windstärke", pts: windPts, max: 13 });

    // 5. Bewölkung
    const cloud = Number(c.cloud ?? 50);
    const cloudPts = cloud >= 35 && cloud <= 90 ? 11 : cloud > 90 ? 9 : 7;
    items.push({ label: "Bewölkung", pts: cloudPts, max: 11 });

    // 6. Niederschlag
    const rain = Number(c.rain ?? 0);
    const rainPts = rain === 0 ? 10 : rain <= 1.5 ? 9 : 5;
    items.push({ label: "Niederschlag", pts: rainPts, max: 10 });

    // 7. Luftdruckänderung über 3h
    const dp = Math.abs(weather.pressureDelta3h || 0);
    const dpPts = dp <= 1.5 ? 10 : dp <= 3.5 ? 7 : 4;
    items.push({ label: "Luftdruckänderung (3 Std.)", pts: dpPts, max: 10 });

    // 8. Luftdruckniveau
    const p = Number(c.pressure ?? 1013);
    const pPts = p >= 1005 && p <= 1022 ? 9 : 6;
    items.push({ label: "Luftdruckniveau", pts: pPts, max: 9 });

    // 9. Temperaturwechsel über 6h
    const dt = Math.abs(weather.tempDelta6h || 0);
    const dtPts = dt <= 4 ? 8 : 5;
    items.push({ label: "Temperaturwechsel (6 Std.)", pts: dtPts, max: 8 });

    const total = Math.min(100, items.reduce((sum, x) => sum + x.pts, 0));
    let verdict = "Mäßige Bedingungen";
    if (total >= 78) verdict = "Günstige Bedingungen";
    else if (total >= 62) verdict = "Ordentliche Bedingungen";
    else if (total < 48) verdict = "Schwierige Bedingungen";

    return { total, verdict, items };
  }

  async function fetchWaterLevels(lat, lon, radiusKm = 25) {
    const url = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?latitude=${lat}&longitude=${lon}&radius=${radiusKm}&includeTimeseries=true&includeCurrentMeasurement=true`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const list = await res.json();
    return list
      .map((s) => ({
        name: s.longname || s.shortname,
        water: s.water?.longname || s.water?.shortname || "",
        distKm: s.latitude && s.longitude ? haversineKm(lat, lon, s.latitude, s.longitude) : null,
        measurement: s.timeseries?.[0]?.currentMeasurement || null,
        unit: s.timeseries?.[0]?.unit || "cm"
      }))
      .sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999))
      .slice(0, 6);
  }

  const FISH_TAXON_KEYS = [1153, 587, 1313, 708, 548, 495, 549, 588, 538, 1067];

  async function queryGbifFishBox(lat, lon, radiusKm) {
    const dLat = radiusKm / 111.32;
    const dLon = radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    const minLat = (lat - dLat).toFixed(4);
    const maxLat = (lat + dLat).toFixed(4);
    const minLon = (lon - dLon).toFixed(4);
    const maxLon = (lon + dLon).toFixed(4);

    const taxonParams = FISH_TAXON_KEYS.map((k) => `taxonKey=${k}`).join("&");
    const url = `https://api.gbif.org/v1/occurrence/search?${taxonParams}&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLon},${maxLon}&limit=250`;
    const res = await fetch(url);
    if (!res.ok) return { total: 0, species: [] };
    const data = await res.json();
    const counts = new Map();
    const meta = new Map();
    let fishTotal = 0;

    for (const occ of data.results || []) {
      const name = occ.species || occ.canonicalName || occ.scientificName;
      if (!name) continue;
      fishTotal += 1;
      counts.set(name, (counts.get(name) || 0) + 1);
      if (!meta.has(name)) {
        meta.set(name, { order: occ.order || "", family: occ.family || "" });
      }
    }
    const species = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({
        name,
        count,
        order: meta.get(name)?.order || "",
        family: meta.get(name)?.family || ""
      }));

    return { total: data.count || fishTotal, species };
  }

  async function fetchFishOccurrences(lat, lon, radiusKm = 5) {
    let res = await queryGbifFishBox(lat, lon, radiusKm);
    let effectiveRadiusKm = radiusKm;
    if (!res.species.length && radiusKm < 15) {
      res = await queryGbifFishBox(lat, lon, 15);
      if (res.species.length) effectiveRadiusKm = 15;
    }
    return { ...res, effectiveRadiusKm };
  }

  const wikiCache = new Map();
  const waterSectionCache = new Map();

  async function fetchWikiSummary(lang, title) {
    const slug = encodeURIComponent(title.replace(/\s+/g, "_"));
    const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${slug}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      image: data.thumbnail?.source || data.originalimage?.source || "",
      extract: data.extract || "",
      pageUrl: data.content_urls?.desktop?.page || ""
    };
  }

  async function fetchFishWikiMedia(titleOrSci, fallbackSci = "") {
    if (!titleOrSci) return null;
    const cacheKey = `${titleOrSci}|${fallbackSci}`;
    if (wikiCache.has(cacheKey)) return wikiCache.get(cacheKey);
    try {
      let info = await fetchWikiSummary("de", titleOrSci);
      if ((!info || !info.image) && fallbackSci && fallbackSci !== titleOrSci) {
        const deSci = await fetchWikiSummary("de", fallbackSci);
        if (deSci?.image) info = deSci;
        else if (!info && deSci) info = deSci;
      }
      if (!info || !info.image) {
        const enInfo = await fetchWikiSummary("en", fallbackSci || titleOrSci);
        if (enInfo) {
          info = {
            image: info?.image || enInfo.image,
            extract: info?.extract || enInfo.extract,
            pageUrl: info?.pageUrl || enInfo.pageUrl
          };
        }
      }
      wikiCache.set(cacheKey, info || null);
      return info || null;
    } catch {
      wikiCache.set(cacheKey, null);
      return null;
    }
  }

  function classifyOsmWater(tags = {}) {
    if (tags.natural === "bay") return "Bucht";
    if (tags.waterway === "canal") return "Kanal";
    if (tags.waterway === "river") return "Flussabschnitt";
    if (tags.waterway === "stream") return "Nebenarm / Bach";
    if (tags.waterway === "lock_gate" || tags.waterway === "weir" || tags.waterway === "dam") return "Schleuse / Wehr";
    if (tags.leisure === "marina" || tags.harbour === "yes") return "Hafen / Marina";
    if (tags.water === "oxbow") return "Altarm";
    if (tags.water === "reservoir") return "Stausee / Becken";
    return "Teilgewässer / See";
  }

  async function fetchWaterSections(lat, lon, waterName = "") {
    const cacheKey = `${String(waterName).trim().toLowerCase()}|${Number(lat).toFixed(3)}|${Number(lon).toFixed(3)}`;
    if (waterSectionCache.has(cacheKey)) return waterSectionCache.get(cacheKey);
    const seen = new Map();
    const addSection = (name, type, sLat, sLon, source = "OpenStreetMap") => {
      if (!name) return;
      const distKm = haversineKm(lat, lon, sLat, sLon);
      const prev = seen.get(name);
      if (!prev || distKm < prev.distKm) {
        seen.set(name, {
          name,
          type,
          lat: +Number(sLat).toFixed(5),
          lon: +Number(sLon).toFixed(5),
          distKm,
          source
        });
      }
    };

    // 1. Bekannte deutsche Gewässer-Teilabschnitte prüfen
    const knownWaters = window.STERNI_DATA?.KNOWN_WATER_SECTIONS || {};
    const nameWords = waterName.toLowerCase().split(/[^\p{L}\p{N}]+/u);
    for (const [key, list] of Object.entries(knownWaters)) {
      if (nameWords.includes(key) || waterName.toLowerCase().includes(key) || (key === "spree" && nameWords.includes("müggelspree"))) {
        list.forEach((s) => addSection(s.name, s.type, s.lat, s.lon, "Regionale Gewässerdaten"));
      }
    }

    // 2. Weltweite OSM-Suche: benannte Wasserobjekte und Wasserwege im Umfeld.
    if (seen.size === 0) {
      const query = waterName || "waterway";
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=20&accept-language=de&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gewässersuche derzeit nicht erreichbar.");
      const hits = await res.json();
      for (const h of hits) {
        const hClass = h.class || h.category || "";
        if (hClass !== "waterway" && hClass !== "natural" && h.type !== "water") continue;
        const n = h.name || h.display_name?.split(",")[0];
        const type = h.type === "river" ? "Fluss / Abschnitt" : h.type === "canal" ? "Kanal / Abschnitt" : h.type === "reservoir" ? "Stausee / Becken" : h.type === "bay" ? "Bucht / Küste" : "Gewässerbereich";
        addSection(n, type, h.lat, h.lon, "OpenStreetMap / Nominatim");
      }
    }
    const result = [...seen.values()].sort((a, b) => a.distKm - b.distKm);
    waterSectionCache.set(cacheKey, result);
    return result;
  }

  function degToCompass(deg) {
    if (deg == null) return "—";
    const dirs = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  }

  return {
    haversineKm,
    geocodeSearch,
    reverseGeocode,
    fetchWeather,
    computeFishingScore,
    fetchWaterLevels,
    fetchFishOccurrences,
    fetchWaterSections,
    fetchFishWikiMedia,
    degToCompass
  };
})();
