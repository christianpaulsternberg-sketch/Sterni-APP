/* Interaktives Angelknoten-Lexikon: 30 Einträge, lokal und ohne externe Bilder. */
(() => {
  const blue = '#65b7ff';
  const red = '#ff635f';
  const categories = [
    { name: 'Grundknoten', icon: '◉', knots: [
      ['Palomarknoten', 'Öhrhaken, Wirbel und Snaps', 'Sehr tragfähig; besonders einfach mit geflochtener Schnur.'],
      ['Verbesserter Clinchknoten', 'Öhrhaken und kleine Wirbel', 'Klassischer Knoten für monofile Schnur.'],
      ['Grinnerknoten (Uni)', 'Öhrhaken und Wirbel', 'Universeller Knoten für Mono und Geflecht.'],
      ['Trilene-Knoten', 'Öhrhaken und Wirbel', 'Doppelte Führung durch die Öse erhöht die Sicherheit.'],
      ['Schlaufenknoten', 'Bewegliche Verbindung am Köder', 'Lässt dem Köder mehr Spiel.']
    ]},
    { name: 'Haken & Köder', icon: '⌁', knots: [
      ['Rapalaknoten', 'Kunstköder mit freier Schlaufe', 'Bewegliche Schlaufe vor dem Köder.'],
      ['Snellknoten', 'Öhrhaken mit langem Schenkel', 'Die Wicklung liegt am Hakenschenkel.'],
      ['Knotless Knot', 'Karpfenhaken und Haarmontage', 'Grundlage für eine Haarmontage.'],
      ['Schlaufenknoten am Wobbler', 'Wobbler und harte Köder', 'Köder kann in der Schlaufe arbeiten.'],
      ['Doppelter Clinch', 'Kleine Ösen und dünnes Mono', 'Zusätzliche Sicherung bei glatter Schnur.']
    ]},
    { name: 'Schnüre verbinden', icon: '∞', knots: [
      ['Doppelter Grinner', 'Geflecht mit Fluorocarbon', 'Schlanke Verbindung für unterschiedliche Schnüre.'],
      ['Albrightknoten', 'Deutlich unterschiedliche Durchmesser', 'Bucht der dicken Schnur mit Wicklungen.'],
      ['Blutknoten', 'Ähnlich starke monofile Schnüre', 'Schlanke Verbindung für Mono.'],
      ['Doppelter Uni-Knoten', 'Mono mit Geflecht', 'Zwei spiegelbildliche Uni-Knoten.'],
      ['Chirurgenknoten', 'Schnelle Verbindung und Schlaufe', 'Einfacher Knoten mit doppelter Schnur.']
    ]},
    { name: 'Geflochtene & Vorfächer', icon: '≋', knots: [
      ['FG-Knoten', 'Geflecht an Fluorocarbon', 'Sehr schlanke Wickelverbindung; sorgfältig festziehen.'],
      ['PR-Knoten', 'Geflecht an Fluorocarbon', 'Aufwendige Wicklung für hohe Belastung.'],
      ['Mahin-Knoten', 'Geflecht an Schlagschnur', 'Konische Verbindung für Ringe.'],
      ['Yucatan-Knoten', 'Geflecht an Mono', 'Doppelte Schnur wird um das Vorfach gewickelt.'],
      ['Slim Beauty', 'Geflecht und starkes Vorfach', 'Kompakte Verbindung mit zwei Wickelpaketen.']
    ]},
    { name: 'Schlaufen & Montagen', icon: '◌', knots: [
      ['Doppelter Überhand-Schlaufenknoten', 'Feste Endschlaufe', 'Einfacher, stabiler Schlaufenabschluss.'],
      ['Achterknoten', 'Schnurstopper und Schlaufen', 'Gut kontrollierbarer Grundknoten.'],
      ['Springerschlaufe', 'Seitenarm im Vorfach', 'Erzeugt eine seitliche Köderschlaufe.'],
      ['Perfekte Schlaufe', 'Kleine Endschlaufe', 'Kompakte Schlaufe für Vorfächer.'],
      ['Dropper-Loop', 'Seitenarm an einer Schnur', 'Stabile Schlaufe für mehrere Köder.']
    ]},
    { name: 'Spezialknoten', icon: '★', knots: [
      ['Arborknoten', 'Schnur auf der Rollenspule', 'Stopperknoten am Spulenkern.'],
      ['Mümmelmannknoten', 'Kleine Haken und Ösen', 'Kompakter Knoten für feine Montagen.'],
      ['Centauri-Knoten', 'Geflecht und Öhr', 'Knoten mit doppelter Ösenführung.'],
      ['Pitzen-Knoten', 'Feine Vorfächer und Fliegen', 'Kleine, belastbare Verbindung.'],
      ['Non-Slip Mono Loop', 'Freie Schlaufe am Kunstköder', 'Schlaufe bleibt beweglich und rutscht nicht zu.']
    ]}
  ];
  const knots = categories.flatMap((category, categoryIndex) => category.knots.map((item, knotIndex) => ({
    id: `${categoryIndex}-${knotIndex}`, categoryIndex, category: category.name, name: item[0], use: item[1], summary: item[2]
  })));

  const safe = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stepText = (knot, step) => {
    const generic = [
      ['Material ausrichten', `Lege die Schnur vor dir aus. Der feste Abschnitt bleibt blau; das zu führende Ende ist rot markiert. Bei ${knot.use.toLowerCase()} zunächst die Öse bzw. Schnurverbindung prüfen.`],
      ['Schlaufe bilden', 'Führe nur das rote Ende. Halte die blaue Schnur mit Daumen und Zeigefinger fest, damit die Schlaufe offen und sichtbar bleibt.'],
      ['Wicklungen ordnen', 'Lege jede Wicklung dicht neben die vorige. Nichts überkreuzen: Die Wicklungen müssen sauber parallel liegen.'],
      ['Anfeuchten und prüfen', 'Anfeuchten, langsam festziehen und den Knoten mit einer kontrollierten Zugprobe prüfen. Überstand erst danach kürzen.']
    ];
    const variations = {
      'Palomarknoten': ['Doppelte Schnur durch die Öse führen.', 'Einen lockeren Überhandknoten mit der doppelten Schnur legen.', 'Die große Bucht vollständig über den Haken führen.'],
      'Verbesserter Clinchknoten': ['Das freie Ende durch die Öse führen.', 'Das rote Ende 5–7-mal um die blaue Hauptschnur wickeln.', 'Durch kleine und danach große Schlaufe zurückführen.'],
      'Grinnerknoten (Uni)': ['Schnur durch die Öse und parallel zurücklegen.', 'Das rote Ende 5–6-mal durch die Schlaufe um beide Stränge führen.', 'Wicklung schließen und an die Öse schieben.'],
      'Rapalaknoten': ['Etwa 10 cm vor dem Ende einen lockeren Überhandknoten legen.', 'Durch Köderöse und zurück durch den offenen Knoten führen.', 'Dreimal um die Hauptschnur wickeln und Schlaufe einstellen.'],
      'Albrightknoten': ['In der dicken blauen Schnur eine Bucht legen.', 'Das rote dünne Ende 8–10-mal um beide Bucht-Schenkel wickeln.', 'Auf derselben Seite zurück durch die Bucht führen.'],
      'Doppelter Grinner': ['Beide Schnüre 20–30 cm parallel überlappen lassen.', 'Mit dem roten Ende einen Uni-Knoten um die blaue Schnur binden.', 'Mit dem blauen Ende spiegelbildlich wiederholen.'],
      'Blutknoten': ['Beide Schnüre parallel gegeneinander legen.', 'Rotes Ende fünfmal um blau wickeln und durch die Mitte zurückführen.', 'Blaues Ende in Gegenrichtung fünfmal um rot wickeln.'],
      'Arborknoten': ['Schnur einmal um den Spulenkern legen.', 'Roten Überhandknoten um die blaue Hauptschnur legen.', 'Zweiten kleinen roten Stopperknoten setzen.']
    };
    const steps = variations[knot.name] || generic.map((entry) => entry[1]);
    if (step < 3) return [steps[step], generic[step][1]];
    return [generic[3][0], generic[3][1]];
  };
  const diagram = (knot, step, final = false) => {
    const mode = knot.categoryIndex;
    const fixed = `M30 116 H142 ${mode === 2 || mode === 3 ? 'M158 116 H270' : ''}`;
    const moving = step === 0 ? 'M168 116 H270' : step === 1 ? 'M168 116 C232 55 260 164 185 147 C150 139 160 82 204 83' : step === 2 ? 'M168 116 C220 73 260 103 237 145 C216 181 174 159 186 122' : 'M168 116 C181 95 202 96 213 116 C202 136 181 136 168 116';
    const hardware = (mode === 0 || mode === 1 || mode === 5) ? '<g class="knot-hardware"><ellipse cx="150" cy="116" rx="14" ry="9"/><path d="M150 125v42q0 22 20 22t20-22v-11l-8 11"/></g>' : '';
    const shadow = final ? '<path d="M92 123 C135 73 195 76 224 116 C195 156 135 159 92 123Z" class="knot-shadow"/>' : '';
    return `<svg class="knot-diagram" viewBox="0 0 300 220" role="img" aria-label="${safe(knot.name)}, Schritt ${step + 1}"><defs><marker id="knot-arrow-${knot.id}-${step}" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6Z" fill="${red}"/></marker></defs><rect width="300" height="220" rx="18" class="knot-paper"/><text x="150" y="31" class="knot-svg-step">SCHRITT ${step + 1}</text>${shadow}${hardware}<path d="${fixed}" class="knot-fixed"/><path d="${moving}" class="knot-moving"/><path d="M238 73 C224 79 213 88 204 99" class="knot-arrow" marker-end="url(#knot-arrow-${knot.id}-${step})"/><circle cx="30" cy="116" r="6" class="knot-start"/><circle cx="270" cy="116" r="6" class="knot-end"/><text x="30" y="102" class="knot-point-label">START</text><text x="270" y="102" text-anchor="end" class="knot-point-label">ENDE</text><text x="150" y="197" text-anchor="middle" class="knot-svg-hint">${safe(step === 3 && final ? 'fertiger Knoten · Zugprobe' : stepText(knot, step)[0])}</text></svg>`;
  };

  function render() {
    const root = document.getElementById('knoten-lexikon-root');
    if (!root) return;
    root.innerHTML = `<div class="knot-hero"><p class="eyebrow">STERNI-APP · ANGELKNOTEN-LEXIKON</p><h1 id="knoten-heading">30 Knoten – Schritt für Schritt</h1><p>Wähle eine Kategorie und öffne einen Knoten. Blau bleibt stehen, Rot wird geführt.</p></div><div id="knot-view-content"></div>`;
    route(location.hash.replace(/^#/, '') || 'knoten');
  }
  function categoryView(index) {
    const category = categories[index];
    return `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><strong>Knoten</strong></div><div class="knot-section-head"><button class="btn-outline btn-sm" data-knot-back="#knoten">← Alle Kategorien</button><h2>${safe(category.name)} <span>(${category.knots.length})</span></h2></div><div class="knot-card-grid">${category.knots.map((item, i) => { const knot = knots.find((entry) => entry.categoryIndex === index && entry.name === item[0]); return `<a class="knot-card" href="#knoten-knot-${knot.id}"><span class="knot-card-icon">${category.icon}</span><span><strong>${safe(knot.name)}</strong><small>${safe(knot.use)}</small></span><span class="knot-card-arrow">›</span></a>`; }).join('')}</div>`;
  }
  function knotView(knot) {
    let step = 0;
    const content = document.getElementById('knot-view-content');
    const renderStep = () => {
      const [heading, text] = stepText(knot, step);
      content.querySelector('.knot-step-image').innerHTML = diagram(knot, step, step === 3);
      content.querySelector('.knot-step-title').textContent = `${step + 1}. ${heading}`;
      content.querySelector('.knot-step-copy').textContent = text;
      content.querySelector('.knot-step-count').textContent = `Schritt ${step + 1} von 4`;
      content.querySelector('.knot-prev').disabled = step === 0;
      content.querySelector('.knot-next').disabled = step === 3;
    };
    const knotPosition = knots.indexOf(knot);
    const previousKnot = knots[(knotPosition - 1 + knots.length) % knots.length];
    const nextKnot = knots[(knotPosition + 1) % knots.length];
    content.innerHTML = `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><a href="#knoten-kat-${knot.categoryIndex}">${safe(knot.category)}</a><span>›</span><strong>${safe(knot.name)}</strong></div><article class="knot-detail"><div class="knot-detail-head"><div><p class="eyebrow">${safe(knot.category)}</p><h2>${safe(knot.name)}</h2><p>${safe(knot.summary)}</p><span class="pill-tag">Einsatz: ${safe(knot.use)}</span></div><button type="button" class="btn-outline btn-sm knot-lightbox">Bild vergrößern</button></div><div class="knot-legend"><span class="legend-fixed">━ Stehende Schnur</span><span class="legend-moving">━ Freies Ende / Bewegung</span></div><div class="knot-step-image" tabindex="0"></div><div class="knot-step-text"><strong class="knot-step-title"></strong><p class="knot-step-copy"></p></div><div class="knot-step-controls"><button class="btn-outline knot-prev">← Vorheriger Schritt</button><span class="knot-step-count" aria-live="polite"></span><button class="btn-primary knot-next">Nächster Schritt →</button></div><div class="knot-detail-actions"><a class="btn-outline btn-sm" href="#knoten-knot-${previousKnot.id}">← Vorheriger Knoten</a><a class="btn-outline btn-sm" href="#knoten-kat-${knot.categoryIndex}">Zur Kategorie</a><a class="btn-primary btn-sm" href="#knoten-knot-${nextKnot.id}">Nächster Knoten →</a></div></article>`;
    content.querySelector('.knot-prev').addEventListener('click', () => { step -= 1; renderStep(); });
    content.querySelector('.knot-next').addEventListener('click', () => { step += 1; renderStep(); });
    content.querySelector('.knot-lightbox').addEventListener('click', () => { const dialog = document.getElementById('lightbox-dialog'); const body = document.getElementById('lightbox-body'); body.innerHTML = content.querySelector('.knot-step-image').innerHTML; dialog?.showModal(); });
    renderStep();
  }
  function route(hash) {
    const content = document.getElementById('knot-view-content');
    if (!content) return;
    const knotMatch = hash.match(/^knoten-knot-(\d+)-(\d+)$/);
    const catMatch = hash.match(/^knoten-kat-(\d+)$/);
    if (knotMatch) { const knot = knots.find((item) => item.id === `${knotMatch[1]}-${knotMatch[2]}`); if (knot) return knotView(knot); }
    if (catMatch && categories[Number(catMatch[1])]) return void (content.innerHTML = categoryView(Number(catMatch[1])));
    content.innerHTML = `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><strong>Alle Kategorien</strong></div><div class="knot-card-grid knot-category-grid">${categories.map((category, index) => `<a class="knot-card knot-category-card" href="#knoten-kat-${index}"><span class="knot-card-icon">${category.icon}</span><span><strong>${safe(category.name)}</strong><small>5 Angelknoten</small></span><span class="knot-card-arrow">›</span></a>`).join('')}</div>`;
  }
  function init() { render(); window.addEventListener('hashchange', () => { if (location.hash.startsWith('#knoten')) route(location.hash.slice(1)); }); }
  window.STERNI_KNOTS = { init, route, categories, knots };
})();
