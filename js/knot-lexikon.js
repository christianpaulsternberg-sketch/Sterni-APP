/* Sterni-Knoten-Engine: lokale SVG-Schrittanimation fuer alle 30 Knoten. */
(() => {
  'use strict';
  const C = { blue: '#38bdf8', orange: '#fb923c', metal: '#cbd5e1', edge: '#334155' };
  const groups = [
    ['Grundknoten', '◉', 'Öhrhaken, Wirbel und Snaps', 'Monofil, Fluorocarbon, Geflochtene', '90–95 %', 'Vor dem Festziehen immer anfeuchten.', 'eye', ['Palomarknoten', 'Verbesserter Clinchknoten', 'Grinnerknoten (Uni)', 'Trilene-Knoten', 'Schlaufenknoten']],
    ['Haken & Köder', '⌁', 'Haken, Wobbler und Kunstköder', 'Monofil oder Fluorocarbon', '85–95 %', 'Der Köder braucht ausreichend Spiel.', 'eye', ['Rapalaknoten', 'Snellknoten', 'Knotless Knot', 'Schlaufenknoten am Wobbler', 'Doppelter Clinch']],
    ['Schnüre verbinden', '∞', 'Hauptschnur und Vorfach verbinden', 'Mono, Fluorocarbon, Geflochtene', '80–95 %', 'Beide Schnüre gleichmäßig belasten.', 'join', ['Doppelter Grinner', 'Albrightknoten', 'Blutknoten', 'Doppelter Uni-Knoten', 'Chirurgenknoten']],
    ['Geflochtene & Vorfächer', '≋', 'Geflecht mit starkem Vorfach verbinden', 'Geflochtene mit Fluorocarbon', '85–95 %', 'Wicklungen eng und parallel legen.', 'braid', ['FG-Knoten', 'PR-Knoten', 'Mahin-Knoten', 'Yucatan-Knoten', 'Slim Beauty']],
    ['Schlaufen & Montagen', '◌', 'Schlaufen, Seitenarme und Montagen', 'Monofil und Fluorocarbon', '80–90 %', 'Schlaufe vor dem Festziehen ausrichten.', 'loop', ['Doppelter Überhand-Schlaufenknoten', 'Achterknoten', 'Springerschlaufe', 'Perfekte Schlaufe', 'Dropper-Loop']],
    ['Spezialknoten', '★', 'Spezielle Verbindungen und Rollenspulen', 'Je nach Einsatz Mono, Fluorocarbon oder Geflecht', '80–95 %', 'Zugprobe machen, dann Überstand kürzen.', 'special', ['Arborknoten', 'Mümmelmannknoten', 'Centauri-Knoten', 'Pitzen-Knoten', 'Non-Slip Mono Loop']]
  ];
  const details = {
    'Palomarknoten': ['Doppelte Schnur durch die Öse führen.', 'Mit der doppelten Schnur einen lockeren Überhandknoten legen.', 'Die große Schlaufe vollständig über den Haken führen.', 'Schnur anfeuchten und beide Stränge gleichmäßig zuziehen.', 'Sitz an der Öse prüfen und erst dann kürzen.'],
    'Verbesserter Clinchknoten': ['Arbeitsende durch die Öse führen.', 'Das orange Ende fünf- bis siebenmal um die blaue Hauptschnur wickeln.', 'Durch die kleine Schlaufe an der Öse zurückführen.', 'Durch die große Schlaufe führen und anfeuchten.', 'Windungen zur Öse schieben und langsam festziehen.'],
    'Grinnerknoten (Uni)': ['Arbeitsende durch die Öse und parallel zurücklegen.', 'Eine offene Schlaufe über beide Stränge bilden.', 'Orange fünf- bis sechsmal durch die Schlaufe wickeln.', 'Wicklung am Arbeitsende schließen.', 'Knoten anfeuchten und bis zur Öse schieben.'],
    'Trilene-Knoten': ['Arbeitsende zweimal durch die Öse führen.', 'Eine Schlaufe neben der Öse offen halten.', 'Orange fünfmal um Blau wickeln.', 'Durch beide Schlaufen an der Öse zurückführen.', 'Anfeuchten und gleichmäßig festziehen.'],
    'Schlaufenknoten': ['Eine ausreichend große Schnurschlaufe legen.', 'Schlaufe über die Hauptschnur führen.', 'Schlaufenende durch die Öffnung führen.', 'Schlaufe auf die gewünschte Größe einstellen.', 'Anfeuchten und sorgfältig festziehen.'],
    'Rapalaknoten': ['Zehn Zentimeter vor dem Ende einen lockeren Überhandknoten legen.', 'Arbeitsende durch die Köderöse und zurück durch den Knoten führen.', 'Orange dreimal um Blau wickeln.', 'Durch die erste und die neue Schlaufe führen.', 'Freie Köderschlaufe einstellen und festziehen.'],
    'Snellknoten': ['Schnur durch die Öse bis zum Schenkel führen.', 'Eine Schlaufe entlang des Hakenschenkels legen.', 'Orange sechsmal um Schenkel und Schnur wickeln.', 'Arbeitsende durch die Schlaufe an der Öse führen.', 'Wicklungen zum Öhr schieben und festziehen.'],
    'Knotless Knot': ['Vorfach durch die Öse führen und Haarlänge festlegen.', 'Vorfach am Hakenschenkel zurücklegen.', 'Orange sieben- bis achtmal um den Schenkel wickeln.', 'Ende von außen zurück durch die Öse führen.', 'Wicklungen ausrichten und festziehen.'],
    'Schlaufenknoten am Wobbler': ['Lockere Schlaufe vor dem Arbeitsende legen.', 'Arbeitsende durch die Wobbleröse führen.', 'Ende zurück durch die vorbereitete Schlaufe führen.', 'Dreimal um Blau wickeln und zurückführen.', 'Bewegliche Schlaufe vor dem Wobbler einstellen.'],
    'Doppelter Clinch': ['Arbeitsende doppelt durch die Öse führen.', 'Kleine Schlaufe offen halten.', 'Orange fünfmal um Blau wickeln.', 'Durch beide Schlaufen zurückführen.', 'Anfeuchten und die doppelte Führung festziehen.'],
    'Doppelter Grinner': ['Beide Schnüre dreißig Zentimeter überlappen lassen.', 'Orange als Uni-Knoten um Blau legen.', 'Blaues Ende spiegelbildlich um Orange legen.', 'Beide Knoten einzeln anfeuchten und schließen.', 'An Hauptschnüren gegeneinander schieben.'],
    'Albrightknoten': ['In Blau eine Bucht legen.', 'Orange durch die Bucht führen.', 'Orange acht- bis zehnmal um beide Bucht-Schenkel wickeln.', 'Auf derselben Seite durch die Bucht zurückführen.', 'Beide Schnüre anfeuchten und gleichmäßig anziehen.'],
    'Blutknoten': ['Beide Schnüre überlappend gegeneinander legen.', 'Orange fünfmal um Blau wickeln und durch die Mitte führen.', 'Blau fünfmal gegensinnig um Orange wickeln.', 'Enden in der Mitte sauber ausrichten.', 'Anfeuchten und alle vier Stränge zuziehen.'],
    'Doppelter Uni-Knoten': ['Schnüre parallel mit Überlappung ausrichten.', 'Orange als doppelten Uni-Knoten um Blau legen.', 'Blau als doppelten Uni-Knoten um Orange legen.', 'Beide Knoten einzeln schließen.', 'Knoten gegeneinander schieben und prüfen.'],
    'Chirurgenknoten': ['Beide Schnurenden parallel doppelt legen.', 'Mit der doppelten Schlaufe eine große Öffnung bilden.', 'Enden zweimal vollständig durch die Öffnung führen.', 'Schlaufen sauber nebeneinander legen.', 'Anfeuchten und an allen Enden festziehen.'],
    'FG-Knoten': ['Geflecht und Fluorocarbon straff ausrichten.', 'Orange abwechselnd über und unter Blau führen.', 'Weitere Wicklungen sehr eng und abwechselnd legen.', 'Wicklung mit halben Schlägen sichern.', 'Unter Zug festziehen.'],
    'PR-Knoten': ['Geflecht und Vorfach unter Spannung halten.', 'Orange in engen Wicklungen um Blau legen.', 'Wicklungen dicht zusammenschieben.', 'Mit halben Schlägen am Vorfach sichern.', 'Unter Zug festziehen und Abschluss prüfen.'],
    'Mahin-Knoten': ['Eine Bucht im Vorfach legen.', 'Geflecht durch die Bucht führen.', 'Orange mehrfach um beide Vorfachstränge wickeln.', 'Auf derselben Seite durch die Bucht zurückführen.', 'Konisch festziehen und Spitze prüfen.'],
    'Yucatan-Knoten': ['Fluorocarbon doppelt legen.', 'Geflecht durch die doppelte Schlaufe führen.', 'Orange acht- bis zehnmal um beide Stränge wickeln.', 'Durch die offene Schlaufe zurückführen.', 'Anfeuchten und gemeinsam zuziehen.'],
    'Slim Beauty': ['In das dickere Vorfach eine kleine Schlaufe legen.', 'Geflecht durch die Schlaufe führen und erstes Wickelpaket bilden.', 'Orange Ende zurück über die erste Wicklung führen.', 'Zweites Wickelpaket eng anlegen und sichern.', 'Anfeuchten und konisch festziehen.'],
    'Doppelter Überhand-Schlaufenknoten': ['Schnur doppelt legen und Schlaufenlänge bestimmen.', 'Mit der doppelten Schnur einen Überhandknoten legen.', 'Doppelte Schlaufe ein zweites Mal durch die Öffnung führen.', 'Schlaufe in Form ziehen.', 'Anfeuchten und gleichmäßig festziehen.'],
    'Achterknoten': ['Eine Schnurschlaufe legen.', 'Orange über die Hauptschnur führen.', 'Von unten durch die erste Schlaufe zurückführen.', 'Acht sauber flach ausrichten.', 'Anfeuchten und festziehen.'],
    'Springerschlaufe': ['Große Schlaufe nach oben legen.', 'Schlaufe zweimal um den Strang drehen.', 'Schlaufenmitte durch die Öffnung führen.', 'Seitenarm auf gewünschte Länge einstellen.', 'Anfeuchten und Knoten festziehen.'],
    'Perfekte Schlaufe': ['Eine Schlaufe bilden.', 'Schlaufe über die stehende Schnur klappen.', 'Orange durch die untere Öffnung führen.', 'Schlaufe gleichmäßig ausrichten.', 'Kompakt und fest zuziehen.'],
    'Dropper-Loop': ['Große Schlaufe bilden.', 'Schlaufe mehrfach verdrillen.', 'Schlaufe durch die verdrillte Öffnung führen.', 'Seitenarm in die gewünschte Richtung ziehen.', 'Anfeuchten und beide Hauptstränge festziehen.'],
    'Arborknoten': ['Schnur einmal um den Spulenkern legen.', 'Mit Orange einen Überhandknoten um Blau legen.', 'Am Arbeitsende zweiten kleinen Stopperknoten setzen.', 'Beide Knoten bis zum Kern ziehen.', 'Sitz am Kern prüfen und aufspulen.'],
    'Mümmelmannknoten': ['Arbeitsende durch die kleine Öse führen.', 'Kleine offene Schlaufe direkt vor der Öse legen.', 'Orange mehrfach durch die Schlaufe führen.', 'Wicklungen nah an der Öse ordnen.', 'Anfeuchten und kompakt festziehen.'],
    'Centauri-Knoten': ['Schnur doppelt durch die Öse führen.', 'Große Schlaufe entlang der Hauptschnur legen.', 'Orange mehrfach um die doppelten Stränge wickeln.', 'Durch die Schlaufe an der Öse zurückführen.', 'Anfeuchten und gleichmäßig festziehen.'],
    'Pitzen-Knoten': ['Vorfach durch die Öse führen und Schlaufe bilden.', 'Arbeitsende neben die Hauptschnur zurücklegen.', 'Orange mehrfach um beide Stränge wickeln.', 'Durch die kleine Schlaufe zurückführen.', 'Wicklungen ordnen, anfeuchten und festziehen.'],
    'Non-Slip Mono Loop': ['Lockeren Überhandknoten vor dem Ende legen.', 'Arbeitsende durch Köderöse und zurück durch Knoten führen.', 'Orange viermal um Blau wickeln.', 'Durch die erste und die neue Schlaufe führen.', 'Bewegliche Schlaufe einstellen und festziehen.']
  };
  const knots = groups.flatMap((group, categoryIndex) => group[7].map((name, knotIndex) => ({ id: `${categoryIndex}-${knotIndex}`, categoryIndex, knotIndex, name, category: group[0], icon: group[1], use: group[2], line: group[3], strength: group[4], tip: group[5], type: group[6], steps: details[name] })));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // SVG-Geometrie-Helfer für fachlich eindeutige Knotendarstellungen
  const hook = (cx = 360, cy = 156, r = 18) =>
    `<g class="ka-metal"><ellipse cx="${cx}" cy="${cy}" rx="${r + 4}" ry="${r - 4}"/><path d="M${cx} ${cy + r - 4}v62q0 34 32 34t32-34v-14l-14 16"/></g>`;
  const wobbler = (cx = 415, cy = 156) =>
    `<g class="ka-metal"><circle cx="${cx}" cy="${cy}" r="12"/></g><path class="ka-lure" d="M${cx + 12} ${cy}c14-18 52-24 94-12 22 6 34 12 34 12s-12 10-34 14c-42 8-80 2-94-14Z"/><path class="ka-metal" d="M${cx + 14} ${cy + 12}l-12 24 18-6" style="fill:none;stroke-width:5"/>`;
  const spool = (cx = 300, cy = 160) =>
    `<ellipse class="ka-spool" cx="${cx}" cy="${cy}" rx="86" ry="52"/><ellipse cx="${cx}" cy="${cy}" rx="28" ry="18" fill="#081322" stroke="#475569" stroke-width="4"/>`;
  const drop = (x, y) =>
    `<path class="ka-water" d="M${x} ${y - 16}c7 10 10 15 10 20a10 10 0 1 1-20 0c0-5 3-10 10-20Z"/>`;
  const coils = (x0, yTop, yBot, count, step = 14, cls = 'ka-work') =>
    Array.from({ length: count }, (_, i) => `<path class="${cls}" d="M${x0 + i * step} ${yTop}c-10 12-10 ${yBot - yTop - 12} 0 ${yBot - yTop}"/>`).join('');
  const tag = (x, y, text) => `<text x="${x}" y="${y}" class="ka-tag">${esc(text)}</text>`;

  // 30 eigene, fachlich korrekte Schritt-für-Schritt-Animationen (jeweils 5 Schritte)
  const knotDrawers = {
    'Palomarknoten': [
      () => `${hook(370, 156)}<path class="ka-main" d="M50 148H352"/><path class="ka-work" d="M50 164H352c46 0 46-16 0-16"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 148H240"/><path class="ka-work" d="M50 164H240c24-48 76-48 76 0 0 36 32 36 54-8 26-48 80-36 72 8"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 152H260"/><path class="ka-work" d="M260 152c20-34 52-34 72 0 18-56 128-56 138 22 8 68-42 104-106 94"/>`,
      () => `${hook(370, 156)}${drop(285, 112)}<path class="ka-main" d="M50 152H305"/><path class="ka-work" d="M50 162H305c18-18 42-18 46-6-4 14-28 14-46-4"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 154H344"/><path class="ka-work" d="M320 144c14 0 24 10 24 10s-10 10-24 10M344 154l-26-22"/>`
    ],
    'Verbesserter Clinchknoten': [
      () => `${hook(370, 156)}<path class="ka-main" d="M50 156H350"/><path class="ka-work" d="M350 156c26 0 34-24 12-38"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 156H350"/>${coils(220, 134, 178, 6, 16)}<path class="ka-work" d="M350 156c24-20 0-38-34-22"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 156H350"/>${coils(220, 134, 178, 6, 16)}<path class="ka-work" d="M220 134c-26 22 14 58 112 28"/>`,
      () => `${hook(370, 156)}${drop(250, 108)}<path class="ka-main" d="M50 156H350"/>${coils(230, 136, 176, 6, 15)}<path class="ka-work" d="M230 136c-22 24 22 68 92 42 18-8 10-34-12-42"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 156H348"/>${coils(292, 140, 172, 5, 10)}<path class="ka-work" d="M292 140l-22-18"/>`
    ],
    'Grinnerknoten (Uni)': [
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H352"/><path class="ka-work" d="M352 150c20 16-4 22-142 22"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H352"/><path class="ka-work" d="M352 150c18 16-4 22-160 22-36 0-36-54 20-54 52 0 64 24 52 44"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H352"/><path class="ka-work" d="M352 150c18 16-4 22-160 22-36 0-36-54 20-54"/>${coils(208, 128, 176, 5, 15)}`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H352"/>${coils(220, 134, 170, 5, 14)}<path class="ka-work" d="M202 150l-28-22"/>`,
      () => `${hook(370, 156)}${drop(310, 108)}<path class="ka-main" d="M50 154H348"/>${coils(296, 138, 170, 5, 9)}<path class="ka-work" d="M296 142l-22-16"/>`
    ],
    'Trilene-Knoten': [
      () => `${hook(370, 156)}<path class="ka-main" d="M50 152H352"/><path class="ka-work" d="M352 152c26-18 40 16 14 20-26 4-16-24 10-16"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 152H352"/><path class="ka-work" d="M342 142c-28-24-28 52 0 28 24-18 32 10 10 10"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 152H352"/>${coils(228, 134, 172, 5, 15)}<path class="ka-work" d="M330 144c-16-14-16 36 0 22"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 152H352"/>${coils(228, 134, 172, 5, 15)}<path class="ka-work" d="M228 134c-24 26 24 62 114 26"/>`,
      () => `${hook(370, 156)}${drop(310, 108)}<path class="ka-main" d="M50 154H352"/>${coils(294, 138, 170, 5, 10)}<path class="ka-work" d="M294 140l-20-18"/>`
    ],
    'Schlaufenknoten': [
      () => `<path class="ka-main" d="M50 166H240"/><path class="ka-work" d="M240 166c120 0 180-76 230-16 40 48-20 84-130 34"/>`,
      () => `<path class="ka-main" d="M50 166H230"/><path class="ka-work" d="M230 166c56-68 176-68 232 0 28 34-16 62-84 36-50-18-88-58-128-36"/>`,
      () => `<path class="ka-main" d="M50 166H210"/><path class="ka-work" d="M210 166c28-52 84-52 96 0 12 48 124 48 164 0 30-36-26-74-96-36-46 24-88 64-134 24"/>`,
      () => `${drop(250, 108)}<path class="ka-main" d="M50 160H225"/><path class="ka-work" d="M225 160c20-28 54-28 66 0 14 34 114 34 156 0 36-30-16-66-82-36-38 18-76 52-112 24"/>`,
      () => `<path class="ka-main" d="M50 156H248"/><path class="ka-work" d="M248 156c16-20 38-20 46 0 14 28 118 28 160 0 34-24 22-56-22-46-46 10-108 32-160 46"/>`
    ],
    'Rapalaknoten': [
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H205"/><path class="ka-work" d="M205 156c16-34 52-34 52 0 0 30-32 30-12-10 16-28 60-18 90 10"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H210"/><path class="ka-work" d="M210 156c14-30 46-30 46 0 12 24 146 24 152 0-12-26-112-20-162 12"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H200"/>${coils(214, 138, 174, 3, 14)}<path class="ka-work" d="M256 156c24 24 132 24 152 0-18-24-100-22-146 0"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H200"/>${coils(214, 138, 174, 3, 14)}<path class="ka-work" d="M200 156c-12-30 34-44 64-18 32 28 122 36 144 18"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H294"/>${coils(294, 142, 170, 3, 10)}<path class="ka-work" d="M324 156c20-26 76-26 84 0-8 26-64 26-84 0"/>`
    ],
    'Snellknoten': [
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H312"/><path class="ka-work" d="M312 120c14 0 18 14 18 68"/>`,
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H312"/><path class="ka-work" d="M312 120c14 0 18 14 18 68 0 26-26 26-26-4v-54"/>`,
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H312"/>${Array.from({ length: 6 }, (_, i) => `<path class="ka-work" d="M312 ${144 + i * 9}c12-6 26-6 36 0"/>`).join('')}`,
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H312"/>${Array.from({ length: 6 }, (_, i) => `<path class="ka-work" d="M312 ${144 + i * 9}c12-6 26-6 36 0"/>`).join('')}<path class="ka-work" d="M348 190c14-14 14-48-18-62"/>`,
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H318"/>${Array.from({ length: 6 }, (_, i) => `<path class="ka-work" d="M318 ${138 + i * 7}h24"/>`).join('')}<path class="ka-work" d="M330 184v20"/>`
    ],
    'Knotless Knot': [
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H312"/><path class="ka-work" d="M312 120c16 0 18 20 18 106"/><circle class="ka-boilie" cx="330" cy="240" r="14"/>`,
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H312"/><path class="ka-work" d="M330 226v-92c0-18 26-18 26 4"/><circle class="ka-boilie" cx="330" cy="240" r="14"/>`,
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H312"/><path class="ka-work" d="M330 226v-36"/>${Array.from({ length: 7 }, (_, i) => `<path class="ka-work" d="M314 ${138 + i * 8}h32"/>`).join('')}<circle class="ka-boilie" cx="330" cy="240" r="14"/>`,
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H312"/>${Array.from({ length: 7 }, (_, i) => `<path class="ka-work" d="M314 ${138 + i * 8}h32"/>`).join('')}<path class="ka-work" d="M346 186c22-24 14-66-16-66H240"/><circle class="ka-boilie" cx="330" cy="240" r="14"/>`,
      () => `${hook(330, 120, 14)}<path class="ka-main" d="M50 120H318"/>${Array.from({ length: 7 }, (_, i) => `<path class="ka-work" d="M318 ${136 + i * 7}h24"/>`).join('')}<path class="ka-work" d="M330 186v40"/><circle class="ka-boilie" cx="330" cy="240" r="14"/>`
    ],
    'Schlaufenknoten am Wobbler': [
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H220"/><path class="ka-work" d="M220 156c20-40 60-40 60 0 0 36-40 36-40 0h100"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H220"/><path class="ka-work" d="M220 156c18-34 50-34 50 0h138c14 0 14 22-8 22H270"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H220"/><path class="ka-work" d="M220 156c16-32 46-32 46 0 0 26 116 26 142 0-18-24-114-18-166 12"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H210"/>${coils(228, 138, 174, 3, 14)}<path class="ka-work" d="M270 156c22 22 118 22 138 0"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H300"/>${coils(300, 142, 170, 3, 10)}<path class="ka-work" d="M330 156c18-22 64-22 78 0-14 22-60 22-78 0"/>`
    ],
    'Doppelter Clinch': [
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/><path class="ka-work" d="M50 162H350c28 0 28-12 0-12"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/><path class="ka-work" d="M342 142c-26-22-26 48 0 26 24-18 28 6 8 6"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/>${coils(228, 134, 174, 5, 16)}<path class="ka-work" d="M330 144c-12-10-12 32 0 22"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/>${coils(228, 134, 174, 5, 16)}<path class="ka-work" d="M228 134c-24 28 24 62 112 24"/>`,
      () => `${hook(370, 156)}${drop(305, 108)}<path class="ka-main" d="M50 154H348"/>${coils(294, 138, 170, 5, 10)}<path class="ka-work" d="M294 140l-20-16"/>`
    ],
    'Doppelter Grinner': [
      () => `<path class="ka-main" d="M50 144H420"/><path class="ka-work" d="M180 174H550"/>${tag(90, 128, 'SCHNUR A')}${tag(450, 198, 'SCHNUR B')}`,
      () => `<path class="ka-main" d="M50 144H420"/><path class="ka-work" d="M320 174H550"/>${coils(344, 128, 186, 4, 14)}<path class="ka-work" d="M344 128c-22 14-22 44 0 46"/>`,
      () => `<path class="ka-main" d="M50 144H270"/>${coils(190, 128, 186, 4, 14, 'ka-main')}<path class="ka-work" d="M320 174H550"/>${coils(344, 128, 186, 4, 14)}`,
      () => `${drop(300, 106)}<path class="ka-main" d="M50 156H210"/>${coils(200, 140, 174, 4, 11, 'ka-main')}<path class="ka-main" d="M244 156H356"/>${coils(356, 140, 174, 4, 11)}<path class="ka-work" d="M400 156H550"/>`,
      () => `<path class="ka-main" d="M50 156H268"/>${coils(268, 140, 172, 4, 9, 'ka-main')}${coils(306, 140, 172, 4, 9)}<path class="ka-work" d="M342 156H550"/>`
    ],
    'Albrightknoten': [
      () => `<path class="ka-main" d="M50 142H360c44 0 44 36 0 36H140"/>${tag(90, 126, 'VORFACH')}`,
      () => `<path class="ka-main" d="M50 142H360c44 0 44 36 0 36H140"/><path class="ka-work" d="M550 160H340c-28 0-40-18-16-24"/>`,
      () => `<path class="ka-main" d="M50 142H360c44 0 44 36 0 36H140"/>${coils(240, 130, 190, 8, 14)}<path class="ka-work" d="M352 160H550"/>`,
      () => `<path class="ka-main" d="M50 142H360c44 0 44 36 0 36H140"/>${coils(240, 130, 190, 8, 14)}<path class="ka-work" d="M240 130c-22 14-14 48 14 48h104"/>`,
      () => `${drop(300, 108)}<path class="ka-main" d="M50 156H272"/>${coils(272, 142, 170, 8, 9)}<path class="ka-work" d="M344 156H550"/>`
    ],
    'Blutknoten': [
      () => `<path class="ka-main" d="M50 148H350"/><path class="ka-work" d="M250 172H550"/><path class="ka-main" d="M350 148l28 24"/><path class="ka-work" d="M250 172l-28-24"/>`,
      () => `<path class="ka-main" d="M50 156H330"/>${coils(316, 138, 174, 5, 14)}<path class="ka-work" d="M386 156H550"/><path class="ka-work" d="M316 138l-16 62"/>`,
      () => `<path class="ka-main" d="M50 156H210"/>${coils(210, 138, 174, 5, 14, 'ka-main')}<path class="ka-main" d="M280 138l16-42"/>${coils(316, 138, 174, 5, 14)}<path class="ka-work" d="M386 156H550"/><path class="ka-work" d="M316 174l-16 42"/>`,
      () => `${drop(300, 104)}<path class="ka-main" d="M50 156H230"/>${coils(230, 140, 172, 4, 12, 'ka-main')}<path class="ka-main" d="M294 140v-30"/>${coils(312, 140, 172, 4, 12)}<path class="ka-work" d="M360 156H550"/><path class="ka-work" d="M294 172v30"/>`,
      () => `<path class="ka-main" d="M50 156H268"/>${coils(268, 142, 170, 4, 8, 'ka-main')}${coils(302, 142, 170, 4, 8)}<path class="ka-work" d="M334 156H550"/>`
    ],
    'Doppelter Uni-Knoten': [
      () => `<path class="ka-main" d="M50 144H430"/><path class="ka-work" d="M170 172H550"/>`,
      () => `<path class="ka-main" d="M50 144H430"/><path class="ka-work" d="M320 172H550"/>${coils(344, 124, 188, 5, 13)}<path class="ka-work" d="M344 124c-26 16-26 50 0 48"/>`,
      () => `<path class="ka-main" d="M50 144H250"/>${coils(184, 124, 188, 5, 13, 'ka-main')}<path class="ka-work" d="M320 172H550"/>${coils(344, 124, 188, 5, 13)}`,
      () => `<path class="ka-main" d="M50 156H200"/>${coils(200, 140, 172, 5, 10, 'ka-main')}<path class="ka-main" d="M250 156H350"/>${coils(350, 140, 172, 5, 10)}<path class="ka-work" d="M400 156H550"/>`,
      () => `<path class="ka-main" d="M50 156H256"/>${coils(256, 140, 172, 5, 9, 'ka-main')}${coils(304, 140, 172, 5, 9)}<path class="ka-work" d="M348 156H550"/>`
    ],
    'Chirurgenknoten': [
      () => `<path class="ka-main" d="M50 148H430"/><path class="ka-work" d="M170 166H550"/>`,
      () => `<path class="ka-main" d="M50 156H220c32-64 128-64 160 0"/><path class="ka-work" d="M550 156H380c-32 64-128 64-160 0"/>`,
      () => `<path class="ka-main" d="M50 156H220c34-54 126-54 160 0-16 32-52 36-80 12-28 24-64 20-80-12"/><path class="ka-work" d="M550 156H380c-34 54-126 54-160 0 16-32 52-36 80-12 28-24 64-20 80 12"/>`,
      () => `${drop(300, 106)}<path class="ka-main" d="M50 156H254c18-32 74-32 92 0"/><path class="ka-work" d="M550 156H346c-18 32-74 32-92 0"/>`,
      () => `<path class="ka-main" d="M50 156H276"/>${coils(276, 142, 170, 4, 12)}<path class="ka-work" d="M324 156H550"/>`
    ],
    'FG-Knoten': [
      () => `<path class="ka-main" d="M50 156H480"/><path class="ka-work" d="M300 78V234"/>${tag(80, 136, 'FLUORO')}${tag(318, 92, 'GEFLECHT')}`,
      () => `<path class="ka-main" d="M50 156H480"/><path class="ka-work" d="M260 92l28 128 28-128 28 128"/>`,
      () => `<path class="ka-main" d="M50 156H480"/>${Array.from({ length: 12 }, (_, i) => `<path class="ka-work" d="M${210 + i * 14} 138l10 36"/>`).join('')}`,
      () => `<path class="ka-main" d="M50 156H480"/>${Array.from({ length: 12 }, (_, i) => `<path class="ka-work" d="M${210 + i * 14} 142l8 28"/>`).join('')}<path class="ka-work" d="M380 156c16-24 36 24 52 0"/>`,
      () => `<path class="ka-main" d="M50 156H230"/>${Array.from({ length: 14 }, (_, i) => `<path class="ka-work" d="M${230 + i * 9} 146v20"/>`).join('')}<path class="ka-work" d="M356 156H550"/>`
    ],
    'PR-Knoten': [
      () => `<path class="ka-main" d="M50 150H460"/><path class="ka-work" d="M180 176H550"/>${tag(390, 128, 'BOBBIN-ZUG')}`,
      () => `<path class="ka-main" d="M50 156H450"/>${coils(240, 138, 174, 10, 14)}<path class="ka-work" d="M380 156H550"/>`,
      () => `<path class="ka-main" d="M50 156H450"/>${coils(254, 142, 170, 12, 9)}<path class="ka-work" d="M362 156H550"/>`,
      () => `<path class="ka-main" d="M50 156H450"/>${coils(254, 142, 170, 12, 9)}<path class="ka-work" d="M362 156c14-22 28 22 42 0H550"/>`,
      () => `<path class="ka-main" d="M50 156H260"/>${coils(260, 144, 168, 12, 8)}<path class="ka-work" d="M356 156H550"/>`
    ],
    'Mahin-Knoten': [
      () => `<path class="ka-main" d="M50 144H360c36 0 36 28 0 28H170"/>`,
      () => `<path class="ka-main" d="M50 144H360c36 0 36 28 0 28H170"/><path class="ka-work" d="M550 158H336c-22 0-32-14-14-22"/>`,
      () => `<path class="ka-main" d="M50 144H360c36 0 36 28 0 28H170"/>${coils(236, 134, 184, 7, 14)}<path class="ka-work" d="M336 158H550"/>`,
      () => `<path class="ka-main" d="M50 144H360c36 0 36 28 0 28H170"/>${coils(236, 134, 184, 7, 14)}<path class="ka-work" d="M236 134c-20 14-10 42 18 42h104"/>`,
      () => `<path class="ka-main" d="M50 156H268"/>${coils(268, 144, 168, 7, 9)}<path class="ka-work" d="M332 156H550"/>`
    ],
    'Yucatan-Knoten': [
      () => `<path class="ka-main" d="M50 142H340c50 0 50 32 0 32H110"/>`,
      () => `<path class="ka-main" d="M50 142H340c50 0 50 32 0 32H110"/><path class="ka-work" d="M550 158H326c-24 0-32-16-12-24"/>`,
      () => `<path class="ka-main" d="M50 142H340c50 0 50 32 0 32H110"/>${coils(216, 130, 186, 8, 14)}<path class="ka-work" d="M330 158H550"/>`,
      () => `<path class="ka-main" d="M50 142H340c50 0 50 32 0 32H110"/>${coils(216, 130, 186, 8, 14)}<path class="ka-work" d="M216 130c-18 18-10 48 16 48h128"/>`,
      () => `${drop(295, 106)}<path class="ka-main" d="M50 156H268"/>${coils(268, 142, 170, 7, 10)}<path class="ka-work" d="M338 156H550"/>`
    ],
    'Slim Beauty': [
      () => `<path class="ka-main" d="M50 156H210c14-34 46-34 46 0 0 32-30 32-10-12 18-26 60-20 120 12"/>`,
      () => `<path class="ka-main" d="M50 156H210c14-28 42-28 42 0h160"/><path class="ka-work" d="M236 156h40"/>${coils(280, 138, 174, 4, 14)}<path class="ka-work" d="M336 156H550"/>`,
      () => `<path class="ka-main" d="M50 156H210c14-28 42-28 42 0h160"/>${coils(280, 138, 174, 4, 14)}<path class="ka-work" d="M336 156c24-30-16-46-66-34l-36 34"/>`,
      () => `<path class="ka-main" d="M50 156H210c14-28 42-28 42 0h160"/>${coils(248, 138, 174, 4, 11)}${coils(300, 138, 174, 4, 11)}<path class="ka-work" d="M344 156H550"/>`,
      () => `<path class="ka-main" d="M50 156H258"/>${coils(258, 142, 170, 8, 9)}<path class="ka-work" d="M330 156H550"/>`
    ],
    'Doppelter Überhand-Schlaufenknoten': [
      () => `<path class="ka-main" d="M50 156H230"/><path class="ka-work" d="M230 156h170c56 0 56 36 0 36H230"/>`,
      () => `<path class="ka-main" d="M50 156H220"/><path class="ka-work" d="M220 156c22-56 96-56 108 0 14 58 106 58 140 10 24-34-18-68-78-38"/>`,
      () => `<path class="ka-main" d="M50 156H210"/><path class="ka-work" d="M210 156c18-50 62-50 74 0 14 50 58 50 70 0 12-40 94-40 118 0 18 32-14 56-72 28"/>`,
      () => `${drop(270, 104)}<path class="ka-main" d="M50 156H236"/><path class="ka-work" d="M236 156c16-30 40-30 50 0 12 30 36 30 46 0 14-28 96-28 124 0 22 22-8 48-68 24"/>`,
      () => `<path class="ka-main" d="M50 156H264"/><path class="ka-work" d="M264 156c12-22 28-22 36 0 10 22 24 22 32 0 14-24 102-24 128 0 20 18-10 38-72 16"/>`
    ],
    'Achterknoten': [
      () => `<path class="ka-main" d="M50 162H230"/><path class="ka-work" d="M230 162c60-68 176-68 228 0 30 38-20 72-120 34"/>`,
      () => `<path class="ka-main" d="M50 162H220"/><path class="ka-work" d="M220 162c36-64 104-64 104 0 0 56 116 56 144 0 22-44-40-78-112-34"/>`,
      () => `<path class="ka-main" d="M50 156H214"/><path class="ka-work" d="M214 156c24-52 72-52 84 0 12 52 56 52 72 0 18-48 86-40 104 0 16 36-32 62-96 24-44-26-84 22-124 4"/>`,
      () => `<path class="ka-main" d="M50 156H232"/><path class="ka-work" d="M232 156c18-36 52-36 62 0 10 36 44 36 56 0 18-32 94-30 112 0 14 24-22 44-80 20"/>`,
      () => `${drop(290, 108)}<path class="ka-main" d="M50 156H258"/><path class="ka-work" d="M258 156c12-24 34-24 42 0 8 24 30 24 38 0 16-24 98-24 118 0 16 18-14 36-74 16"/>`
    ],
    'Springerschlaufe': [
      () => `<path class="ka-main" d="M50 204H240"/><path class="ka-work" d="M240 204c0-96 120-96 120 0"/><path class="ka-main" d="M360 204H550"/>`,
      () => `<path class="ka-main" d="M50 204H248"/><path class="ka-work" d="M248 204c34-36-22-92 52-92 74 0 18 56 52 92"/><path class="ka-main" d="M352 204H550"/>`,
      () => `<path class="ka-main" d="M50 204H250"/><path class="ka-work" d="M250 204c28-36-18-98 50-98 68 0 22 62 50 98M278 148c14-48 30-48 44 0"/><path class="ka-main" d="M350 204H550"/>`,
      () => `<path class="ka-main" d="M50 204H264"/><path class="ka-work" d="M264 204c18-24 54-24 72 0M280 184c-24-86 64-86 40 0"/><path class="ka-main" d="M336 204H550"/>`,
      () => `${drop(300, 174)}<path class="ka-main" d="M50 204H280"/><path class="ka-work" d="M280 204c10-18 30-18 40 0M286 190c-18-88 46-88 28 0"/><path class="ka-main" d="M320 204H550"/>`
    ],
    'Perfekte Schlaufe': [
      () => `<path class="ka-main" d="M50 156H240"/><path class="ka-work" d="M240 156c0-56 96-56 96 0s-96 56-96 0"/>`,
      () => `<path class="ka-main" d="M50 156H240"/><path class="ka-work" d="M240 156c0-52 86-52 86 0s-86 52-86 0m54 0c0-38 72-38 72 0s-72 38-72 0"/>`,
      () => `<path class="ka-main" d="M50 156H240"/><path class="ka-work" d="M240 156c0-46 72-46 72 0s-72 46-72 0m66 0c22-40 112-40 132 0 18 36-86 42-132 0"/>`,
      () => `<path class="ka-main" d="M50 156H248"/><path class="ka-work" d="M248 156c12-30 44-30 56 0 12 30-44 30-56 0m56 0c24-32 112-32 134 0 18 26-90 32-134 0"/>`,
      () => `<path class="ka-main" d="M50 156H268"/><path class="ka-work" d="M268 156c8-18 28-18 36 0 8 18-28 18-36 0m36 0c24-24 118-24 142 0 20 20-96 26-142 0"/>`
    ],
    'Dropper-Loop': [
      () => `<path class="ka-main" d="M50 198H220"/><path class="ka-work" d="M220 198c0-108 160-108 160 0"/><path class="ka-main" d="M380 198H550"/>`,
      () => `<path class="ka-main" d="M50 198H236"/><path class="ka-work" d="M236 198c24-28 104-28 128 0M268 176c24-24-24-56 32-56 56 0 8 32 32 56"/><path class="ka-main" d="M364 198H550"/>`,
      () => `<path class="ka-main" d="M50 198H246"/><path class="ka-work" d="M246 198c22-22 86-22 108 0M272 178c-12-74 68-74 56 0"/><path class="ka-main" d="M354 198H550"/>`,
      () => `<path class="ka-main" d="M50 198H262"/><path class="ka-work" d="M262 198c16-18 60-18 76 0M282 184c-16-86 52-86 36 0"/><path class="ka-main" d="M338 198H550"/>`,
      () => `${drop(300, 174)}<path class="ka-main" d="M50 198H278"/><path class="ka-work" d="M278 198c12-14 32-14 44 0M288 188c-14-88 38-88 24 0"/><path class="ka-main" d="M322 198H550"/>`
    ],
    'Arborknoten': [
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M194 160c0-74 172-74 172 0s-172 74-172 0h100"/>`,
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M194 160c0-74 172-74 172 0s-172 74-172 0m172 0c32-24 56 24 88 0"/>`,
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M366 160c14-24 34 24 48 0h66c12-18 24 18 12 0"/>${tag(446, 128, 'STOPPER')}`,
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M194 160c0-70 164-70 164 0s-164 70-164 0m172 0c10-16 24 16 34 0h34"/>`,
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M194 160c0-66 156-66 156 0s-156 66-156 0m158 0c8-14 18 14 26 0"/>`
    ],
    'Mümmelmannknoten': [
      () => `${hook(380, 156, 13)}<path class="ka-main" d="M50 156H364"/><path class="ka-work" d="M364 156c18 0 22-18 6-28"/>`,
      () => `${hook(380, 156, 13)}<path class="ka-main" d="M50 156H364"/><path class="ka-work" d="M364 156c-18-38-76-38-76 0 0 30 46 30 62 4"/>`,
      () => `${hook(380, 156, 13)}<path class="ka-main" d="M50 156H364"/>${coils(298, 138, 174, 4, 13)}<path class="ka-work" d="M298 138c-22 14-14 38 14 38"/>`,
      () => `${hook(380, 156, 13)}${drop(320, 108)}<path class="ka-main" d="M50 156H364"/>${coils(316, 140, 172, 4, 10)}<path class="ka-work" d="M316 140l-20-16"/>`,
      () => `${hook(380, 156, 13)}<path class="ka-main" d="M50 156H364"/>${coils(328, 142, 170, 4, 8)}`
    ],
    'Centauri-Knoten': [
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/><path class="ka-work" d="M50 162H350c28 0 28-12 0-12"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/><path class="ka-work" d="M348 156c-36-54-146-54-174 0"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/>${coils(220, 132, 176, 4, 16)}<path class="ka-work" d="M348 156c-22-34-80-34-128-24"/>`,
      () => `${hook(370, 156)}${drop(280, 106)}<path class="ka-main" d="M50 150H350"/>${coils(220, 132, 176, 4, 16)}<path class="ka-work" d="M220 132c-22 26 20 62 114 26"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 154H348"/>${coils(298, 138, 170, 4, 10)}<path class="ka-work" d="M298 140l-20-16"/>`
    ],
    'Pitzen-Knoten': [
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/><path class="ka-work" d="M350 150c-30-46-114-46-140 0"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/><path class="ka-work" d="M350 150c14 18-16 20-140 20"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/>${coils(226, 132, 174, 4, 15)}<path class="ka-work" d="M332 144c-14-14-14 34 0 22"/>`,
      () => `${hook(370, 156)}<path class="ka-main" d="M50 150H350"/>${coils(226, 132, 174, 4, 15)}<path class="ka-work" d="M226 132c-22 24 18 58 106 26"/>`,
      () => `${hook(370, 156)}${drop(310, 108)}<path class="ka-main" d="M50 154H348"/>${coils(298, 138, 170, 4, 10)}<path class="ka-work" d="M298 140l-18-16"/>`
    ],
    'Non-Slip Mono Loop': [
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H205"/><path class="ka-work" d="M205 156c16-32 48-32 48 0 0 28-30 28-10-10 14-26 56-16 86 10"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H210"/><path class="ka-work" d="M210 156c14-28 42-28 42 0 12 24 148 24 156 0-14-24-112-18-162 12"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H198"/>${coils(212, 136, 176, 4, 14)}<path class="ka-work" d="M268 156c24 24 120 24 140 0"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H198"/>${coils(212, 136, 176, 4, 14)}<path class="ka-work" d="M198 156c-14-32 34-44 68-18 32 26 120 34 142 18"/>`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H290"/>${coils(290, 142, 170, 4, 9)}<path class="ka-work" d="M326 156c18-24 68-24 82 0-14 24-64 24-82 0"/>`
    ]
  };

  function drawing(knot, step) {
    const arrowId = `ka-${knot.id}`;
    const defs = `<defs><marker id="${arrowId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 10 5 0 10Z" fill="${C.orange}"/></marker></defs>`;
    const arrow = path => `<path class="ka-arrow" d="${path}" marker-end="url(#${arrowId})"/>`;
    const frames = knotDrawers[knot.name];
    const body = frames && frames[step] ? frames[step]() : '';
    const p = step / (knot.steps.length - 1);
    const arrowPath = step < knot.steps.length - 1
      ? `M${500 - p * 90} 88C${455 - p * 55} 96 ${410 - p * 40} 114 ${365 - p * 20} 134`
      : 'M240 270H360';
    return `${defs}${body}${step < knot.steps.length - 1 ? arrow(arrowPath) : ''}`;
  }

  function player(knot) { return `<section class="knot-animator" aria-label="${esc(knot.name)} Schritt-für-Schritt-Anleitung"><div class="knot-animator-top"><span>INTERAKTIVE KNOTENSCHULE</span><strong class="knot-step-count" aria-live="polite"></strong></div><div class="knot-stage"><svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid meet"></svg></div><div class="knot-copy"><strong class="knot-step-title"></strong><p class="knot-step-text"></p></div><div class="knot-dots" role="group" aria-label="Schritt direkt auswählen">${knot.steps.map((_, i) => `<button class="knot-dot" type="button" data-step="${i}" aria-label="Schritt ${i + 1} wählen">${i + 1}</button>`).join('')}</div><div class="knot-controls" role="group" aria-label="Animation steuern"><button type="button" data-action="back">⏮ Zurück</button><button type="button" class="knot-play" data-action="play">▶ Abspielen</button><button type="button" data-action="next">Weiter ⏭</button><button type="button" data-action="restart">🔁 Neu starten</button></div><div class="knot-speed"><span>Tempo</span><button type="button" data-action="normal" aria-pressed="true">Normal</button><button type="button" data-action="slow" aria-pressed="false">Langsam</button></div><p class="knot-colour-key"><span><i class="key-blue"></i>Hauptschnur</span><span><i class="key-orange"></i>Arbeitsende</span><span><i class="key-metal"></i>Haken, Öse oder Spule</span><span>↗ Bewegungsrichtung</span></p></section>`; }
  function mount(element, knot) {
    let current = 0, timer = null, duration = 3000;
    const svg = element.querySelector('svg'), count = element.querySelector('.knot-step-count'), title = element.querySelector('.knot-step-title'), text = element.querySelector('.knot-step-text'), play = element.querySelector('[data-action="play"]'), dots = [...element.querySelectorAll('.knot-dot')];
    const stop = () => { if (timer) clearInterval(timer); timer = null; play.textContent = '▶ Abspielen'; };
    const render = () => { const last = current === knot.steps.length - 1; svg.innerHTML = `<rect width="600" height="320" rx="18" class="ka-bg"/><text x="28" y="38" class="ka-name">${esc(knot.name.toUpperCase())}</text>${drawing(knot, current)}<text x="300" y="292" class="ka-state">${last ? 'SITZ PRÜFEN' : 'BEWEGUNG FOLGEN'}</text>`; count.textContent = `Schritt ${current + 1} von ${knot.steps.length}`; title.textContent = `Schritt ${current + 1}: ${knot.steps[current]}`; text.textContent = last ? 'Prüfe die Verbindung mit einer kurzen Zugprobe. Erst danach den Überstand sauber kürzen.' : 'Folge dem orangefarbenen Ende. Die blaue Hauptschnur bleibt fixiert.'; dots.forEach((dot, i) => { dot.classList.toggle('active', i === current); dot.classList.toggle('passed', i < current); }); element.querySelector('[data-action="back"]').disabled = current === 0; element.querySelector('[data-action="next"]').disabled = last; };
    const next = () => { if (current < knot.steps.length - 1) { current += 1; render(); } else stop(); };
    element.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; if (button.dataset.step !== undefined) { stop(); current = Number(button.dataset.step); return render(); } switch (button.dataset.action) { case 'back': stop(); current = Math.max(0, current - 1); render(); break; case 'next': stop(); next(); break; case 'restart': stop(); current = 0; render(); break; case 'play': if (timer) stop(); else { play.textContent = '⏸ Pause'; timer = setInterval(next, duration); } break; case 'normal': case 'slow': { const wasPlaying = Boolean(timer); stop(); duration = button.dataset.action === 'slow' ? 5200 : 3000; element.querySelector('[data-action="normal"]').setAttribute('aria-pressed', String(duration === 3000)); element.querySelector('[data-action="slow"]').setAttribute('aria-pressed', String(duration === 5200)); if (wasPlaying) { play.textContent = '⏸ Pause'; timer = setInterval(next, duration); } break; } } });
    render();
  }
  function category(index) { const group = groups[index]; return `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><strong>Knoten</strong></div><header class="knot-section-head"><a class="btn-outline btn-sm" href="#knoten">Alle Kategorien</a><h2>${group[0]} <span>(5)</span></h2></header><div class="knot-card-grid">${knots.filter(k => k.categoryIndex === index).map(k => `<a class="knot-card" href="#knoten-knot-${k.id}"><span class="knot-card-icon">${k.icon}</span><span><strong>${esc(k.name)}</strong><small>${esc(k.use)}</small></span></a>`).join('')}</div>`; }
  function detail(knot) { const root = document.getElementById('knot-view-content'), at = knots.indexOf(knot), previous = knots[(at + 29) % 30], next = knots[(at + 1) % 30]; root.innerHTML = `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><a href="#knoten-kat-${knot.categoryIndex}">${esc(knot.category)}</a><span>›</span><strong>${esc(knot.name)}</strong></div><article class="knot-detail"><header class="knot-detail-head"><p class="eyebrow">${esc(knot.category)}</p><h2>${esc(knot.name)}</h2><p>${esc(knot.use)}</p></header>${player(knot)}<section class="knot-facts" aria-label="Knoten-Steckbrief"><div><b>EINSATZZWECK</b><span>${esc(knot.use)}</span></div><div><b>GEEIGNETE SCHNUR</b><span>${esc(knot.line)}</span></div><div><b>TRAGKRAFT</b><span>ca. ${esc(knot.strength)}</span></div><div><b>PRAXIS-TIPP</b><span>${esc(knot.tip)}</span></div></section><nav class="knot-detail-actions"><a class="btn-outline btn-sm" href="#knoten-knot-${previous.id}">Vorheriger Knoten</a><a class="btn-outline btn-sm" href="#knoten-kat-${knot.categoryIndex}">Zur Kategorie</a><a class="btn-primary btn-sm" href="#knoten-knot-${next.id}">Nächster Knoten</a></nav></article>`; mount(root.querySelector('.knot-animator'), knot); }
  function route(hash = 'knoten') { const root = document.getElementById('knot-view-content'); if (!root) return; const match = hash.match(/^knoten-knot-(\d+)-(\d+)$/), cat = hash.match(/^knoten-kat-(\d+)$/); if (match) { const knot = knots.find(k => k.id === `${match[1]}-${match[2]}`); if (knot) return detail(knot); } if (cat && groups[Number(cat[1])]) { root.innerHTML = category(Number(cat[1])); return; } root.innerHTML = `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><strong>Alle Kategorien</strong></div><header class="knot-hero"><p class="eyebrow">STERNI-APP · ANGELKNOTEN-LEXIKON</p><h1 id="knoten-heading">30 Knoten – Schritt für Schritt</h1><p>Blau ist die Hauptschnur, Orange das geführte Arbeitsende. Jeder Knoten läuft in derselben lokalen Animations-Engine.</p></header><div class="knot-card-grid knot-category-grid">${groups.map((g, i) => `<a class="knot-card knot-category-card" href="#knoten-kat-${i}"><span class="knot-card-icon">${g[1]}</span><span><strong>${g[0]}</strong><small>5 Angelknoten</small></span></a>`).join('')}</div>`; }
  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    route(location.hash.replace(/^#/, '') || 'knoten');
    window.addEventListener('hashchange', () => { if (location.hash.startsWith('#knoten')) route(location.hash.slice(1)); });
  }
  window.STERNI_KNOTS = { init, route, knots, version: 3 };
  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
