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
  const qualityBoards = {
    'Palomarknoten': 'palomar', 'Verbesserter Clinchknoten': 'verbesserter-clinch', 'Grinnerknoten (Uni)': 'grinner-uni', 'Trilene-Knoten': 'trilene', 'Schlaufenknoten': 'schlaufenknoten',
    'Rapalaknoten': 'rapala', 'Snellknoten': 'snell', 'Knotless Knot': 'knotless-knot', 'Schlaufenknoten am Wobbler': 'schlaufenknoten-wobbler', 'Doppelter Clinch': 'doppelter-clinch',
    'Doppelter Grinner': 'doppelter-grinner', 'Albrightknoten': 'albright', 'Blutknoten': 'blutknoten', 'Doppelter Uni-Knoten': 'doppelter-uni', 'Chirurgenknoten': 'chirurgenknoten',
    'FG-Knoten': 'fg-knoten', 'PR-Knoten': 'pr-knoten', 'Mahin-Knoten': 'mahin', 'Yucatan-Knoten': 'yucatan', 'Slim Beauty': 'slim-beauty',
    'Doppelter Überhand-Schlaufenknoten': 'doppelter-ueberhand', 'Achterknoten': 'achterknoten', 'Springerschlaufe': 'springerschlaufe', 'Perfekte Schlaufe': 'perfekte-schlaufe', 'Dropper-Loop': 'dropper-loop',
    'Arborknoten': 'arborknoten', 'Mümmelmannknoten': 'muemmelmann', 'Centauri-Knoten': 'centauri', 'Pitzen-Knoten': 'pitzen', 'Non-Slip Mono Loop': 'non-slip-mono-loop'
  };

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
  const qualitySteps = (knot) => {
    const connection = knot.categoryIndex === 0 || knot.categoryIndex === 1 || knot.categoryIndex === 5;
    const labels = connection
      ? ['Schnur vorbereiten', 'Durch die Öse führen', 'Erste Schlaufe legen', 'Wicklungen sauber führen', 'Anfeuchten und festziehen', `Fertiger ${knot.name}`]
      : ['Zwei Schnüre ausrichten', 'Bucht oder Schlaufe bilden', 'Rotes Ende durchführen', 'Wicklungen ordnen', 'Anfeuchten und festziehen', `Fertiger ${knot.name}`];
    const texts = [
      `Lege die Schnur für ${knot.use.toLowerCase()} aus. Blau bleibt fest; nur das rote Ende wird bewegt.`,
      'Führe das rote Ende genau durch die markierte Öse oder Schlaufe. Die Öffnung bleibt sichtbar.',
      'Lege die nächste Führung locker und ohne Kreuzung. Die orangefarbenen Pfeile zeigen die Bewegungsrichtung.',
      'Ordne jede Windung dicht neben die vorherige. Halte die stehende Schnur dabei gespannt.',
      'Befeuchte die Schnur, ziehe langsam an beiden markierten Strängen und kontrolliere den Sitz.',
      `Prüfe den ${knot.name} mit einer kurzen Zugprobe. Überstand erst danach sauber kürzen.`
    ];
    return labels.map((heading, index) => [heading, texts[index]]);
  };
  const diagram = (knot, step, final = false) => {
    const mode = knot.categoryIndex;
    const fixed = `M30 116 H142 ${mode === 2 || mode === 3 ? 'M158 116 H270' : ''}`;
    const moving = step === 0 ? 'M168 116 H270' : step === 1 ? 'M168 116 C232 55 260 164 185 147 C150 139 160 82 204 83' : step === 2 ? 'M168 116 C220 73 260 103 237 145 C216 181 174 159 186 122' : 'M168 116 C181 95 202 96 213 116 C202 136 181 136 168 116';
    const hardware = (mode === 0 || mode === 1 || mode === 5) ? '<g class="knot-hardware"><ellipse cx="150" cy="116" rx="14" ry="9"/><path d="M150 125v42q0 22 20 22t20-22v-11l-8 11"/></g>' : '';
    const shadow = final ? '<path d="M92 123 C135 73 195 76 224 116 C195 156 135 159 92 123Z" class="knot-shadow"/>' : '';
    const shortHint = final ? 'ZUGPROBE' : ['AUSRICHTEN', 'FÜHREN', 'WICKLUNGEN', 'FESTZIEHEN'][step];
    return `<svg class="knot-diagram" viewBox="0 0 300 220" role="img" aria-label="${safe(knot.name)}, Schritt ${step + 1}"><defs><marker id="knot-arrow-${knot.id}-${step}" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6Z" fill="${red}"/></marker></defs><rect width="300" height="220" rx="18" class="knot-paper"/><text x="150" y="31" class="knot-svg-step">SCHRITT ${step + 1}</text>${shadow}${hardware}<path d="${fixed}" class="knot-fixed"/><path d="${moving}" class="knot-moving"/><path d="M238 73 C224 79 213 88 204 99" class="knot-arrow" marker-end="url(#knot-arrow-${knot.id}-${step})"/><circle cx="30" cy="116" r="6" class="knot-start"/><circle cx="270" cy="116" r="6" class="knot-end"/><text x="30" y="102" class="knot-point-label">START</text><text x="270" y="102" text-anchor="end" class="knot-point-label">ENDE</text><text x="150" y="197" text-anchor="middle" class="knot-svg-hint">${shortHint}</text></svg>`;
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
    const content = document.getElementById('knot-view-content');
    const knotPosition = knots.indexOf(knot);
    const previousKnot = knots[(knotPosition - 1 + knots.length) % knots.length];
    const nextKnot = knots[(knotPosition + 1) % knots.length];
    const palomarSteps = [
      ['Schnur doppelt legen', 'Lege die Angelschnur doppelt, sodass eine ausreichend große Schlaufe entsteht.'],
      ['Durch die Öse führen', 'Führe die doppelt gelegte Schnur von vorn durch die Öse des Angelhakens.'],
      ['Überhandknoten binden', 'Binde mit der doppelten Schnur einen lockeren Überhandknoten. Die große Schlaufe bleibt geöffnet.'],
      ['Schlaufe über den Haken', 'Führe die große Schlaufe vollständig über Öse, Schenkel und Spitze des Hakens.'],
      ['Knoten festziehen', 'Befeuchte die Schnur und ziehe die stehende Schnur sowie das freie Ende gleichmäßig fest.'],
      ['Fertiger Palomarknoten', 'Der Knoten sitzt sauber an der Öse. Prüfe die Verbindung unter Zug, bevor du den Überstand kürzt.']
    ];
    const boardSlug = qualityBoards[knot.name];
    const steps = knot.name === 'Palomarknoten' ? palomarSteps : qualitySteps(knot);
    const board = `<div class="palomar-board-wrap"><img src="assets/knoten/${boardSlug}-steps.png" class="palomar-board quality-board" alt="Sechs hochwertige Schrittbilder für ${safe(knot.name)} mit blauer stehender Schnur, rotem freien Ende und orangefarbenen Bewegungs-Pfeilen"><button type="button" class="btn-outline btn-sm palomar-zoom" data-board="assets/knoten/${boardSlug}-steps.png" data-name="${safe(knot.name)}">Bildtafel vergrößern</button></div>`;
    const cards = steps.map(([heading, text], step) => `<article class="knot-step-card"><div class="knot-step-number">${step + 1}</div><div class="knot-step-text"><strong class="knot-step-title">${step + 1}. ${safe(heading)}</strong><p class="knot-step-copy">${safe(text)}</p></div></article>`).join('');
    content.innerHTML = `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><a href="#knoten-kat-${knot.categoryIndex}">${safe(knot.category)}</a><span>›</span><strong>${safe(knot.name)}</strong></div><article class="knot-detail"><div class="knot-detail-head"><div><p class="eyebrow">${safe(knot.category)}</p><h2>${safe(knot.name)}</h2><p>${safe(knot.summary)}</p><span class="pill-tag">Einsatz: ${safe(knot.use)}</span></div></div><div class="knot-legend"><span class="legend-fixed">━ Stehende Schnur</span><span class="legend-moving">━ Freies Ende / Bewegung</span><span class="legend-arrow">↗ Bewegungsrichtung</span></div>${board}<div class="knot-step-grid">${cards}</div><div class="knot-detail-actions"><a class="btn-outline btn-sm" href="#knoten-knot-${previousKnot.id}">← Vorheriger Knoten</a><a class="btn-outline btn-sm" href="#knoten-kat-${knot.categoryIndex}">Zur Kategorie</a><a class="btn-primary btn-sm" href="#knoten-knot-${nextKnot.id}">Nächster Knoten →</a></div></article>`;
    content.querySelectorAll('.knot-step-image').forEach((image) => image.addEventListener('click', () => { const dialog = document.getElementById('lightbox-dialog'); const body = document.getElementById('lightbox-body'); body.innerHTML = image.innerHTML; dialog?.showModal(); }));
    content.querySelector('.palomar-zoom')?.addEventListener('click', (event) => { const button = event.currentTarget; const dialog = document.getElementById('lightbox-dialog'); const body = document.getElementById('lightbox-body'); body.innerHTML = `<img class="palomar-board palomar-board-large" src="${button.dataset.board}" alt="Vergrößerte Schritttafel für ${button.dataset.name}">`; dialog?.showModal(); });
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
