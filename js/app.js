window.STERNI_APP = (() => {
  const KEYS = {
    spots: "sterni_spots_v1",
    journal: "sterni_journal_v1",
    wartung: "sterni_wartung_v1",
    angelnCheck: "sterni_angeln_check_v1",
    equip: "sterni_equip_v1",
    kitchen: "sterni_kitchen_v1",
    treffPosts: "sterni_treff_posts_v1",
    treffName: "sterni_treff_name_v1",
    mapFavs: "sterni_map_favorites_v1",
    quizStats: "sterni_quiz_stats_v1"
  };

  const VALID_VIEWS = [
    "start", "quiz", "anglertreff", "spots", "wissen",
    "angeln", "knoten", "wetter", "navigation", "journal", "wartung", "hinweise", "installation"
  ];

  let toastTimer = null;
  let pendingEquipPhoto = "";
  let pendingTreffPhoto = "";
  let currentWetterPlace = null;
  let wetterGbifKm = 1;
  let wetterFishRequest = 0;
  let wetterMap = null;
  let wetterMarker = null;

  function toast(msg) {
    const el = document.getElementById("app-toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 3400);
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ==================== ROUTING ====================
  function navigateTo(route) {
    const normalized = route === "mitglieder" ? "anglertreff" : route;
    const clean = VALID_VIEWS.includes(normalized) ? normalized : "start";
    document.querySelectorAll(".app-view").forEach((sec) => {
      const isMatch = sec.id === `view-${clean}`;
      sec.hidden = !isMatch;
      sec.classList.toggle("active", isMatch);
    });

    const select = document.getElementById("quick-nav-select");
    if (clean === "start") {
      document.getElementById("tile-weather-input").value = "";
      document.getElementById("wetter-search-input").value = "";
    } else {
      if (select && [...select.options].some((o) => o.value === clean)) {
        select.value = clean;
      }
    }

    if (clean === "spots") window.STERNI_MAPS?.initSpotsMap();
    if (clean === "navigation") window.STERNI_MAPS?.initNavMap();
    if (clean === "wetter") initWetterMap();
    else setWetterMapInteractive(false);

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function handleHash() {
    const hash = (location.hash || "#start").replace("#", "").split("?")[0];
    if (hash === "anglertreff") {
      location.replace(new URL("./anglertreff.html", location.href));
      return;
    }
    if (hash === "anglertreff-lokal") {
      navigateTo("anglertreff");
      const select = document.getElementById("quick-nav-select");
      if (select) select.value = hash;
      return;
    }
    const knowledgeGroup = /^wissen-(rechner|knoten|fische|grundlagen)$/.test(hash)
      ? document.getElementById(hash)
      : null;
    if (knowledgeGroup) {
      navigateTo("wissen");
      requestAnimationFrame(() => knowledgeGroup.scrollIntoView({ block: "start" }));
      return;
    }
    if (hash === "knoten" || hash.startsWith("knoten-kat-") || hash.startsWith("knoten-knot-")) {
      navigateTo("knoten");
      window.STERNI_KNOTS?.route(hash);
      return;
    }
    navigateTo(hash || "start");
  }

  function initRouting() {
    // Ein Quiz-Link muss beim Öffnen und Neuladen dieselbe Ansicht behalten.
    const initialHash = location.hash || "#start";
    const isKnotHash = initialHash === "#knoten" || initialHash.startsWith("#knoten-kat-") || initialHash.startsWith("#knoten-knot-");
    const isKnownView = VALID_VIEWS.includes(initialHash.slice(1));
    if (initialHash !== "#start" && initialHash !== "#quiz" && !isKnownView && !isKnotHash) {
      history.replaceState(null, "", `${location.pathname}${location.search}#start`);
    }
    window.addEventListener("hashchange", handleHash);
    document.getElementById("quick-nav-select")?.addEventListener("change", (e) => {
      location.hash = `#${e.target.value}`;
    });
    handleHash();
  }

  // ==================== SHARE & JOKES ====================
  function initShareAndJokes() {
    document.getElementById("share-app-btn")?.addEventListener("click", async () => {
      const url = location.href.split("#")[0];
      try {
        if (navigator.share) {
          await navigator.share({ title: "Sterni-App · Petri Heil", url });
        } else {
          await navigator.clipboard.writeText(url);
        }
        toast("App-Link kopiert – bereit zum Weitergeben.");
      } catch {
        toast("App-Link bereit: " + url);
      }
    });

    const jokes = window.STERNI_DATA.ANGLERWITZE;
    const todayKey = () => new Intl.DateTimeFormat("sv-SE", {timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const todayJoke = () => window.STERNI_DAILY_JOKES?.[todayKey()] || jokes[jokeIdx];
    const calendarDay = () => {
      const now = new Date();
      return Date.parse(todayKey() + "T00:00:00Z") / 86400000;
    };
    let jokeDay = calendarDay();
    let jokeIdx = jokeDay % jokes.length;
    const jokeEl = document.getElementById("anglerwitz");
    if (jokeEl) jokeEl.textContent = todayJoke();
    document.addEventListener("visibilitychange", () => {
      const day = calendarDay();
      if (document.hidden || day === jokeDay) return;
      jokeDay = day;
      jokeIdx = day % jokes.length;
      if (jokeEl) jokeEl.textContent = todayJoke();
    });

    document.getElementById("next-joke-btn")?.addEventListener("click", () => {
      jokeIdx = (jokeIdx + 1) % jokes.length;
      if (jokeEl) jokeEl.textContent = jokes[jokeIdx];
    });

    // Tile shortcuts
    document.getElementById("tile-weather-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = document.getElementById("tile-weather-input").value.trim();
      location.hash = "#wetter";
      if (q) {
        document.getElementById("wetter-search-input").value = q;
        runWetterSearch(q);
      }
    });

    document.getElementById("tile-tacho-btn")?.addEventListener("click", () => {
      location.hash = "#navigation";
    });
  }

  // ==================== ANGLERTREFF ====================

// --- Service Worker registration (added automatically) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('Service Worker registered with scope:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

  function convertImageFileToWebP(file, maxW = 1024, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Ungültiges Bildformat."));
        img.onload = () => {
          const scale = Math.min(1, maxW / (img.width || maxW));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          const webpUrl = canvas.toDataURL("image/webp", quality);
          if (!webpUrl.startsWith("data:image/webp")) {
            reject(new Error("Browser unterstützt kein WebP-Encoding."));
            return;
          }
          resolve(webpUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function initAnglertreff() {
    const nameInput = document.getElementById("treff-nickname");
    const statusEl = document.getElementById("treff-member-status");
    const savedName = (localStorage.getItem(KEYS.treffName) || "").trim();
    nameInput.value = savedName;
    if (statusEl) {
      statusEl.textContent = savedName ? `Angemeldet als ${savedName}` : "Bitte Namen eingeben zum Registrieren";
    }

    document.getElementById("treff-save-name-btn")?.addEventListener("click", () => {
      const val = nameInput.value.trim();
      if (!val) {
        toast("Bitte einen Mitgliedsnamen eingeben.");
        return;
      }
      localStorage.setItem(KEYS.treffName, val);
      window.STERNI_QUIZ?.addMember?.(val);
      if (statusEl) statusEl.textContent = `Angemeldet als ${val}`;
      toast(`Mitglied „${val}“ angemeldet!`);
    });

    const photoInput = document.getElementById("treff-photo");
    const clearPhotoBtn = document.getElementById("treff-clear-photo-btn");
    const photoInfo = document.getElementById("treff-photo-info");
    const photoPreview = document.getElementById("treff-photo-preview");

    const resetTreffPhoto = () => {
      pendingTreffPhoto = "";
      if (photoInput) photoInput.value = "";
      if (clearPhotoBtn) clearPhotoBtn.hidden = true;
      if (photoInfo) photoInfo.textContent = "";
      if (photoPreview) {
        photoPreview.hidden = true;
        photoPreview.innerHTML = "";
      }
    };

    photoInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const webpUrl = await convertImageFileToWebP(file);
        pendingTreffPhoto = webpUrl;
        const kb = Math.round((webpUrl.length * 3) / 4 / 1024);
        if (photoInfo) photoInfo.textContent = `Umgewandelt in WebP (${kb} KB)`;
        if (clearPhotoBtn) clearPhotoBtn.hidden = false;
        if (photoPreview) {
          photoPreview.hidden = false;
          photoPreview.innerHTML = `<picture class="treff-post-picture"><source srcset="${webpUrl}" type="image/webp"><img src="${webpUrl}" alt="WebP-Vorschau" class="treff-post-img"></picture>`;
        }
        toast("Bild automatisch ins WebP-Format umgewandelt!");
      } catch (err) {
        resetTreffPhoto();
        toast(err?.message || "Bild konnte nicht in WebP umgewandelt werden.");
      }
    });

    clearPhotoBtn?.addEventListener("click", resetTreffPhoto);

    document.getElementById("treff-import-journal-btn")?.addEventListener("click", () => {
      const entries = loadJson(KEYS.journal, []);
      if (!entries.length) {
        toast("Noch kein Eintrag im Fangtagebuch vorhanden.");
        return;
      }
      const last = entries[0];
      document.getElementById("treff-title").value = `${last.count}× ${last.species}${last.length ? ` (bis ${last.length} cm)` : ""}`;
      document.getElementById("treff-water").value = last.water || "";
      document.getElementById("treff-body").value = `Köder/Methode: ${last.bait || "—"}. ${last.notes || ""}`.trim();
      toast("Letzter Tagebucheintrag übernommen.");
    });

    document.getElementById("treff-post-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const author = nameInput.value.trim();
      if (!author) {
        toast("Bitte zuerst oben deinen Mitgliedsnamen eingeben.");
        nameInput.focus();
        return;
      }
      localStorage.setItem(KEYS.treffName, author);
      window.STERNI_QUIZ?.addMember?.(author);
      if (statusEl) statusEl.textContent = `Angemeldet als ${author}`;

      const posts = loadJson(KEYS.treffPosts, window.STERNI_DATA.DEFAULT_TREFF_POSTS);
      posts.unshift({
        id: "post-" + Date.now(),
        author,
        kind: document.getElementById("treff-kind")?.value || "Statusmeldung · Fang",
        title: document.getElementById("treff-title").value.trim(),
        water: document.getElementById("treff-water").value.trim(),
        body: document.getElementById("treff-body").value.trim(),
        photoWebp: pendingTreffPhoto || "",
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: []
      });
      saveJson(KEYS.treffPosts, posts);
      e.target.reset();
      resetTreffPhoto();
      renderTreffFeed();
      toast("Beitrag im Anglertreff veröffentlicht!");
    });

    renderTreffFeed();
  }

  function renderTreffFeed() {
    const feed = document.getElementById("treff-feed");
    const posts = loadJson(KEYS.treffPosts, window.STERNI_DATA.DEFAULT_TREFF_POSTS);
    const badge = document.getElementById("treff-badge");
    if (badge) badge.textContent = `${posts.length} Beiträge`;

    feed.innerHTML = "";
    if (!posts.length) {
      feed.innerHTML = `<div class="panel"><p class="muted" style="margin:0">Noch keine Beiträge im Anglertreff – teile als Erste/r deinen Fang, Fangort oder ein WebP-Bild!</p></div>`;
      return;
    }
    posts.forEach((p, idx) => {
      const card = document.createElement("article");
      card.className = "panel";
      const dateStr = new Date(p.createdAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
      card.innerHTML = `
        <div class="entry-card-head">
          <div>
            <p class="eyebrow" style="margin-bottom:0.15rem"></p>
            <h3 style="margin:0"></h3>
          </div>
          <div class="action-row" style="margin:0">
            ${p.kind ? `<span class="pill-tag"></span>` : ""}
            <span class="small-meta muted">${dateStr}</span>
          </div>
        </div>
        <p class="post-body" style="margin:0.5rem 0"></p>
        ${p.photoWebp ? `<picture class="treff-post-picture"><source srcset="${p.photoWebp}" type="image/webp"><img src="${p.photoWebp}" alt="Fangfoto (WebP)" class="treff-post-img"></picture>` : ""}
        <div class="action-row">
          <button type="button" class="btn-outline btn-xs like-btn">Petri Heil! (${p.likes || 0})</button>
        </div>
        <div class="comments-wrap stack-list" style="margin-top:0.5rem"></div>
        <form class="search-row comment-form" style="margin-top:0.65rem">
          <input type="text" placeholder="Kommentar schreiben …" required>
          <button type="submit" class="btn-outline btn-xs">Kommentieren</button>
        </form>
      `;
      card.querySelector(".eyebrow").textContent = `${p.author}${p.water ? ` · ${p.water}` : ""}`;
      card.querySelector("h3").textContent = p.title;
      if (p.kind) card.querySelector(".pill-tag").textContent = p.kind;
      card.querySelector(".post-body").textContent = p.body;
      const imgEl = card.querySelector(".treff-post-img");
      if (imgEl) {
        imgEl.addEventListener("click", () => {
          openLightbox(p.title, `<picture><source srcset="${p.photoWebp}" type="image/webp"><img src="${p.photoWebp}" alt="${p.title}" style="width:100%;max-height:70vh;object-fit:contain"></picture><p style="margin-top:0.6rem">${p.body}</p>`);
        });
      }

      card.querySelector(".like-btn").addEventListener("click", () => {
        const list = loadJson(KEYS.treffPosts, window.STERNI_DATA.DEFAULT_TREFF_POSTS);
        list[idx].likes = (list[idx].likes || 0) + 1;
        saveJson(KEYS.treffPosts, list);
        renderTreffFeed();
      });

      const cWrap = card.querySelector(".comments-wrap");
      (p.comments || []).forEach((c) => {
        const div = document.createElement("div");
        div.className = "entry-card small-meta";
        div.innerHTML = `<strong></strong>: <span></span>`;
        div.querySelector("strong").textContent = c.author;
        div.querySelector("span").textContent = c.text;
        cWrap.appendChild(div);
      });

      card.querySelector(".comment-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const input = e.target.querySelector("input");
        const text = input.value.trim();
        if (!text) return;
        const list = loadJson(KEYS.treffPosts, window.STERNI_DATA.DEFAULT_TREFF_POSTS);
        list[idx].comments = list[idx].comments || [];
        list[idx].comments.push({
          author: localStorage.getItem(KEYS.treffName) || "Petri-Freund",
          text
        });
        saveJson(KEYS.treffPosts, list);
        renderTreffFeed();
      });

      feed.appendChild(card);
    });
  }

  // ==================== SPOTS & ODER PROFILE ====================
  const FISH_IMAGE_URLS = {
    "Zander": "assets/fish/zander.jpg",
    "Barsch": "assets/fish/barsch.jpg",
    "Hecht": "assets/fish/hecht.jpg",
    "Karpfen": "assets/fish/karpfen.jpg",
    "Brasse": "assets/fish/brasse.jpg",
    "Aal": "assets/fish/aal.jpg",
    "Forelle": "assets/fish/forelle.jpg",
    "Wels": "assets/fish/wels.jpg",
    "Rotfeder": "assets/fish/rotfeder.jpg",
    "Rotauge": "assets/fish/rotauge.jpg",
    "Schleie": "assets/fish/schleie.jpg",
    "Döbel": "assets/fish/doebel.jpg",
    "Nase": "assets/fish/nase.jpg",
    "Rapfen": "assets/fish/rapfen.jpg",
    "Quappe": "assets/fish/quappe.jpg",
    "Stör": "assets/fish/stoer.jpg",
    "Äsche": "assets/fish/aesche.jpg",
  };

  function makeFishSvg(name, size = "small") {
    const large = size === "large";
    return `<svg viewBox="0 0 220 100" width="${large ? 260 : 120}" height="${large ? 120 : 56}" fill="none" stroke="#ff6265" stroke-width="${large ? 3 : 2.2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 50c27-29 86-34 132-12l36-19-10 31 10 31-36-19C104 84 45 79 18 50Z" fill="#23191d"/>
      <path d="M72 27l24-19 20 18M112 73l18 15 17-21"/>
      <path d="M139 37q-18 13 0 26M45 39q14 11 0 22" stroke="#ff9193" opacity=".8"/>
      <circle cx="50" cy="44" r="3.5" fill="#f2f2ef" stroke="none"/>
      <text x="110" y="96" text-anchor="middle" fill="#d7d2d6" stroke="none" font-size="${large ? 12 : 8}">${name}</text>
    </svg>`;
  }

  function openLightbox(title, htmlContent) {
    const dlg = document.getElementById("lightbox-dialog");
    document.getElementById("lightbox-title").textContent = title;
    document.getElementById("lightbox-body").innerHTML = htmlContent;
    dlg.showModal();
  }

  function initSpots() {
    const grid = document.getElementById("oder-fish-grid");
    window.STERNI_DATA.ODER_PROFILE.fish.forEach((f) => {
      const card = document.createElement("div");
      card.className = "fish-card";
      card.innerHTML = `
        <div class="fish-card-thumb">${makeFishSvg(f.name)}</div>
        <strong>${f.name}</strong>
        <span class="small-meta muted">${f.latin}</span>
        <span class="small-meta">${f.info}</span>
        <button type="button" class="btn-ghost btn-xs">Details vergrößern</button>
      `;
      card.querySelector("button").addEventListener("click", () => {
        openLightbox(
          f.name,
          `<div style="text-align:center;margin-bottom:0.75rem">${makeFishSvg(f.name)}</div>
           <p><strong>Lateinisch:</strong> ${f.latin}</p>
           <p><strong>Typische Standplätze an der Oder:</strong> ${f.info}</p>`
        );
      });
      grid.appendChild(card);
    });

    const targetSel = document.getElementById("oder-target-fish");
    const renderHints = () => {
      const h = window.STERNI_DATA.ODER_PROFILE.hints[targetSel.value];
      document.getElementById("oder-hints-grid").innerHTML = `
        <div class="metric-box"><span class="metric-label">Typische Angelzeiten</span><p class="small-meta" style="margin:0.35rem 0 0">${h.times}</p></div>
        <div class="metric-box"><span class="metric-label">Köder &amp; Methode</span><p class="small-meta" style="margin:0.35rem 0 0">${h.baits}</p></div>
        <div class="metric-box"><span class="metric-label">Worauf du achten kannst</span><p class="small-meta" style="margin:0.35rem 0 0">${h.watch}</p></div>
      `;
    };
    targetSel.addEventListener("change", renderHints);
    renderHints();

    document.getElementById("adopt-oder-btn")?.addEventListener("click", () => {
      document.getElementById("spot-name").value = "Oder-Buhne Eisenhüttenstadt";
      document.getElementById("spot-water-input").value = "Oder bei Eisenhüttenstadt";
      document.getElementById("spot-target-input").value = targetSel.value;
      document.getElementById("spot-place-input").value = "Eisenhüttenstadt";
      document.getElementById("spot-name").focus();
      toast("Gewässerdaten in das Spot-Formular übernommen.");
    });

    document.getElementById("load-oder-daylight-btn")?.addEventListener("click", async () => {
      const out = document.getElementById("oder-daylight-output");
      out.textContent = "Lade Tageslicht …";
      try {
        const w = await window.STERNI_API.fetchWeather(52.145, 14.668);
        const sr = w.sunrise ? w.sunrise.slice(11, 16) : "—";
        const ss = w.sunset ? w.sunset.slice(11, 16) : "—";
        const today = new Date().toLocaleDateString("de-DE");
        out.textContent = `${today} · Sonnenaufgang ${sr} Uhr · Sonnenuntergang ${ss} Uhr (Ortszeit)`;
      } catch {
        out.textContent = "Tageslichtdaten derzeit nicht abrufbar.";
      }
    });

    document.getElementById("spot-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const spots = loadJson(KEYS.spots, []);
      spots.unshift({
        id: "spot-" + Date.now(),
        name: document.getElementById("spot-name").value.trim(),
        water: document.getElementById("spot-water-input").value.trim(),
        target: document.getElementById("spot-target-input").value.trim(),
        place: document.getElementById("spot-place-input").value.trim(),
        notes: document.getElementById("spot-notes-input").value.trim()
      });
      saveJson(KEYS.spots, spots);
      e.target.reset();
      renderSavedSpots();
      syncWaterDatalist();
      toast("Angelspot gespeichert!");
    });

    renderSavedSpots();
  }

  function renderSavedSpots() {
    const list = document.getElementById("saved-spots-list");
    const spots = loadJson(KEYS.spots, []);
    if (!spots.length) {
      list.innerHTML = `<p class="muted small-meta">Noch keine eigenen Angelplätze gespeichert.</p>`;
      return;
    }
    list.innerHTML = "";
    spots.forEach((s, idx) => {
      const card = document.createElement("div");
      card.className = "entry-card";
      card.innerHTML = `
        <div class="entry-card-head">
          <div><strong></strong><div class="small-meta muted"></div></div>
          <button type="button" class="btn-ghost btn-xs">Entfernen</button>
        </div>
        <p class="small-meta" style="margin:0.25rem 0 0"></p>
      `;
      card.querySelector("strong").textContent = s.name;
      card.querySelector(".muted").textContent = [s.water, s.place, s.target ? `Zielfisch: ${s.target}` : ""].filter(Boolean).join(" · ");
      card.querySelector("p").textContent = s.notes || "";
      card.querySelector("button").addEventListener("click", () => {
        const next = loadJson(KEYS.spots, []);
        next.splice(idx, 1);
        saveJson(KEYS.spots, next);
        renderSavedSpots();
        syncWaterDatalist();
      });
      list.appendChild(card);
    });
  }

  // ==================== WISSENSWERTES ====================
  function initWissen() {
    // Knoten gehören ausschließlich ins Angelknoten-Lexikon, nicht in Wissenswertes.
    document.getElementById("wissen-knoten")?.remove();
    // 1. Schnur-Rechner
    const lineInputs = ["line-cap-len", "line-cap-dia", "line-main-dia", "line-main-len", "line-backing-dia"];
    const calcLine = () => {
      const L1 = Number(document.getElementById("line-cap-len").value) || 0;
      const d1 = Number(document.getElementById("line-cap-dia").value) || 0.1;
      const d2 = Number(document.getElementById("line-main-dia").value) || 0.1;
      const Lmain = Number(document.getElementById("line-main-len").value) || 0;
      const dBack = Number(document.getElementById("line-backing-dia").value) || 0.1;

      const capNew = (L1 * d1 * d1) / (d2 * d2);
      const remVol = Math.max(0, L1 * d1 * d1 - Lmain * d2 * d2);
      const backingLen = remVol / (dBack * dBack);

      document.getElementById("line-calc-result").textContent =
        `Rechnerische Kapazität: ca. ${Math.round(capNew)} m. Für ${Lmain} m Hauptschnur: ca. ${backingLen.toFixed(1).replace(".", ",")} m Unterschnur.`;
    };
    lineInputs.forEach((id) => document.getElementById(id)?.addEventListener("input", calcLine));
    calcLine();

    // 2. Sprit & Reichweite
    const fuelInputs = ["fuel-tank", "fuel-reserve", "fuel-rate", "fuel-speed"];
    const calcFuel = () => {
      const tank = Number(document.getElementById("fuel-tank").value) || 0;
      const res = Number(document.getElementById("fuel-reserve").value) || 0;
      const rate = Math.max(0.1, Number(document.getElementById("fuel-rate").value) || 1);
      const speed = Number(document.getElementById("fuel-speed").value) || 0;

      const usable = Math.max(0, tank - res);
      const hours = usable / rate;
      const totalKm = hours * speed;
      const nm = totalKm / 1.852;
      const oneWay = totalKm / 2;

      document.getElementById("fuel-calc-result").textContent =
        `Mit Reserveabzug: ca. ${hours.toFixed(1).replace(".", ",")} Stunden und ${Math.round(totalKm)} km Gesamtstrecke (${nm.toFixed(1).replace(".", ",")} sm). Für Hin- und Rückweg unter gleichen Bedingungen höchstens ca. ${oneWay.toFixed(1).replace(".", ",")} km einfache Strecke.`;
    };
    fuelInputs.forEach((id) => document.getElementById(id)?.addEventListener("input", calcFuel));
    calcFuel();

    // 3. Fehlersuche
    const symptomSel = document.getElementById("trouble-symptom");
    const renderTrouble = () => {
      const steps = window.STERNI_DATA.TROUBLESHOOT_GUIDES[symptomSel.value] || [];
      document.getElementById("trouble-steps").innerHTML = steps.map((s) => `<li>${s}</li>`).join("");
    };
    symptomSel?.addEventListener("change", renderTrouble);
    renderTrouble();

    // 4. Geräte & Ersatzteile (mit Canvas-Bildverkleinerung)
    document.getElementById("equip-photo")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 480;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          pendingEquipPhoto = canvas.toDataURL("image/jpeg", 0.78);
          toast("Typenschildfoto lokal vorbereitet.");
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("equip-clear-photo-btn")?.addEventListener("click", () => {
      pendingEquipPhoto = "";
      document.getElementById("equip-photo").value = "";
      toast("Fotoauswahl entfernt.");
    });

    document.getElementById("equip-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const list = loadJson(KEYS.equip, []);
      list.unshift({
        name: document.getElementById("equip-name").value.trim(),
        model: document.getElementById("equip-model").value.trim(),
        serial: document.getElementById("equip-serial").value.trim(),
        parts: document.getElementById("equip-parts").value.trim(),
        link: document.getElementById("equip-link").value.trim(),
        notes: document.getElementById("equip-notes").value.trim(),
        photo: pendingEquipPhoto
      });
      saveJson(KEYS.equip, list);
      pendingEquipPhoto = "";
      e.target.reset();
      renderEquipList();
      toast("Gerät in Gerätemappe gespeichert.");
    });
    renderEquipList();

    // 5. Fischküche & Salzlake
    const calcBrine = () => {
      const w = Number(document.getElementById("brine-water").value) || 0;
      const s = Number(document.getElementById("brine-salt").value) || 0;
      document.getElementById("brine-calc-result").textContent =
        `Für ${w} Liter Wasser brauchst du ${Math.round(w * s)} g Salz.`;
    };
    document.getElementById("brine-water")?.addEventListener("input", calcBrine);
    document.getElementById("brine-salt")?.addEventListener("input", calcBrine);
    calcBrine();

    document.getElementById("kitchen-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const list = loadJson(KEYS.kitchen, []);
      list.unshift({
        title: document.getElementById("kitchen-title").value.trim(),
        body: document.getElementById("kitchen-body").value.trim()
      });
      saveJson(KEYS.kitchen, list);
      e.target.reset();
      renderKitchenList();
      toast("Küchennotiz gespeichert.");
    });
    renderKitchenList();

    // Praxis, Knoten, Fische, Grundlagen
    const praxisWrap = document.getElementById("wissen-praxis-list");
    window.STERNI_DATA.PRAXIS_GUIDES.forEach((g) => {
      const d = document.createElement("details");
      d.className = "wissen-item";
      d.dataset.search = `${g.title} ${g.body}`.toLowerCase();
      d.innerHTML = `<summary>${g.title}</summary><div class="details-body"><p>${g.body}</p></div>`;
      praxisWrap.appendChild(d);
    });

    const fishWrap = document.getElementById("wissen-fish-list");
    window.STERNI_DATA.FISH_GUIDE_DATA.forEach((f) => {
      const d = document.createElement("details");
      d.className = "wissen-item";
      d.dataset.search = `${f.name} ${f.method} ${f.bait} ${f.tip}`.toLowerCase();
      const photoUrl = FISH_IMAGE_URLS[f.name] || "";
      const photoMarkup = photoUrl
        ? `<img class="wissen-fish-photo" src="${photoUrl}" alt="${f.name}">`
        : `<div class="wissen-fish-fallback">${makeFishSvg(f.name, "large")}</div>`;
      d.innerHTML = `
        <summary>${f.name}</summary>
        <div class="details-body">
          <div class="wissen-fish-visual" role="img" aria-label="Bild von ${f.name}">
            ${photoMarkup}
          </div>
          <p class="small-meta muted">${photoUrl ? "Fischfoto aus Wikimedia Commons; Bildnachweis siehe assets/fish/credits.json." : "Illustrative lokale Darstellung; typische Merkmale können je nach Alter und Gewässer variieren."}</p>
          <p><strong>Methode:</strong> ${f.method}</p>
          <p><strong>Köder:</strong> ${f.bait}</p>
          <p><strong>Praxis-Tipp:</strong> ${f.tip}</p>
        </div>
      `;
      fishWrap.appendChild(d);
    });

    const basicsWrap = document.getElementById("wissen-basics-list");
    window.STERNI_DATA.GRUNDLAGEN_GUIDES.forEach((g) => {
      const d = document.createElement("details");
      d.className = "wissen-item";
      d.dataset.search = `${g.title} ${g.body}`.toLowerCase();
      d.innerHTML = `<summary>${g.title}</summary><div class="details-body"><p>${g.body}</p></div>`;
      basicsWrap.appendChild(d);
    });

    // Live Full-Text Search
    const searchInput = document.getElementById("wissen-search");
    const countEl = document.getElementById("wissen-search-count");
    searchInput?.addEventListener("input", () => {
      const term = searchInput.value.trim().toLowerCase();
      const items = [...document.querySelectorAll("#view-wissen details.wissen-item")];
      let visible = 0;
      items.forEach((item) => {
        const text = (item.dataset.search || item.textContent).toLowerCase();
        const match = !term || text.includes(term);
        item.hidden = !match;
        if (match) visible += 1;
      });
      countEl.textContent = term ? `${visible} passende Themen.` : "";
    });
  }

  function renderEquipList() {
    const el = document.getElementById("equip-list");
    const list = loadJson(KEYS.equip, []);
    el.innerHTML = "";
    list.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "entry-card";
      card.innerHTML = `
        <div class="entry-card-head">
          <div><strong></strong><div class="small-meta muted"></div></div>
          <button type="button" class="btn-ghost btn-xs">Entfernen</button>
        </div>
        <p class="small-meta" style="margin:0.2rem 0"></p>
      `;
      card.querySelector("strong").textContent = item.name;
      card.querySelector(".muted").textContent = [item.model, item.serial ? `SN: ${item.serial}` : ""].filter(Boolean).join(" · ");
      card.querySelector("p").textContent = [item.parts ? `Teile: ${item.parts}` : "", item.notes].filter(Boolean).join(" · ");
      if (item.link) {
        const a = document.createElement("a");
        a.href = item.link;
        a.target = "_blank";
        a.rel = "noopener";
        a.className = "small-meta";
        a.textContent = "Anleitung öffnen ↗";
        card.appendChild(a);
      }
      if (item.photo) {
        const img = document.createElement("img");
        img.src = item.photo;
        img.alt = `Typenschild ${item.name}`;
        img.className = "equip-thumb";
        card.appendChild(img);
      }
      card.querySelector("button").addEventListener("click", () => {
        const next = loadJson(KEYS.equip, []);
        next.splice(idx, 1);
        saveJson(KEYS.equip, next);
        renderEquipList();
      });
      el.appendChild(card);
    });
  }

  function renderKitchenList() {
    const el = document.getElementById("kitchen-list");
    const list = loadJson(KEYS.kitchen, []);
    el.innerHTML = "";
    list.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "entry-card";
      card.innerHTML = `
        <div class="entry-card-head"><strong></strong><button type="button" class="btn-ghost btn-xs">✕</button></div>
        <p class="small-meta" style="margin:0.2rem 0 0"></p>
      `;
      card.querySelector("strong").textContent = item.title;
      card.querySelector("p").textContent = item.body;
      card.querySelector("button").addEventListener("click", () => {
        const next = loadJson(KEYS.kitchen, []);
        next.splice(idx, 1);
        saveJson(KEYS.kitchen, next);
        renderKitchenList();
      });
      el.appendChild(card);
    });
  }

  // ==================== CHECKLISTS (IN-PLACE TOGGLE) ====================
  function setupChecklist(listId, counterId, progressId, resetBtnId, storageKey, items) {
    const ul = document.getElementById(listId);
    const counter = document.getElementById(counterId);
    const bar = document.getElementById(progressId);
    let checked = loadJson(storageKey, items.map(() => false));

    const updateProgress = () => {
      const done = checked.filter(Boolean).length;
      counter.textContent = `${done} / ${items.length} Vorbereitungen erledigt`;
      bar.style.width = `${Math.round((done / items.length) * 100)}%`;
    };

    ul.innerHTML = "";
    items.forEach((text, idx) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      label.className = "checklist-item" + (checked[idx] ? " done" : "");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!checked[idx];
      const span = document.createElement("span");
      span.textContent = text;

      cb.addEventListener("change", () => {
        checked[idx] = cb.checked;
        label.classList.toggle("done", cb.checked);
        saveJson(storageKey, checked);
        updateProgress();
      });

      label.append(cb, span);
      li.appendChild(label);
      ul.appendChild(li);
    });
    updateProgress();

    document.getElementById(resetBtnId)?.addEventListener("click", () => {
      checked = items.map(() => false);
      saveJson(storageKey, checked);
      ul.querySelectorAll("input[type='checkbox']").forEach((cb) => {
        cb.checked = false;
        cb.closest(".checklist-item")?.classList.remove("done");
      });
      updateProgress();
      toast("Checkliste für den nächsten Trip zurückgesetzt.");
    });
  }

  // ==================== WETTER & FISCH ====================
  const GERMAN_FISHING_SPOTS = [
    { name: "Oder bei Eisenhüttenstadt", lat: 52.145, lon: 14.668, state: "Brandenburg", type: "Fluss" },
    { name: "Müritz", lat: 53.42, lon: 12.69, state: "Mecklenburg-Vorpommern", type: "See" },
    { name: "Großer Plöner See", lat: 54.133, lon: 10.417, state: "Schleswig-Holstein", type: "See" },
    { name: "Boddengewässer Rügen", lat: 54.45, lon: 13.38, state: "Mecklenburg-Vorpommern", type: "Küste & Bodden" },
    { name: "Fehmarn (Ostsee)", lat: 54.438, lon: 11.196, state: "Schleswig-Holstein", type: "Ostsee" },
    { name: "Peenestrom", lat: 54.05, lon: 13.78, state: "Mecklenburg-Vorpommern", type: "Boddengewässer" },
    { name: "Scharmützelsee", lat: 52.25, lon: 14.05, state: "Brandenburg", type: "See" },
    { name: "Spreewald (Lübbenau)", lat: 51.867, lon: 13.964, state: "Brandenburg", type: "Fluss & Fließe" },
    { name: "Elbe bei Magdeburg", lat: 52.13, lon: 11.64, state: "Sachsen-Anhalt", type: "Fluss" },
    { name: "Weser bei Bremen", lat: 53.079, lon: 8.801, state: "Bremen", type: "Fluss" },
    { name: "Steinhuder Meer", lat: 52.467, lon: 9.333, state: "Niedersachsen", type: "See" },
    { name: "Edersee", lat: 51.183, lon: 9.0, state: "Hessen", type: "Stausee" },
    { name: "Möhnesee", lat: 51.49, lon: 8.06, state: "Nordrhein-Westfalen", type: "Stausee" },
    { name: "Biggesee", lat: 51.09, lon: 7.85, state: "Nordrhein-Westfalen", type: "Stausee" },
    { name: "Rhein bei Köln", lat: 50.938, lon: 6.96, state: "Nordrhein-Westfalen", type: "Fluss" },
    { name: "Mosel bei Cochem", lat: 50.145, lon: 7.167, state: "Rheinland-Pfalz", type: "Fluss" },
    { name: "Main bei Würzburg", lat: 49.791, lon: 9.93, state: "Bayern", type: "Fluss" },
    { name: "Donau bei Regensburg", lat: 49.019, lon: 12.101, state: "Bayern", type: "Fluss" },
    { name: "Chiemsee", lat: 47.883, lon: 12.467, state: "Bayern", type: "See" },
    { name: "Bodensee (Konstanz)", lat: 47.66, lon: 9.175, state: "Baden-Württemberg", type: "See" }
  ];

  function initWetterMap() {
    if (wetterMap) {
      setTimeout(() => wetterMap.invalidateSize(), 120);
      return;
    }
    const container = document.getElementById("wetter-map");
    if (!container || typeof L === "undefined") return;

    wetterMap = L.map(container, {
      minZoom: 3,
      maxZoom: 18,
      scrollWheelZoom: false
    }).setView([51.1657, 10.4515], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(wetterMap);

    // Anklickbare bekannte Angelgewässer in ganz Deutschland
    GERMAN_FISHING_SPOTS.forEach((spot) => {
      const m = L.circleMarker([spot.lat, spot.lon], {
        radius: 7,
        color: "#ff4549",
        weight: 2,
        fillColor: "#ff4549",
        fillOpacity: 0.72
      }).addTo(wetterMap);
      m.bindTooltip(`${spot.name} (${spot.type})`, { direction: "top" });
      m.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        document.getElementById("wetter-search-input").value = spot.name;
        document.getElementById("wetter-disambig").hidden = true;
        selectWetterPlace({
          name: spot.name,
          display_name: `${spot.name}, ${spot.state}`,
          type: spot.type,
          address: { state: spot.state },
          lat: spot.lat,
          lon: spot.lon
        });
        toast(`Angelort „${spot.name}“ übernommen.`);
      });
    });

    // Beliebige Position auf der Deutschlandkarte anklicken
    wetterMap.on("click", async (e) => {
      const lat = +e.latlng.lat.toFixed(5);
      const lon = +e.latlng.lng.toFixed(5);
      let name = `Kartenposition (${lat.toFixed(3)}° N, ${lon.toFixed(3)}° O)`;
      let displayName = name;
      let type = "Kartenposition";
      let state = "";

      try {
        const rev = await window.STERNI_API.reverseGeocode(lat, lon);
        if (rev) {
          const addr = rev.address || {};
          name = rev.name || addr.water || addr.river || addr.lake || addr.town || addr.village || addr.city || addr.county || name;
          displayName = rev.display_name || name;
          type = rev.type || rev.category || "Gewässer / Ort";
          state = addr.state || "";
        }
      } catch {
        // Fallback to coordinate label
      }

      document.getElementById("wetter-search-input").value = name;
      document.getElementById("wetter-disambig").hidden = true;
      await selectWetterPlace({
        name,
        display_name: displayName,
        type,
        address: { state },
        lat,
        lon
      });
      toast(`Angelort „${name}“ übernommen.`);
    });

    document.getElementById("wetter-map-reset-btn")?.addEventListener("click", () => {
      wetterMap?.setView([51.1657, 10.4515], 6);
    });

    setTimeout(() => wetterMap?.invalidateSize(), 150);
  }

  function setWetterMapInteractive(active) {
    const container = document.getElementById("wetter-map");
    const toggle = document.getElementById("wetter-map-toggle-btn");
    container.inert = !active;
    toggle.textContent = active ? "Karte sperren und weiterscrollen" : "Karte aktivieren";
  }

  function initWetter() {
    document.getElementById("wetter-map-toggle-btn").addEventListener("click", () => {
      if (wetterMap) setWetterMapInteractive(document.getElementById("wetter-map").inert);
    });
    document.getElementById("wetter-search-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = document.getElementById("wetter-search-input").value.trim();
      if (q) runWetterSearch(q);
    });

    document.getElementById("wetter-gbif-radii")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-km]");
      if (!btn || !currentWetterPlace) return;
      wetterGbifKm = Number(btn.dataset.km);
      document.querySelectorAll("#wetter-gbif-radii button").forEach((b) => b.classList.toggle("active", b === btn));
      loadWetterGbif();
    });

    document.getElementById("wetter-open-on-map-btn")?.addEventListener("click", () => {
      if (!currentWetterPlace) return;
      location.hash = "#spots";
      setTimeout(() => {
        window.STERNI_MAPS?.selectSpotCoords(
          currentWetterPlace.lat,
          currentWetterPlace.lon,
          currentWetterPlace.name,
          currentWetterPlace.state || ""
        );
      }, 150);
    });
  }

  async function runWetterSearch(query) {
    setWetterMapInteractive(false);
    const disambig = document.getElementById("wetter-disambig");
    disambig.hidden = false;
    disambig.innerHTML = `<div class="disambig-item">Suche „${query}“ …</div>`;

    try {
      const hits = await window.STERNI_API.geocodeSearch(query);
      if (!hits.length) {
        disambig.innerHTML = `<div class="disambig-item">Kein passendes Gewässer oder Ort gefunden.</div>`;
        return;
      }
      if (hits.length === 1) {
        disambig.hidden = true;
        selectWetterPlace(hits[0]);
        return;
      }
      disambig.innerHTML = "";
      hits.forEach((h) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "disambig-item";
        btn.textContent = h.display_name;
        btn.addEventListener("click", () => {
          disambig.hidden = true;
          selectWetterPlace(h);
        });
        disambig.appendChild(btn);
      });
    } catch {
      disambig.innerHTML = `<div class="disambig-item">Fehler bei der Ortssuche.</div>`;
    }
  }

  async function selectWetterPlace(hit) {
    currentWetterPlace = {
      name: hit.name || hit.display_name.split(",")[0],
      full: hit.display_name,
      type: hit.type || hit.class || "Gewässer / Ort",
      state: hit.address?.state || "",
      lat: Number(hit.lat),
      lon: Number(hit.lon)
    };

    document.getElementById("wetter-results").hidden = false;
    document.getElementById("wetter-place-type").textContent = currentWetterPlace.type.toUpperCase();
    document.getElementById("wetter-place-name").textContent = currentWetterPlace.name;
    document.getElementById("wetter-coords-meta").textContent =
      `${currentWetterPlace.full} (${currentWetterPlace.lat.toFixed(4)}° N, ${currentWetterPlace.lon.toFixed(4)}° O)`;

    if (wetterMap) {
      if (!wetterMarker) {
        wetterMarker = L.marker([currentWetterPlace.lat, currentWetterPlace.lon]).addTo(wetterMap);
      } else {
        wetterMarker.setLatLng([currentWetterPlace.lat, currentWetterPlace.lon]);
      }
      wetterMarker.bindPopup(`<strong>${currentWetterPlace.name}</strong>`).openPopup();
      const targetZoom = Math.max(wetterMap.getZoom(), 11);
      wetterMap.setView([currentWetterPlace.lat, currentWetterPlace.lon], targetZoom);
    }

    const metrics = document.getElementById("wetter-metrics");
    metrics.innerHTML = `<div class="metric-box"><span class="metric-label">Status</span><strong>Lade Daten …</strong></div>`;

    try {
      const [w, levels] = await Promise.all([
        window.STERNI_API.fetchWeather(currentWetterPlace.lat, currentWetterPlace.lon),
        window.STERNI_API.fetchWaterLevels(currentWetterPlace.lat, currentWetterPlace.lon, 25).catch(() => [])
      ]);
      const c = w.current;
      const topLevel = levels[0]?.measurement ? `${levels[0].measurement.value} ${levels[0].unit}` : "Kein Pegel <25 km";
      const levelSub = levels[0] ? `${levels[0].name}` : "PEGELONLINE";

      metrics.innerHTML = `
        <div class="metric-box"><span class="metric-label">Temperatur</span><strong class="metric-val">${c.temp} °C</strong><span class="small-meta muted">Gefühlt ${c.apparent} °C</span></div>
        <div class="metric-box"><span class="metric-label">Wind</span><strong class="metric-val">${c.windSpeed} km/h</strong><span class="small-meta muted">${window.STERNI_API.degToCompass(c.windDir)} · Böen ${c.gusts} km/h</span></div>
        <div class="metric-box"><span class="metric-label">Niederschlag</span><strong class="metric-val">${c.rain} mm</strong><span class="small-meta muted">Druck ${c.pressure} hPa</span></div>
        <div class="metric-box"><span class="metric-label">Wasserstand</span><strong class="metric-val" style="font-size:1.3rem">${topLevel}</strong><span class="small-meta muted">${levelSub}</span></div>
      `;

      const sr = w.sunrise ? w.sunrise.slice(11, 16) : "—";
      const ss = w.sunset ? w.sunset.slice(11, 16) : "—";
      document.getElementById("wetter-daylight").innerHTML = `
        <span>↑ Sonnenaufgang: <strong>${sr} Uhr</strong></span>
        <span>↓ Sonnenuntergang: <strong>${ss} Uhr</strong></span>
        <span>Luftdruck-Trend (3h): <strong>${w.pressureDelta3h >= 0 ? "+" : ""}${w.pressureDelta3h} hPa</strong></span>
      `;

      document.getElementById("wetter-hourly-wrap").innerHTML = w.hourly
        .slice(0, 12)
        .map((h) => `
          <div class="hourly-cell">
            <strong>${h.time.slice(11, 16)}</strong>
            <div>${h.temp} °C</div>
            <div class="muted">${h.wind} km/h</div>
            <div class="muted">${h.rainProb ?? 0}% Regen</div>
          </div>
        `)
        .join("");
    } catch {
      metrics.innerHTML = `<div class="metric-box"><span>Wetterdaten konnten nicht geladen werden.</span></div>`;
    }

    loadWetterSections();
    loadWetterGbif();
  }

  async function loadWetterSections() {
    if (!currentWetterPlace) return;
    const place = currentWetterPlace;
    const countEl = document.getElementById("wetter-sections-count");
    const listEl = document.getElementById("wetter-sections-list");
    countEl.textContent = "Suche alle benannten Teilabschnitte im Umkreis …";
    listEl.innerHTML = "";

    try {
      const sections = await window.STERNI_API.fetchWaterSections(
        place.lat,
        place.lon,
        place.name
      );
      if (place !== currentWetterPlace) return;
      if (!sections.length) {
        countEl.textContent = "Keine Teilabschnitte oder weiteren Gewässer gefunden.";
        return;
      }
      countEl.textContent = `${sections.length} Einträge · Tippen lädt Wetter & Fisch für den gewählten Ort.`;
      sections.forEach((sec) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "section-chip-btn";
        if (sec.name === currentWetterPlace.name) btn.classList.add("active");
        btn.innerHTML = `
          <span class="section-chip-type"></span>
          <strong></strong>
          <span class="small-meta muted"></span>
        `;
        btn.querySelector(".section-chip-type").textContent = sec.type;
        btn.querySelector("strong").textContent = sec.name;
        btn.querySelector(".muted").textContent = `${sec.distKm.toFixed(1)} km · ${sec.lat.toFixed(3)}° N, ${sec.lon.toFixed(3)}° O`;
        btn.addEventListener("click", () => {
          selectWetterPlace({
            name: sec.name,
            display_name: `${sec.name} (${sec.type})`,
            type: sec.type,
            address: { state: currentWetterPlace.state || "" },
            lat: sec.lat,
            lon: sec.lon
          });
          toast(`Teilabschnitt „${sec.name}“ geladen.`);
        });
        listEl.appendChild(btn);
      });
    } catch {
      if (place === currentWetterPlace) countEl.textContent = "Teilabschnitte und nahe Gewässer sind gerade nicht abrufbar.";
    }
  }

  async function loadWetterGbif() {
    if (!currentWetterPlace) return;
    const requestId = ++wetterFishRequest;
    const listEl = document.getElementById("wetter-gbif-list");
    const gridEl = document.getElementById("wetter-fish-grid");
    listEl.textContent = "Lade GBIF-Fischmeldungen …";
    gridEl.innerHTML = "";

    try {
      const res = await window.STERNI_API.fetchFishOccurrences(currentWetterPlace.lat, currentWetterPlace.lon, wetterGbifKm);
      if (requestId !== wetterFishRequest) return;
      const infoMap = window.STERNI_DATA.FISH_SPECIES_INFO || {};
      const orderMethodMap = window.STERNI_DATA.FISH_METHOD_BY_ORDER || {};
      let speciesList = res.species || [];
      let isFallback = false;
      const placeWords = (currentWetterPlace.name || "").toLowerCase().split(/[^\p{L}\p{N}]+/u);
      const profiles = window.STERNI_DATA.WATER_FISH_PROFILES || {};
      const matchedProfile = Object.entries(profiles).find(([key]) => placeWords.includes(key) || (key === "spree" && placeWords.includes("müggelspree")));
      let hasRegionalProfile = false;
      const usedKm = res.effectiveRadiusKm || wetterGbifKm;

      if (!speciesList.length) {
        isFallback = true;
        const t = (currentWetterPlace.type || "").toLowerCase();
        const isCoast = t.includes("coast") || t.includes("sea") || t.includes("bay") || t.includes("ostsee") || t.includes("küste") || t.includes("bodden");
        const isSouth = currentWetterPlace.lat < 45.5;
        const isRiver = t.includes("river") || t.includes("fluss") || t.includes("kanal") || t.includes("stream") || t.includes("buhne");
        const fallbackKey = isCoast ? "coast" : (isSouth ? "southRiver" : (isRiver ? "river" : "lake"));
        const defaults = matchedProfile?.[1] || window.STERNI_DATA.DEFAULT_FISH_BY_TYPE?.[fallbackKey] || [];
        speciesList = defaults.map((sci) => ({ name: sci, count: null, order: "", regional: !!matchedProfile }));
        listEl.textContent = matchedProfile
          ? `Keine GBIF-Einzelmeldungen im ${usedKm}-km-Radius · Arten aus dem regionalen Flussprofil:`
          : `Keine GBIF-Einzelmeldungen im ${usedKm}-km-Radius · Beispiele für diesen Gewässertyp:`;
      }

      if (matchedProfile) {
        const existingSpecies = new Set(speciesList.map((s) => s.name));
        const additions = matchedProfile[1]
          .filter((name) => !existingSpecies.has(name))
          .map((name) => ({ name, count: null, order: "", regional: true }));
        if (additions.length) {
          speciesList = [...additions, ...speciesList];
          hasRegionalProfile = true;
        }
      }

      if (!isFallback) {
        const radiusNote = usedKm !== wetterGbifKm ? ` (automatisch auf ${usedKm} km erweitert)` : ` (${usedKm} km)`;
        listEl.textContent = `${res.total} GBIF-Fischmeldungen im Umkreis${radiusNote} · ${speciesList.length} vorkommende Arten${hasRegionalProfile ? " einschließlich regional hinterlegter Gewässerarten" : ""}:`;
      } else if (hasRegionalProfile) {
        listEl.textContent = `Keine GBIF-Einzelmeldungen im ${usedKm}-km-Radius – regionaler Fischbestand für ${currentWetterPlace.name}:`;
      }

      speciesList.forEach((s) => {
        const known = infoMap[s.name] || null;
        const deName = known?.de || s.name;
        const desc = known?.desc || "Im Gewässerumfeld nachgewiesene Fischart (GBIF-Datenbank).";
        const methodTip = known?.method || (s.order && orderMethodMap[s.order] ? `Fangweise & Tipp: ${orderMethodMap[s.order]}` : "Fangweise & Tipp: Mit feiner Grund-, Posen- oder leichter Spinnmontage je nach Strömung testen.");
        const wikiKey = known?.wiki || s.name;

        const card = document.createElement("article");
        card.className = "wetter-fish-card";
        card.innerHTML = `
          <div class="wetter-fish-media">${makeFishSvg(deName)}</div>
          <div class="wetter-fish-body">
            <div class="entry-card-head" style="margin-bottom:0">
              <div>
                <strong></strong>
                <div class="small-meta muted"><em></em></div>
              </div>
              <span class="pill-tag">${s.count != null ? `${s.count}×` : (s.regional ? "regional" : "Bestand")}</span>
            </div>
            <p class="wetter-fish-desc"></p>
            <p class="wetter-fish-method"></p>
            <button type="button" class="btn-outline btn-xs">Bild &amp; Fangtipps</button>
          </div>
        `;
        card.querySelector("strong").textContent = deName;
        card.querySelector("em").textContent = s.name;
        const descEl = card.querySelector(".wetter-fish-desc");
        descEl.textContent = desc;
        card.querySelector(".wetter-fish-method").textContent = methodTip;

        let loadedImg = "";
        let loadedExtract = desc;
        let wikiUrl = "";

        window.STERNI_API.fetchFishWikiMedia(wikiKey, s.name).then((wiki) => {
          if (!wiki) return;
          if (wiki.image) {
            loadedImg = wiki.image;
            const mediaBox = card.querySelector(".wetter-fish-media");
            const img = document.createElement("img");
            img.src = wiki.image;
            img.alt = deName;
            img.loading = "lazy";
            mediaBox.innerHTML = "";
            mediaBox.appendChild(img);
          }
          if (!known && wiki.extract) {
            loadedExtract = wiki.extract;
            descEl.textContent = wiki.extract.length > 160 ? wiki.extract.slice(0, 157) + "…" : wiki.extract;
          }
          if (wiki.pageUrl) wikiUrl = wiki.pageUrl;
        });

        card.querySelector("button").addEventListener("click", () => {
          const mediaHtml = loadedImg
            ? `<img src="${loadedImg}" alt="${deName}" style="width:100%;max-height:260px;object-fit:cover;border:1px solid #3a3a43;margin-bottom:0.75rem">`
            : `<div style="text-align:center;margin-bottom:0.75rem">${makeFishSvg(deName)}</div>`;
          const linkHtml = wikiUrl
            ? `<p style="margin-top:0.75rem"><a href="${wikiUrl}" target="_blank" rel="noopener">Wikipedia-Artikel öffnen ↗</a></p>`
            : "";
          const countLine = s.regional
            ? `<p><strong>Regionaler Hinweis:</strong> Art aus dem Flussprofil. Für den ausgewählten Abschnitt liegt kein einzelner GBIF-Nachweis vor.</p>`
            : (isFallback
              ? `<p><strong>Beispiel:</strong> Typische Art für den Gewässertyp. Ein lokaler Nachweis fehlt.</p>`
              : `<p><strong>Nachweise im Umkreis (${usedKm} km):</strong> ${s.count} Meldungen</p>`);
          openLightbox(
            `${deName} (${s.name})`,
            `${mediaHtml}${countLine}<p>${loadedExtract}</p><p class="wetter-fish-method">${methodTip}</p>${linkHtml}`
          );
        });

        gridEl.appendChild(card);
      });
    } catch {
      if (requestId === wetterFishRequest) listEl.textContent = "GBIF-Daten derzeit nicht abrufbar.";
    }
  }

  // ==================== FANGTAGEBUCH & BACKUP ====================
  function syncWaterDatalist() {
    const dl = document.getElementById("j-water-list");
    if (!dl) return;
    const spots = loadJson(KEYS.spots, []);
    const waters = new Set(["Oder bei Eisenhüttenstadt", ...spots.map((s) => s.water).filter(Boolean)]);
    dl.innerHTML = [...waters].map((w) => `<option value="${w}">`).join("");
  }

  function initJournal() {
    const dt = document.getElementById("j-date");
    if (dt && !dt.value) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      dt.value = now.toISOString().slice(0, 16);
    }
    syncWaterDatalist();

    document.getElementById("journal-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const entries = loadJson(KEYS.journal, []);
      entries.unshift({
        id: "j-" + Date.now(),
        water: document.getElementById("j-water").value.trim(),
        date: document.getElementById("j-date").value,
        species: document.getElementById("j-species").value.trim(),
        count: Number(document.getElementById("j-count").value) || 0,
        length: Number(document.getElementById("j-length").value) || 0,
        bait: document.getElementById("j-bait").value.trim(),
        notes: document.getElementById("j-notes").value.trim()
      });
      saveJson(KEYS.journal, entries);
      e.target.reset();
      document.getElementById("j-count").value = "1";
      renderJournal();
      toast("Tour im Fangtagebuch gespeichert!");
    });

    document.getElementById("j-search")?.addEventListener("input", renderJournal);
    document.getElementById("j-sort")?.addEventListener("change", renderJournal);

    // Full App JSON Backup
    document.getElementById("backup-download-btn")?.addEventListener("click", () => {
      const dump = {};
      Object.entries(KEYS).forEach(([k, lsKey]) => {
        dump[k] = localStorage.getItem(lsKey);
      });
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sterni-app-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    });

    document.getElementById("backup-upload-input")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dump = JSON.parse(await file.text());
        Object.entries(KEYS).forEach(([k, lsKey]) => {
          if (dump[k] != null) localStorage.setItem(lsKey, dump[k]);
        });
        toast("Sicherung eingelesen – App wird aktualisiert.");
        location.reload();
      } catch {
        toast("Ungültige Sicherungsdatei.");
      }
      e.target.value = "";
    });

    renderJournal();
  }

  function renderJournal() {
    const entries = loadJson(KEYS.journal, []);
    const totalFish = entries.reduce((s, e) => s + (Number(e.count) || 0), 0);
    const maxLen = entries.reduce((m, e) => Math.max(m, Number(e.length) || 0), 0);

    document.getElementById("stat-tours").textContent = String(entries.length);
    document.getElementById("stat-fish").textContent = String(totalFish);
    document.getElementById("stat-biggest").textContent = maxLen ? `${maxLen} cm` : "— cm";
    const badge = document.getElementById("journal-count-badge");
    if (badge) badge.textContent = `${entries.length} Touren`;

    const term = (document.getElementById("j-search")?.value || "").trim().toLowerCase();
    const sort = document.getElementById("j-sort")?.value || "newest";

    let filtered = entries.filter((e) => {
      if (!term) return true;
      return `${e.water} ${e.species} ${e.bait} ${e.notes}`.toLowerCase().includes(term);
    });

    if (sort === "oldest") filtered.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    else if (sort === "biggest") filtered.sort((a, b) => (b.length || 0) - (a.length || 0));
    else filtered.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const list = document.getElementById("journal-list");
    list.innerHTML = "";
    if (!filtered.length) {
      list.innerHTML = `<p class="muted small-meta">Keine passenden Tagebucheinträge vorhanden.</p>`;
      return;
    }

    filtered.forEach((item) => {
      const card = document.createElement("div");
      card.className = "entry-card";
      const dStr = item.date ? new Date(item.date).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "";
      card.innerHTML = `
        <div class="entry-card-head">
          <div>
            <strong></strong>
            <div class="small-meta muted"></div>
          </div>
          <button type="button" class="btn-ghost btn-xs">Eintrag entfernen</button>
        </div>
        <p class="small-meta" style="margin:0.25rem 0 0"></p>
      `;
      card.querySelector("strong").textContent = `${item.count}× ${item.species}${item.length ? ` · max. ${item.length} cm` : ""}`;
      card.querySelector(".muted").textContent = [item.water, dStr].filter(Boolean).join(" · ");
      card.querySelector("p").textContent = [item.bait ? `Köder: ${item.bait}` : "", item.notes].filter(Boolean).join(" · ");
      card.querySelector("button").addEventListener("click", () => {
        if (!confirm("Diesen Tagebucheintrag entfernen?")) return;
        const all = loadJson(KEYS.journal, []).filter((x) => x.id !== item.id);
        saveJson(KEYS.journal, all);
        renderJournal();
      });
      list.appendChild(card);
    });
  }

  // ==================== WARTUNG & PFLEGE ====================
  function initWartung() {
    const guidesWrap = document.getElementById("wartung-guides-list");
    window.STERNI_DATA.WARTUNG_GUIDES.forEach((g) => {
      const d = document.createElement("details");
      d.className = "sub-details";
      d.innerHTML = `<summary>${g.title}</summary><div class="details-body"><p>${g.body}</p></div>`;
      guidesWrap.appendChild(d);
    });

    const kindSel = document.getElementById("w-kind");
    const subSel = document.getElementById("w-subtype");
    const populateSubtypes = () => {
      const opts = kindSel.value === "Rolle" ? window.STERNI_DATA.REEL_TYPES : window.STERNI_DATA.LINE_TYPES;
      subSel.innerHTML = opts.map((o) => `<option value="${o}">${o}</option>`).join("");
    };
    kindSel.addEventListener("change", populateSubtypes);
    populateSubtypes();

    document.getElementById("wartung-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const list = loadJson(KEYS.wartung, []);
      list.unshift({
        id: "w-" + Date.now(),
        name: document.getElementById("w-name").value.trim(),
        kind: kindSel.value,
        subtype: subSel.value,
        brand: document.getElementById("w-brand").value.trim(),
        spec: document.getElementById("w-spec").value.trim(),
        belongs: document.getElementById("w-belongs").value.trim(),
        last: document.getElementById("w-last").value,
        next: document.getElementById("w-next").value,
        notes: document.getElementById("w-notes").value.trim()
      });
      saveJson(KEYS.wartung, list);
      e.target.reset();
      populateSubtypes();
      renderWartung();
      toast("Wartungseintrag gespeichert!");
    });

    document.getElementById("w-search")?.addEventListener("input", renderWartung);
    renderWartung();
  }

  function renderWartung() {
    const list = loadJson(KEYS.wartung, []);
    const term = (document.getElementById("w-search")?.value || "").trim().toLowerCase();
    const filtered = list.filter((item) => !term || JSON.stringify(item).toLowerCase().includes(term));

    const wrap = document.getElementById("wartung-list");
    wrap.innerHTML = "";
    if (!filtered.length) {
      wrap.innerHTML = `<p class="muted small-meta">Noch keine Rollen oder Schnüre eingetragen.</p>`;
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    filtered.forEach((item) => {
      const isDue = item.next && item.next <= todayStr;
      const card = document.createElement("div");
      card.className = "entry-card";
      card.innerHTML = `
        <div class="entry-card-head">
          <div>
            <strong></strong>
            ${item.next ? `<span class="${isDue ? "badge-due" : "badge-ok"}">${isDue ? "Prüfung fällig" : `Prüfung: ${item.next}`}</span>` : ""}
            <div class="small-meta muted"></div>
          </div>
          <div class="action-row" style="margin:0">
            <button type="button" class="btn-outline btn-xs done-btn">Heute gepflegt</button>
            <button type="button" class="btn-ghost btn-xs del-btn">Entfernen</button>
          </div>
        </div>
        <p class="small-meta" style="margin:0.25rem 0 0"></p>
      `;
      card.querySelector("strong").textContent = `${item.name} (${item.kind}: ${item.subtype}) `;
      card.querySelector(".muted").textContent = [item.brand, item.spec, item.belongs ? `Einsatz: ${item.belongs}` : ""].filter(Boolean).join(" · ");
      card.querySelector("p").textContent = [item.last ? `Letzte Pflege: ${item.last}` : "", item.notes].filter(Boolean).join(" · ");

      card.querySelector(".done-btn").addEventListener("click", () => {
        const all = loadJson(KEYS.wartung, []);
        const target = all.find((x) => x.id === item.id);
        if (target) {
          target.last = todayStr;
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 3);
          target.next = nextDate.toISOString().slice(0, 10);
          saveJson(KEYS.wartung, all);
          renderWartung();
          toast("Pflegedatum auf heute aktualisiert.");
        }
      });

      card.querySelector(".del-btn").addEventListener("click", () => {
        const all = loadJson(KEYS.wartung, []).filter((x) => x.id !== item.id);
        saveJson(KEYS.wartung, all);
        renderWartung();
      });
      wrap.appendChild(card);
    });
  }

  // ==================== BOOTSTRAP ====================
  function init() {
    initRouting();
    initShareAndJokes();
    initAnglertreff();
    initSpots();
    initWissen();
    setupChecklist("angeln-list", "angeln-counter", "angeln-progress", "angeln-reset-btn", KEYS.angelnCheck, window.STERNI_DATA.ANGELCHECK_ITEMS);
    window.STERNI_KNOTS?.init();
    initWetter();
    initJournal();
    initWartung();
    window.STERNI_QUIZ?.init();
    window.STERNI_MAPS?.init();
    window.STERNI_QUIZ?.checkUrlDuelInvite?.();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { toast };
})();

// ==================== VERSION CHECK ====================
if ('serviceWorker' in navigator) {
  // Fetch version manifest and compare with stored version
  const checkForUpdates = async () => {
    try {
      const resp = await fetch('/version.json', {cache: 'no-store'});
      if (!resp.ok) return;
      const {version, cacheVersion} = await resp.json();
      const stored = localStorage.getItem('sterni_app_version');
      if (stored !== version) {
        console.log('New app version detected:', version);
        // Ask SW to skip waiting and then reload when ready
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({type: 'SKIP_WAITING'});
        }
        localStorage.setItem('sterni_app_version', version);
        // Reload after short delay to let new SW activate
        setTimeout(() => location.reload(), 1500);
      }
    } catch (e) {
      console.warn('Version check failed', e);
    }
  };
  // Run on load and when page becomes visible again
  window.addEventListener('load', checkForUpdates);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForUpdates();
  });
}
