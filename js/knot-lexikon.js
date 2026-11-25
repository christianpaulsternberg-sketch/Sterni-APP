/* Sterni-App · Professionelle interaktive Angelknoten-Engine nach dem Animated-Knots-Prinzip */
(() => {
  'use strict';

  const C = {
    blue: '#38bdf8',      // Hauptschnur (stehendes Ende)
    orange: '#fb923c',    // Arbeitsende / Vorfach (geführtes Ende)
    metal: '#cbd5e1',     // Haken, Öhr, Wirbel, Spule (Silber/Grau)
    metalDark: '#334155', // Metall-Kontur
    arrow: '#facc15',     // Bewegungsrichtungspfeil (Gelb/Gold)
    bg: '#081322'         // Dunkler Hintergrund
  };

  const groups = [
    ['Grundknoten', '◉', 'Öhrhaken, Wirbel und Snaps', 'Monofil, Fluorocarbon, Geflochtene', '90–95 %', 'Vor dem Festziehen immer gründlich anfeuchten.', 'eye', ['Palomarknoten', 'Verbesserter Clinchknoten', 'Grinnerknoten (Uni)', 'Trilene-Knoten', 'Schlaufenknoten']],
    ['Haken & Köder', '⌁', 'Haken, Wobbler und Kunstköder', 'Monofil oder Fluorocarbon', '85–95 %', 'Der Köder braucht ausreichend freies Spiel für optimalen Lauf.', 'eye', ['Rapalaknoten', 'Snellknoten', 'Knotless Knot', 'Schlaufenknoten am Wobbler', 'Doppelter Clinch']],
    ['Schnüre verbinden', '∞', 'Hauptschnur und Vorfach verbinden', 'Mono, Fluorocarbon, Geflochtene', '80–95 %', 'Beide Schnüre beim Zuziehen gleichmäßig belasten.', 'join', ['Doppelter Grinner', 'Albrightknoten', 'Blutknoten', 'Doppelter Uni-Knoten', 'Chirurgenknoten']],
    ['Geflochtene & Vorfächer', '≋', 'Geflecht mit starkem Vorfach verbinden', 'Geflochtene mit Fluorocarbon', '85–95 %', 'Wicklungen eng, parallel und unter hoher Spannung legen.', 'braid', ['FG-Knoten', 'PR-Knoten', 'Mahin-Knoten', 'Yucatan-Knoten', 'Slim Beauty']],
    ['Schlaufen & Montagen', '◌', 'Schlaufen, Seitenarme und Montagen', 'Monofil und Fluorocarbon', '80–90 %', 'Schlaufe vor dem endgültigen Festziehen sorgfältig ausrichten.', 'loop', ['Doppelter Überhand-Schlaufenknoten', 'Achterknoten', 'Springerschlaufe', 'Perfekte Schlaufe', 'Dropper-Loop']],
    ['Spezialknoten', '★', 'Spezielle Verbindungen und Rollenspulen', 'Je nach Einsatz Mono, Fluorocarbon oder Geflecht', '80–95 %', 'Immer eine kräftige Zugprobe machen, bevor der Überstand gekürzt wird.', 'special', ['Arborknoten', 'Mümmelmannknoten', 'Centauri-Knoten', 'Pitzen-Knoten', 'Non-Slip Mono Loop']]
  ];

  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // SVG-Geometrie-Helfer für realistische Knotendarstellung
  const hook = (cx = 380, cy = 156, r = 16) =>
    `<g class="ka-metal">` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ka-metal-grad)" stroke-width="6"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="#081322" stroke="#1e293b" stroke-width="2"/>` +
      `<path d="M${cx} ${cy + r}v65c0 30 26 40 44 40c22 0 40-16 40-36v-18l-12 14" fill="none" stroke="url(#ka-metal-grad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g>`;

  const swivel = (cx = 380, cy = 156) =>
    `<g class="ka-metal">` +
      `<circle cx="${cx - 40}" cy="${cy}" r="12" fill="none" stroke="url(#ka-metal-grad)" stroke-width="5"/>` +
      `<rect x="${cx - 24}" y="${cy - 9}" width="30" height="18" rx="4" fill="url(#ka-metal-grad)" stroke="#1e293b" stroke-width="2"/>` +
      `<circle cx="${cx + 18}" cy="${cy}" r="12" fill="none" stroke="url(#ka-metal-grad)" stroke-width="5"/>` +
    `</g>`;

  const wobbler = (cx = 410, cy = 156) =>
    `<g class="ka-metal"><circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="url(#ka-metal-grad)" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="6" fill="#081322"/></g>` +
    `<polygon points="${cx + 10},${cy + 4} ${cx - 16},${cy + 22} ${cx - 8},${cy + 28} ${cx + 18},${cy + 10}" fill="rgba(148,163,184,0.4)" stroke="#64748b" stroke-width="2"/>` +
    `<path class="ka-lure" d="M${cx + 8} ${cy}c18-22 62-26 108-14c28 8 44 14 44 14s-16 12-44 18c-46 10-90 4-108-18Z"/>` +
    `<circle cx="${cx + 26}" cy="${cy - 5}" r="4" fill="#facc15" stroke="#1e293b" stroke-width="1.5"/><circle cx="${cx + 26}" cy="${cy - 5}" r="1.8" fill="#081322"/>` +
    `<path class="ka-metal" d="M${cx + 20} ${cy + 12}l-10 24m-6 10l6-10 6 10" fill="none" stroke="url(#ka-metal-grad)" stroke-width="3"/>`;

  const spool = (cx = 290, cy = 160) =>
    `<g class="ka-metal">` +
      `<ellipse cx="${cx}" cy="${cy}" rx="92" ry="56" fill="#0b1e36" stroke="url(#ka-metal-grad)" stroke-width="8"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="70" ry="42" fill="#071526" stroke="#334155" stroke-width="4"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="30" ry="20" fill="url(#ka-metal-grad)" stroke="#1e293b" stroke-width="4"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="14" ry="9" fill="#081322"/>` +
    `</g>`;

  const drop = (x = 280, y = 100) =>
    `<g class="ka-drop-group">` +
      `<path class="ka-water" d="M${x} ${y - 18}c6 10 12 16 12 22a12 12 0 1 1-24 0c0-6 6-12 12-22Z"/>` +
      `<path d="M${x - 4} ${y + 4}a4 4 0 0 1 4-4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="${x + 22}" cy="${y - 8}" r="4.5" class="ka-water"/>` +
      `<circle cx="${x - 18}" cy="${y + 12}" r="3" class="ka-water"/>` +
      `<text x="${x + 36}" y="${y + 6}" class="ka-drop-tag">💧 ANFEUCHTEN</text>` +
    `</g>`;

  const trim = (x = 340, y = 115) =>
    `<g class="ka-trim-group"><text x="${x}" y="${y}" class="ka-trim-tag">✂ ÜBERSTAND 2–3 mm</text></g>`;

  const coils = (x0, yTop, yBot, count, step = 15, cls = 'ka-work') => {
    let s = '';
    for (let i = 0; i < count; i++) {
      const x = x0 + i * step;
      s += `<path class="${cls}" d="M${x} ${yTop}c-12 14-12 ${yBot - yTop - 14} 0 ${yBot - yTop}"/>`;
    }
    return s;
  };

  const arrow = d => `<path class="ka-arrow" d="${d}" marker-end="url(#ka-arrow-head)"/>`;
  const tag = (x, y, text) => `<text x="${x}" y="${y}" class="ka-tag">${esc(text)}</text>`;

  // Detaillierte Schrittanweisungen für alle 30 Knoten
  const details = {
    'Palomarknoten': [
      'Doppelte Schnur durch die Öse führen: Hauptschnur auf 15 cm doppelt legen und die Schlaufe von vorne durch das Hakenöhr schieben.',
      'Lockerer Überhandknoten: Mit der doppelten Schnur einen einfachen Überhandknoten legen, ohne ihn bereits zuzuziehen.',
      'Schlaufe über den Haken klappen: Die große Schlaufe vollständig über die Hakenspitze und den Bogen nach oben führen.',
      'Schnur anfeuchten: Knoten gründlich mit Wasser oder Speichel befeuchten, um Hitzereibung zu verhindern.',
      'Gleichmäßig festziehen: An Hauptschnur und losem Ende ziehen – der Knoten verriegelt bombenfest am Hakenöhr. Überstand auf 2 mm kürzen.'
    ],
    'Verbesserter Clinchknoten': [
      'Arbeitsende durch die Öse führen: Das orange Ende von vorne durch das Hakenöhr oder den Wirbel stecken.',
      'Wicklungen legen: Das orange Arbeitsende fünf- bis siebenmal sauber um die blaue Hauptschnur nach vorne wickeln.',
      'Zurück durch die kleine Schlaufe: Das Arbeitsende durch die kleine Schlaufe direkt vor dem Hakenöhr stecken.',
      'Durch die große Schlaufe & anfeuchten: Das Ende durch die neu entstandene große Schlaufe führen und gründlich anfeuchten.',
      'Fest an die Öse schieben: Windungen zur Öse heranschieben, gleichmäßig strammziehen und Überstand sauber kappen.'
    ],
    'Grinnerknoten (Uni)': [
      'Durch die Öse und zurücklegen: Arbeitsende durch das Öhr führen und parallel zur blauen Hauptschnur zurücklegen.',
      'Schlaufe bilden: Mit dem orangefarbenen Ende eine offene Schlaufe über beide Stränge legen.',
      'Innenwicklungen: Das Arbeitsende fünf- bis sechsmal von innen durch die Schlaufe um beide Stränge wickeln.',
      'Wicklung schließen & anfeuchten: Knoten am Arbeitsende leicht vorziehen und gründlich befeuchten.',
      'Bis zur Öse schieben: Den fertigen Knoten an der Hauptschnur bis direkt an die Öse gleiten lassen und fest verriegeln.'
    ],
    'Trilene-Knoten': [
      'Zweimal durch die Öse: Das Arbeitsende zweimal durch das Hakenöhr führen, sodass eine doppelte Basisschlinge entsteht.',
      'Schlaufe offen halten & wickeln: Die Basisschlinge offen halten und das Ende fünfmal um die Hauptschnur wickeln.',
      'Durch die doppelte Schlinge: Das Arbeitsende zurückführen und durch BEIDE Schlaufen an der Öse stecken.',
      'Anfeuchten & formen: Den Knoten gründlich befeuchten und die Windungen gleichmäßig vorformen.',
      'Bombenfest verriegeln: Gleichmäßig festziehen, bis der Knoten kompakt am Öhr sitzt. Überstand kürzen.'
    ],
    'Schlaufenknoten': [
      'Schlaufe legen: Eine ausreichend große Schnurschlaufe bilden und das Arbeitsende kreuzen.',
      'Schlaufe umdrehen: Die gelegte Schlaufe einmal um die Hauptschnur führen.',
      'Durch die Öffnung führen: Das Schlaufenende von hinten durch die entstandene Hauptöffnung stecken.',
      'Schlaufengröße abstimmen: Vor dem Zuziehen die gewünschte Endgröße der Schlaufe feinjustieren und anfeuchten.',
      'Gerade festziehen: Gleichmäßig anziehen – die Schlaufe steht gerade und steif auf Schnurachse.'
    ],
    'Rapalaknoten': [
      'Überhandknoten vorbereiten: Zehn Zentimeter vor dem Schnurende einen lockeren einfachen Überhandknoten binden.',
      'Durch die Köderöse fädeln: Arbeitsende durch die Wobbleröse führen und von derselben Seite zurück durch den Knoten stecken.',
      'Um Hauptschnur wickeln: Das orange Ende dreimal um die stehende blaue Hauptschnur wickeln.',
      'Doppelt zurückstecken: Durch den ersten Überhandknoten und durch die neu gebildete Schlaufe führen. Anfeuchten.',
      'Freilaufschlaufe schließen: Auf ca. 1–1.5 cm Spiel festziehen – der Wobbler flankiert optimal im Wasser.'
    ],
    'Snellknoten': [
      'Am Schenkel anlegen: Schnur durch das Öhr führen und eine lange Schlaufe entlang des Hakenschenkels legen.',
      'Schlaufe bereithalten: Das Arbeitsende parallel zum Schenkel in Richtung Hakenbogen ausrichten.',
      'Um den Schenkel wickeln: Das orange Ende sechsmal stramm um Hakenschenkel und Schnur wickeln.',
      'Durch die Schlaufe stecken: Das Arbeitsende durch die verbliebene Schlaufe führen und anfeuchten.',
      'Zum Öhr festziehen: An der Hauptschnur ziehen, bis alle Windungen fest und glatt am Öhr verriegeln.'
    ],
    'Knotless Knot': [
      'Haarlänge einstellen: Schnur von hinten durch das Öhr führen und unten die Schlaufe für den Boilie definieren.',
      'Schenkelwicklung starten: Schnur stramm an den Schenkel legen und nach unten führen.',
      'Siebenmal eng umwickeln: Das Arbeitsende sieben- bis achtmal eng und lückenlos um den Hakenschenkel wickeln.',
      'Von hinten zurückführen: Das Schnurende erneut von hinten nach vorne durch das Hakenöhr führen.',
      'Selbstsperrend festziehen: Taut ziehen – der Haken dreht sich bei Zug sofort aggressiv in die Unterlippe.'
    ],
    'Schlaufenknoten am Wobbler': [
      'Basisknoten legen: Lockeren einfachen Knoten vor dem Ende legen und Arbeitsende durch die Köderöse stecken.',
      'Zurück durch die Basis: Ende zurück durch den vorbereiteten Knoten führen.',
      'Wicklungen anlegen: Dreimal um die blaue Hauptschnur wickeln und durch die Schlaufe stecken.',
      'Köderabstand prüfen: 1 cm Bewegungsfreiheit vor der Köderöse einstellen und anfeuchten.',
      'Kompakt zuziehen: Festziehen, sodass der Knoten starr bleibt und der Wobbler frei arbeiten kann.'
    ],
    'Doppelter Clinch': [
      'Doppelt durch die Öse: Schnur doppelt legen und als Doppelleine durch das Öhr führen.',
      'Doppelte Schlinge sichern: Die doppelte Basisschlinge am Öhr festhalten.',
      'Fünfmal umwickeln: Das doppelte Arbeitsende fünfmal um die stehende Hauptschnur wickeln.',
      'Durch beide Schlaufen führen: Ende durch die doppelte Ösenschlaufe und die Außenschlaufe stecken. Anfeuchten.',
      'Maximal strammziehen: Langsam und kraftvoll zuziehen – erreicht nahezu 100 % lineare Reißfestigkeit.'
    ],
    'Doppelter Grinner': [
      'Schnüre überlappen: Hauptschnur (Blau) und Vorfach (Orange) 25 cm gegensinnig überlappen lassen.',
      'Erster Uni-Knoten: Mit Orange eine Schlaufe über beide Stränge legen und viermal durchwickeln.',
      'Zweiter Uni-Knoten: Mit Blau spiegelbildlich eine Schlaufe über beide Stränge legen und viermal durchwickeln.',
      'Beide Knoten anfeuchten: Beide Einzelknoten separat leicht vorziehen und befeuchten.',
      'Aufeinander zuschieben: An beiden Hauptschnüren ziehen – die beiden Knoten gleiten zusammen und blockieren sich.'
    ],
    'Albrightknoten': [
      'Bucht im dicken Vorfach: Das dicke blaue Vorfach (Fluorocarbon) zu einer sauberen U-Bucht legen.',
      'Geflecht einführen: Die dünne orange Geflechtschnur von unten durch die Bucht führen.',
      'Zehnmal umwickeln: Orange zehnmal sehr eng und parallel um beide Schenkel der Bucht wickeln.',
      'Gleiche Seite zurück: Das Ende auf GENAU DERSELBEN Seite durch die Bucht zurückführen, wie es eingeführt wurde.',
      'Konisch zuziehen: Beide Schnüre gründlich befeuchten und gleichmäßig strammziehen. Überstände bündig kappen.'
    ],
    'Blutknoten': [
      'Schnüre überkreuzen: Beide gleich dicken Schnüre in der Mitte kreuzen (Enden zeigen entgegengesetzt).',
      'Erste Wicklung: Orange fünfmal um Blau wickeln und das Ende durch die mittlere Kreuzung stecken.',
      'Zweite Wicklung: Blau fünfmal gegensinnig um Orange wickeln und von der GEGENÜBERLIEGENDEN Seite durchstecken.',
      'Zentrum anfeuchten: Befeuchten und behutsam an beiden langen Hauptschnüren ziehen.',
      'Ineinander pressen: Die Windungspakete schieben sich von außen zur Mitte zusammen. Überstände kurz abschneiden.'
    ],
    'Doppelter Uni-Knoten': [
      'Schnüre parallel ausrichten: Beide Schnüre 20 cm nebeneinander halten.',
      'Erste Schlaufe binden: Mit Orange eine Schlaufe legen und fünfmal von innen um beide Schnüre wickeln.',
      'Zweite Schlaufe binden: Mit Blau die Gegenseite mit fünf Innenwicklungen um beide Schnüre binden.',
      'Knoten anfeuchten: Beide Knoten einzeln zusammenziehen und gründlich befeuchten.',
      'Gegeneinander sperren: An beiden Hauptsträngen ziehen, bis die Knoten fest aufeinandertreffen.'
    ],
    'Chirurgenknoten': [
      'Schnüre doppelt halten: Beide Schnurenden ca. 15 cm parallel nebeneinanderlegen.',
      'Gemeinsame Schlaufe: Aus beiden Schnüren zusammen eine große Schlaufe formen.',
      'Zweimal durchwickeln: Beide Schnurenden ZWEIMAL nacheinander durch die Schlaufe führen.',
      'Windungen ordnen: Schnüre anfeuchten und darauf achten, dass die Stränge parallel nebeneinanderliegen.',
      'Gleichmäßig festziehen: An allen vier Strängen gleichzeitig kräftig und gleichmäßig ziehen.'
    ],
    'FG-Knoten': [
      'Vorfach spannen: Das dicke Fluorocarbon straff spannen; Geflecht im 90°-Winkel ansetzen.',
      'Kreuzwicklungen flechten: Das Geflecht abwechselnd 20-mal über und unter das Vorfach kreuzen.',
      'Kreuzpaket spannen: Die Wicklungen eng zusammenschieben; das Geflecht schneidet sich ins Vorfach ein.',
      'Mit halben Schlägen sichern: Das Geflecht mit 4–6 alternierenden halben Schlägen sichern. Anfeuchten.',
      'Vollast-Zugprobe: Unter voller Zugkraft strecken; Vorfachüberstand bündig kappen und Endknoten sichern.'
    ],
    'PR-Knoten': [
      'Bobbin ansetzen: Geflechtschnur auf die Spule spannen und stramm an das Vorfach anlegen.',
      'Vorwärtsspulen: Den Bobbin rotieren lassen und 4 cm extrem dichte Wicklungen vorwärts legen.',
      'Rückwärtsspulen: Den Bobbin zurückführen und eine zweite dichte Lage über die erste Lage wickeln.',
      'Halbe Schläge binden: Bobbin entfernen und das Paket mit 6 alternierenden halben Schlägen absichern.',
      'Anfeuchten & verriegeln: Gründlich anfeuchten, fest verriegeln – schlankester Knoten für weite Würfe.'
    ],
    'Mahin-Knoten': [
      'Überhandknoten im Vorfach: In die dicke Schlagschnur einen einfachen Überhandknoten legen (offen lassen).',
      'Geflecht durchführen: Das dünne Geflecht von unten durch den Überhandknoten fädeln.',
      'Zehnmal vor & sechs zurück: Zehn Wicklungen nach vorne und sechs Wicklungen rückwärts darüberlegen.',
      'Zurück durch die Bucht: Geflechtsende zurück durch den Überhandknoten stecken. Anfeuchten.',
      'Kegelförmig schließen: Gleichmäßig festziehen – der Knoten verjüngt sich nach vorne und gleitet durch die Ringe.'
    ],
    'Yucatan-Knoten': [
      'Vorfach doppelt legen: Das Fluorocarbon 15 cm doppelt zu einer geschlossenen Schlaufe legen.',
      'Geflecht einführen: Dünnes Geflecht von unten durch die doppelte Vorfachschlaufe führen.',
      'Achtmal umwickeln: Geflecht acht- bis zehnmal eng um beide Schenkel des Vorfachs wickeln.',
      'Durch die Schlaufenspitze zurück: Geflecht durch das vordere Ende der Schlaufe zurückstecken. Anfeuchten.',
      'Gemeinsam festziehen: An Geflecht und Vorfach gleichmäßig anziehen – enorme Knotenfestigkeit.'
    ],
    'Slim Beauty': [
      'Vorfach-Acht vorbereiten: In das dicke Vorfach einen lockeren Achterknoten legen.',
      'Geflecht durchstecken: Das Geflecht durch die obere Öffnung des Achterknotens führen.',
      'Sieben vor & fünf zurück: Sieben enge Wicklungen nach vorne und fünf Wicklungen zurücklegen.',
      'Durch die untere Öffnung: Ende zurück durch die Öffnung führen und gründlich anfeuchten.',
      'Schlank verriegeln: Vorfach und Geflecht vorsichtig gegeneinander zuziehen. Sehr rutenringschonend.'
    ],
    'Doppelter Überhand-Schlaufenknoten': [
      'Schnur doppelt legen: Schnurende auf die gewünschte Schlaufenlänge doppelt legen.',
      'Überhandschlaufe formen: Mit dem doppelten Strang eine lockere Schlaufe legen.',
      'Zweimal durchführen: Das Schlaufenende ZWEIMAL nacheinander durch die Öffnung führen.',
      'Schlaufe ausrichten: Stränge ordnen, damit sie sich nicht überkreuzen, und anfeuchten.',
      'Gleichmäßig festziehen: Schlaufe und Hauptschnur gleichmäßig anziehen – Standard für Schlaufe-in-Schlaufe.'
    ],
    'Achterknoten': [
      'Schlaufe bilden: Schnur doppelt nehmen und eine Basisschlaufe formen.',
      'Einmal umdrehen: Das Schlaufenende um die Hauptschnur herumführen (360°-Drehung).',
      'Von unten durchstecken: Schlaufenende von unten durch die erste Öse stecken (bildet eine deutliche "8").',
      'Form prüfen & anfeuchten: Befeuchten und prüfen, dass die Acht sauber und flach liegt.',
      'Strammziehen: Gleichmäßig zuziehen – schwächt die Schnur deutlich weniger als ein Überhandknoten.'
    ],
    'Springerschlaufe': [
      'Schlaufe nach oben legen: Schnur in einer weiten Bucht nach oben führen.',
      'Mittelteil verdrillen: Die beiden Stränge unter der Schlaufe 4- bis 5-mal in sich verdrehen.',
      'Schlaufe durch die Mitte: Die obere Schlaufenspitze durch das geöffnete Zentrum der Verdrehung drücken.',
      'Seitenarm justieren: Die Länge des abstehenden Seitenarms auf 5–10 cm einstellen und befeuchten.',
      'Hauptschnur strecken: An beiden Hauptschnüren kräftig nach außen ziehen – Seitenarm steht im 90°-Winkel ab.'
    ],
    'Perfekte Schlaufe': [
      'Erste Schlaufe legen: Eine Schlaufe gegen den Uhrzeigersinn nach hinten legen.',
      'Zweite Schlaufe legen: Eine zweite Schlaufe vor die erste Schlaufe klappen.',
      'Arbeitsende durchführen: Das freie Ende zwischen beiden Schlaufen durchlegen.',
      'Schlaufe durchziehen: Die vordere Schlaufe durch die hintere Schlaufe greifen und durchziehen. Anfeuchten.',
      'Achsenrein festziehen: Zuziehen – die Schlaufe steht perfekt in der Flucht der Vorfachschnur.'
    ],
    'Dropper-Loop': [
      'Montageschlaufe bilden: An der gewünschten Beifänger-Position eine weite Schnurschlaufe legen.',
      'Mehrfach verdrehen: Die Schnur um die Schlaufenbasis 5- bis 6-mal verdrillen.',
      'Durch die Mitte fädeln: Die Schlaufenspitze durch die mittlere Windungslücke ziehen.',
      'Seitenarm anfeuchten: Seitenarm nach oben ausrichten und gründlich mit Wasser benetzen.',
      'Fest verankern: An beiden Hauptsträngen gleichzeitig ziehen – ideal für Paternoster-Montagen.'
    ],
    'Arborknoten': [
      'Spulenkern umrunden: Schnur einmal komplett um den Spulenkern der Angelrolle legen.',
      'Erster Knoten um Hauptschnur: Mit dem orangefarbenen Arbeitsende einen Überhandknoten um die blaue Hauptschnur binden.',
      'Stopperknoten am Ende: Am äußersten Ende des Arbeitsendes einen zweiten einfachen Stopperknoten binden.',
      'Knoten an den Kern ziehen: An der Hauptschnur ziehen – der erste Knoten gleitet zur Spule, der Stopper blockiert ihn.',
      'Festsitz prüfen: Die Schlinge liegt stramm und schlupffrei am Kern – nun kann die Schnur aufgespult werden.'
    ],
    'Mümmelmannknoten': [
      'Durch die kleine Öse: Arbeitsende durch die Hakenöse führen und kleine Schlaufe direkt vor dem Öhr offenhalten.',
      'Innenwicklungen legen: Das orange Ende viermal eng durch die Schlaufe um den Schnurschenkel flechten.',
      'Nah am Öhr ordnen: Alle Windungen sauber und parallel direkt vor der Öse zusammenschieben.',
      'Gründlich anfeuchten: Befeuchten, um die feine Schnur beim Zuziehen vor Abrieb zu schützen.',
      'Kompakt verriegeln: Gleichmäßig festziehen – extrem kompakter Mikroknoten für kleinste Haken und Fliegen.'
    ],
    'Centauri-Knoten': [
      'Durch die Öse führen: Schnur durch das Hakenöhr führen und eine weite Schlaufe entlang der Hauptschnur legen.',
      'Vier Innenwicklungen: Das orange Ende viermal von innen durch die Schlaufe um beide Stränge wickeln.',
      'Durch die Ösenschlaufe zurück: Das Arbeitsende zurückführen und durch die kleine Schlaufe am Öhr stecken.',
      'Windungen anfeuchten: Die Windungen zur Öse hin ausrichten und gründlich anfeuchten.',
      'Reibungsarm zuziehen: Gleichmäßig festziehen – minimiert Reibungshitze speziell bei Fluorocarbon.'
    ],
    'Pitzen-Knoten': [
      'Parallel zurücklegen: Schnur durch die Öse führen und parallel zur Hauptschnur nach hinten legen.',
      'Schlinge nach vorne: Das Arbeitsende umkehren und zurück in Richtung Hakenöse führen.',
      'Vier Wicklungen zum Öhr: Das orange Ende viermal um beide Stränge in Richtung Öhr wickeln.',
      'Durch die ferne Schlaufe: Das Arbeitsende durch die am weitesten entfernte Schlaufe stecken. Anfeuchten.',
      'Mit Klick verriegeln: An der Hauptschnur ziehen – der Knoten gleitet nach vorne und rastet hörbar am Öhr ein.'
    ],
    'Non-Slip Mono Loop': [
      'Überhandknoten vorbereiten: Zehn Zentimeter vor dem Schnurende einen lockeren Überhandknoten binden. Ende durch die Öse führen.',
      'Gleiche Seite zurück: Das Ende auf derselben Seite durch den Überhandknoten zurückführen, wie es herauskam.',
      'Vier Wicklungen: Das orange Arbeitsende viermal um die stehende Hauptschnur wickeln.',
      'Zurück durch die Bucht: Das Ende zurück durch die ursprüngliche Überhandschlaufe stecken. Anfeuchten.',
      'Freie Köderschlaufe schließen: Auf 1–1.5 cm Schlaufenlänge festziehen – der Köder behält maximale Bewegungsfreiheit.'
    ]
  };

  // Die 30 SVG-Animations-Drawer mit akkuraten Schrittpfaden und Bewegungspfeilen
  const knotDrawers = {
    'Palomarknoten': [
      () => `${hook(380, 156)}<path class="ka-main" d="M50 148H364"/><path class="ka-work" d="M50 164H364c48 0 48-16 0-16"/>${arrow("M330 130c25 0 50 12 75 26")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 148H230"/><path class="ka-work" d="M50 164H230c26-52 82-52 82 0 0 38 34 38 58-10 26-48 84-36 76 10"/>${arrow("M290 195c-15 15-45 15-55-10")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 152H250"/><path class="ka-work" d="M250 152c22-36 56-36 78 0 20-60 136-60 148 24 8 72-46 110-112 100"/>${arrow("M360 85c70 0 95 95 65 165")}`,
      () => `${hook(380, 156)}${drop(275, 102)}<path class="ka-main" d="M50 152H295"/><path class="ka-work" d="M50 162H295c20-20 46-20 50-7-4 15-30 15-50-4"/>${arrow("M140 152H80")}${arrow("M410 156H460")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 154H346"/><path class="ka-work" d="M318 142c16 0 28 12 28 12s-12 12-28 12m28-12l-28-24"/>${trim(270, 110)}`
    ],
    'Verbesserter Clinchknoten': [
      () => `${hook(380, 156)}<path class="ka-main" d="M50 156H364"/><path class="ka-work" d="M364 156c24 0 32-24 10-38"/>${arrow("M340 175c25 0 35-15 15-35")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 156H364"/>${coils(220, 134, 178, 6, 16)}<path class="ka-work" d="M364 156c24-20 0-38-34-22"/>${arrow("M310 120c-30-20-70-10-90 12")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 156H364"/>${coils(220, 134, 178, 6, 16)}<path class="ka-work" d="M220 134c-28 22 14 60 118 30"/>${arrow("M210 136c-20 25 15 55 100 30")}`,
      () => `${hook(380, 156)}${drop(250, 104)}<path class="ka-main" d="M50 156H364"/>${coils(228, 136, 176, 6, 15)}<path class="ka-work" d="M228 136c-22 24 22 68 96 42 18-8 10-34-12-42"/>${arrow("M325 180c25-10 15-40-10-45")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 156H352"/>${coils(296, 140, 172, 5, 10)}<path class="ka-work" d="M296 140l-24-20"/>${trim(250, 110)}`
    ],
    'Grinnerknoten (Uni)': [
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/><path class="ka-work" d="M364 150c20 16-4 22-150 22"/>${arrow("M350 165c-30 15-80 15-130 10")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/><path class="ka-work" d="M364 150c18 16-4 22-170 22-38 0-38-56 22-56 54 0 66 26 54 46"/>${arrow("M200 116c40-5 70 15 55 40")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/><path class="ka-work" d="M364 150c18 16-4 22-170 22-38 0-38-56 22-56"/>${coils(212, 128, 176, 5, 15)}${arrow("M270 130c-20 20-30 40-50 40")}`,
      () => `${hook(380, 156)}${drop(290, 102)}<path class="ka-main" d="M50 150H364"/>${coils(225, 134, 170, 5, 14)}<path class="ka-work" d="M206 150l-28-22"/>${arrow("M230 152c30 0 60 0 90 0")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 154H352"/>${coils(300, 138, 170, 5, 9)}<path class="ka-work" d="M300 142l-24-18"/>${trim(255, 114)}`
    ],
    'Trilene-Knoten': [
      () => `${hook(380, 156)}<path class="ka-main" d="M50 152H364"/><path class="ka-work" d="M364 152c28-20 42 18 16 22-28 4-18-26 12-18"/>${arrow("M350 140c20-20 40 10 15 25")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 152H364"/>${coils(228, 134, 174, 5, 16)}<path class="ka-work" d="M344 142c-16-16-16 38 0 24"/>${arrow("M310 120c-30-20-60-15-80 12")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 152H364"/>${coils(228, 134, 174, 5, 16)}<path class="ka-work" d="M228 134c-26 28 26 64 120 28"/>${arrow("M215 138c-20 28 25 60 110 30")}`,
      () => `${hook(380, 156)}${drop(295, 102)}<path class="ka-main" d="M50 152H364"/>${coils(250, 136, 172, 5, 13)}<path class="ka-work" d="M250 138l-24-20"/>${arrow("M150 152H90")}${arrow("M410 156H460")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 154H354"/>${coils(300, 138, 170, 5, 10)}<path class="ka-work" d="M300 140l-22-18"/>${trim(255, 112)}`
    ],
    'Schlaufenknoten': [
      () => `<path class="ka-main" d="M50 166H240"/><path class="ka-work" d="M240 166c125 0 185-78 235-18 42 50-22 86-135 36"/>${arrow("M320 166c40-30 80-30 110 0")}`,
      () => `<path class="ka-main" d="M50 166H230"/><path class="ka-work" d="M230 166c58-70 180-70 238 0 30 36-18 64-88 38-52-18-90-60-132-38"/>${arrow("M410 180c-40 30-90 0-110-30")}`,
      () => `<path class="ka-main" d="M50 166H210"/><path class="ka-work" d="M210 166c30-54 88-54 100 0 14 50 128 50 168 0 32-38-28-76-100-38-48 26-92 66-138 26"/>${arrow("M250 130c25-30 70-30 85 10")}`,
      () => `${drop(250, 105)}<path class="ka-main" d="M50 160H225"/><path class="ka-work" d="M225 160c22-30 56-30 68 0 16 36 118 36 160 0 38-32-18-70-86-38-40 20-80 54-118 26"/>${arrow("M400 150c25 0 50 0 70 0")}`,
      () => `<path class="ka-main" d="M50 156H250"/><path class="ka-work" d="M250 156c18-22 40-22 48 0 16 30 122 30 165 0 36-26 24-58-24-48-48 10-112 34-165 48"/>${trim(240, 110)}`
    ],
    'Rapalaknoten': [
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H205"/><path class="ka-work" d="M205 156c16-34 52-34 52 0 0 30-32 30-12-10 16-28 60-18 90 10"/>${arrow("M210 135c30-20 60 10 30 40")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H210"/><path class="ka-work" d="M210 156c14-30 46-30 46 0 12 24 146 24 152 0-12-26-112-20-162 12"/>${arrow("M380 170c-40 20-100 10-130-10")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H200"/>${coils(214, 138, 174, 3, 14)}<path class="ka-work" d="M256 156c24 24 132 24 152 0-18-24-100-22-146 0"/>${arrow("M240 136c-20-10-40 0-40 20")}`,
      () => `${wobbler(420, 156)}${drop(280, 102)}<path class="ka-main" d="M50 156H200"/>${coils(214, 138, 174, 3, 14)}<path class="ka-work" d="M200 156c-16-30 36-40 68-16 30 24 116 32 138 16"/>${arrow("M260 156H360")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H275"/>${coils(275, 142, 170, 3, 10)}<path class="ka-work" d="M305 156c16-22 66-22 80 0-14 22-64 22-80 0"/>${trim(240, 114)}`
    ],
    'Snellknoten': [
      () => `${hook(340, 120, 14)}<path class="ka-main" d="M50 120H324"/><path class="ka-work" d="M324 120c14 0 18 14 18 68"/>${arrow("M310 100c25 0 35 15 35 45")}`,
      () => `${hook(340, 120, 14)}<path class="ka-main" d="M50 120H324"/><path class="ka-work" d="M324 120c14 0 18 14 18 68 0 26-26 26-26-4v-54"/>${arrow("M340 180c0 25-25 25-25 0")}`,
      () => `${hook(340, 120, 14)}<path class="ka-main" d="M50 120H324"/>${Array.from({ length: 6 }, (_, i) => `<path class="ka-work" d="M324 ${144 + i * 9}c12-6 26-6 36 0"/>`).join('')}${arrow("M360 145c10 20 0 40-20 40")}`,
      () => `${hook(340, 120, 14)}${drop(280, 95)}<path class="ka-main" d="M50 120H324"/>${Array.from({ length: 6 }, (_, i) => `<path class="ka-work" d="M324 ${144 + i * 9}c12-6 26-6 36 0"/>`).join('')}<path class="ka-work" d="M348 190c14-14 14-48-18-62"/>${arrow("M350 180c10-20 5-40-15-50")}`,
      () => `${hook(340, 120, 14)}<path class="ka-main" d="M50 120H328"/>${Array.from({ length: 6 }, (_, i) => `<path class="ka-work" d="M328 ${138 + i * 7}h24"/>`).join('')}<path class="ka-work" d="M340 184v20"/>${trim(270, 95)}`
    ],
    'Knotless Knot': [
      () => `${hook(360, 120, 14)}<circle cx="378" cy="272" r="14" class="ka-boilie"/><path class="ka-main" d="M50 120H344"/><path class="ka-work" d="M344 120v140c0 10 16 10 16 0V120"/>${tag(398, 276, 'HAAR')}`,
      () => `${hook(360, 120, 14)}<circle cx="378" cy="272" r="14" class="ka-boilie"/><path class="ka-main" d="M50 120H344"/><path class="ka-work" d="M344 120v140m16-140v140"/>${arrow("M330 110c20 0 25 15 25 35")}`,
      () => `${hook(360, 120, 14)}<circle cx="378" cy="272" r="14" class="ka-boilie"/><path class="ka-main" d="M50 120H344"/>${Array.from({ length: 8 }, (_, i) => `<path class="ka-work" d="M344 ${136 + i * 8}h28"/>`).join('')}<path class="ka-work" d="M360 200v60"/>${arrow("M375 140c10 25 0 50-15 50")}`,
      () => `${hook(360, 120, 14)}<circle cx="378" cy="272" r="14" class="ka-boilie"/><path class="ka-main" d="M50 120H344"/>${Array.from({ length: 8 }, (_, i) => `<path class="ka-work" d="M344 ${136 + i * 8}h28"/>`).join('')}<path class="ka-work" d="M360 200c24-18 24-86-16-80"/><path class="ka-work" d="M360 200v60"/>${arrow("M380 180c15-30 5-60-25-65")}`,
      () => `${hook(360, 120, 14)}<circle cx="378" cy="272" r="14" class="ka-boilie"/><path class="ka-main" d="M50 120H344"/><path class="ka-main" d="M344 120c10-24 24-24 34 0"/>${Array.from({ length: 8 }, (_, i) => `<path class="ka-work" d="M344 ${136 + i * 8}h28"/>`).join('')}<path class="ka-work" d="M360 200v60"/>${trim(270, 95)}`
    ],
    'Schlaufenknoten am Wobbler': [
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H220"/><path class="ka-work" d="M220 156c18-34 50-34 50 0h138c14 0 14 22-8 22H270"/>${arrow("M240 135c30-20 60 10 30 40")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H220"/><path class="ka-work" d="M220 156c16-32 46-32 46 0 0 26 116 26 142 0-18-24-114-18-166 12"/>${arrow("M380 170c-40 20-100 10-130-10")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H210"/>${coils(228, 138, 174, 3, 14)}<path class="ka-work" d="M270 156c22 22 118 22 138 0"/>${arrow("M250 136c-20-10-40 0-40 20")}`,
      () => `${wobbler(420, 156)}${drop(280, 102)}<path class="ka-main" d="M50 156H210"/>${coils(228, 138, 174, 3, 14)}<path class="ka-work" d="M270 156c16-20 60-20 74 0-14 20-58 20-74 0"/>${arrow("M270 156H350")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H300"/>${coils(300, 142, 170, 3, 10)}<path class="ka-work" d="M330 156c18-22 64-22 78 0-14 22-60 22-78 0"/>${trim(250, 114)}`
    ],
    'Doppelter Clinch': [
      () => `${swivel(380, 156)}<path class="ka-main" d="M50 150H336"/><path class="ka-work" d="M50 162H336c28 0 28-12 0-12"/>${arrow("M310 135c20 0 35 12 40 25")}`,
      () => `${swivel(380, 156)}<path class="ka-main" d="M50 150H336"/><path class="ka-work" d="M328 142c-26-22-26 48 0 26 24-18 28 6 8 6"/>${arrow("M320 120c-30-20-60-15-80 12")}`,
      () => `${swivel(380, 156)}<path class="ka-main" d="M50 150H336"/>${coils(218, 134, 174, 5, 16)}<path class="ka-work" d="M320 144c-12-10-12 32 0 22"/>${arrow("M230 120c-30 0-40 20-30 35")}`,
      () => `${swivel(380, 156)}${drop(280, 102)}<path class="ka-main" d="M50 150H336"/>${coils(218, 134, 174, 5, 16)}<path class="ka-work" d="M218 134c-24 28 24 62 112 24"/>${arrow("M210 136c-20 28 25 60 105 28")}`,
      () => `${swivel(380, 156)}<path class="ka-main" d="M50 154H334"/>${coils(284, 138, 170, 5, 10)}<path class="ka-work" d="M284 140l-20-16"/>${trim(240, 110)}`
    ],
    'Doppelter Grinner': [
      () => `<path class="ka-main" d="M50 144H420"/><path class="ka-work" d="M180 174H550"/>${tag(80, 126, 'SCHNUR A (BLAU)')}${tag(420, 198, 'SCHNUR B (ORANGE)')}${arrow("M200 174c-30-15-20-40 10-40")}`,
      () => `<path class="ka-main" d="M50 144H420"/><path class="ka-work" d="M320 174H550"/>${coils(344, 128, 186, 4, 14)}<path class="ka-work" d="M344 128c-22 14-22 44 0 46"/>${arrow("M400 128c-20 20-30 40-50 40")}`,
      () => `<path class="ka-main" d="M50 144H270"/>${coils(190, 128, 186, 4, 14, 'ka-main')}<path class="ka-work" d="M320 174H550"/>${coils(344, 128, 186, 4, 14)}${arrow("M240 128c-20 20-30 40-50 40")}`,
      () => `${drop(300, 102)}<path class="ka-main" d="M50 156H210"/>${coils(200, 140, 174, 4, 11, 'ka-main')}<path class="ka-main" d="M244 156H356"/>${coils(356, 140, 174, 4, 11)}<path class="ka-work" d="M400 156H550"/>${arrow("M150 156H90")}${arrow("M450 156H510")}`,
      () => `<path class="ka-main" d="M50 156H268"/>${coils(268, 140, 172, 4, 9, 'ka-main')}${coils(306, 140, 172, 4, 9)}<path class="ka-work" d="M342 156H550"/>${trim(240, 115)}`
    ],
    'Albrightknoten': [
      () => `<path class="ka-main" d="M50 142H360c44 0 44 36 0 36H140"/>${tag(80, 126, 'VORFACH (BLAU)')}${arrow("M380 142c30 0 30 36 0 36")}`,
      () => `<path class="ka-main" d="M50 142H360c44 0 44 36 0 36H140"/><path class="ka-work" d="M550 160H340c-28 0-40-18-16-24"/>${arrow("M520 160H350")}`,
      () => `<path class="ka-main" d="M50 142H360c44 0 44 36 0 36H140"/>${coils(240, 130, 190, 8, 14)}<path class="ka-work" d="M352 160H550"/>${arrow("M340 130c-30-20-60-15-80 12")}`,
      () => `${drop(290, 102)}<path class="ka-main" d="M50 142H360c44 0 44 36 0 36H140"/>${coils(240, 130, 190, 8, 14)}<path class="ka-work" d="M240 130c-22 14-14 48 14 48h104"/>${arrow("M230 134c-20 20 0 50 40 45")}`,
      () => `<path class="ka-main" d="M50 156H272"/>${coils(272, 142, 170, 8, 9)}<path class="ka-work" d="M344 156H550"/>${trim(240, 115)}`
    ],
    'Blutknoten': [
      () => `<path class="ka-main" d="M50 148H350"/><path class="ka-work" d="M250 172H550"/><path class="ka-main" d="M350 148l28 24"/><path class="ka-work" d="M250 172l-28-24"/>${arrow("M340 148l35 30")}`,
      () => `<path class="ka-main" d="M50 156H330"/>${coils(316, 138, 174, 5, 14)}<path class="ka-work" d="M386 156H550"/><path class="ka-work" d="M316 138l-16 62"/>${arrow("M370 138c-20 20-40 40-60 40")}`,
      () => `<path class="ka-main" d="M50 156H210"/>${coils(210, 138, 174, 5, 14, 'ka-main')}<path class="ka-main" d="M280 138l16-42"/>${coils(316, 138, 174, 5, 14)}<path class="ka-work" d="M386 156H550"/><path class="ka-work" d="M316 174l-16 42"/>${arrow("M230 138c20-20 40-40 60-40")}`,
      () => `${drop(300, 100)}<path class="ka-main" d="M50 156H230"/>${coils(230, 140, 172, 4, 12, 'ka-main')}<path class="ka-main" d="M294 140v-30"/>${coils(312, 140, 172, 4, 12)}<path class="ka-work" d="M360 156H550"/><path class="ka-work" d="M294 172v30"/>${arrow("M150 156H90")}${arrow("M450 156H510")}`,
      () => `<path class="ka-main" d="M50 156H268"/>${coils(268, 142, 170, 4, 8, 'ka-main')}${coils(302, 142, 170, 4, 8)}<path class="ka-work" d="M334 156H550"/>${trim(240, 115)}`
    ],
    'Doppelter Uni-Knoten': [
      () => `<path class="ka-main" d="M50 144H430"/><path class="ka-work" d="M170 172H550"/>${tag(80, 126, 'SCHNUR A')}${tag(440, 196, 'SCHNUR B')}${arrow("M200 172c-30-15-20-40 10-40")}`,
      () => `<path class="ka-main" d="M50 144H430"/><path class="ka-work" d="M320 172H550"/>${coils(344, 124, 188, 5, 13)}<path class="ka-work" d="M344 124c-26 16-26 50 0 48"/>${arrow("M400 124c-20 20-30 40-50 40")}`,
      () => `<path class="ka-main" d="M50 144H250"/>${coils(184, 124, 188, 5, 13, 'ka-main')}<path class="ka-work" d="M320 172H550"/>${coils(344, 124, 188, 5, 13)}${arrow("M240 124c-20 20-30 40-50 40")}`,
      () => `${drop(300, 102)}<path class="ka-main" d="M50 156H200"/>${coils(200, 140, 172, 5, 10, 'ka-main')}<path class="ka-main" d="M250 156H350"/>${coils(350, 140, 172, 5, 10)}<path class="ka-work" d="M400 156H550"/>${arrow("M150 156H90")}${arrow("M450 156H510")}`,
      () => `<path class="ka-main" d="M50 156H256"/>${coils(256, 140, 172, 5, 9, 'ka-main')}${coils(304, 140, 172, 5, 9)}<path class="ka-work" d="M348 156H550"/>${trim(235, 115)}`
    ],
    'Chirurgenknoten': [
      () => `<path class="ka-main" d="M50 150H450"/><path class="ka-work" d="M150 162H550"/>${tag(80, 130, 'SCHNUR A')}${tag(450, 182, 'SCHNUR B')}${arrow("M420 150c25 0 25 30 0 30")}`,
      () => `<path class="ka-main" d="M50 150H230"/><path class="ka-work" d="M150 162H230"/><path class="ka-main" d="M230 150c28-56 112-56 140 0 16 32-12 56-54 36"/><path class="ka-work" d="M230 162c26-52 108-52 136 0 16 30-10 52-50 34"/>${arrow("M300 200c-25 15-50 0-60-25")}`,
      () => `<path class="ka-main" d="M50 150H210"/><path class="ka-work" d="M150 162H210"/><path class="ka-main" d="M210 150c22-48 76-48 98 0 16 34 54 34 70 0"/><path class="ka-work" d="M210 162c20-44 72-44 94 0 14 32 50 32 66 0"/>${arrow("M250 120c20-20 50-20 70 0")}`,
      () => `${drop(290, 102)}<path class="ka-main" d="M50 156H235"/><path class="ka-work" d="M150 156H235"/><path class="ka-main" d="M235 156c16-24 48-24 64 0 14 24 44 24 58 0"/><path class="ka-work" d="M235 156c14-20 44-20 58 0 12 20 40 20 52 0"/><path class="ka-work" d="M357 156H550"/>${arrow("M120 156H70")}${arrow("M470 156H520")}`,
      () => `<path class="ka-main" d="M50 156H268"/><path class="ka-main" d="M268 156c12-16 28-16 40 0"/><path class="ka-work" d="M280 156c12-16 28-16 40 0"/><path class="ka-work" d="M320 156H550"/>${trim(245, 115)}`
    ],
    'FG-Knoten': [
      () => `<path class="ka-main" d="M50 156H480"/><path class="ka-work" d="M300 78V234"/>${tag(80, 136, 'FLUOROCARBON')}${tag(318, 92, 'GEFLECHT')}${arrow("M300 85v40")}`,
      () => `<path class="ka-main" d="M50 156H480"/><path class="ka-work" d="M260 92l28 128 28-128 28 128"/>${arrow("M320 95c20 20 30 40 40 60")}`,
      () => `<path class="ka-main" d="M50 156H480"/>${Array.from({ length: 12 }, (_, i) => `<path class="ka-work" d="M${210 + i * 14} 138l10 36"/>`).join('')}${arrow("M380 140c20 0 35 15 25 30")}`,
      () => `${drop(290, 102)}<path class="ka-main" d="M50 156H480"/>${Array.from({ length: 12 }, (_, i) => `<path class="ka-work" d="M${210 + i * 14} 142l8 28"/>`).join('')}<path class="ka-work" d="M380 156c16-24 36 24 52 0"/>${arrow("M120 156H70")}${arrow("M450 156H500")}`,
      () => `<path class="ka-main" d="M50 156H230"/>${Array.from({ length: 14 }, (_, i) => `<path class="ka-work" d="M${230 + i * 9} 146v20"/>`).join('')}<path class="ka-work" d="M356 156H550"/>${trim(220, 115)}`
    ],
    'PR-Knoten': [
      () => `<path class="ka-main" d="M50 156H480"/><rect x="280" y="142" width="28" height="28" rx="4" fill="#cbd5e1" stroke="#334155" stroke-width="3"/><path class="ka-work" d="M294 170v60"/>${tag(80, 136, 'VORFACH')}${tag(320, 140, 'BOBBIN')}${arrow("M294 170c30 0 50 15 40 40")}`,
      () => `<path class="ka-main" d="M50 156H480"/>${Array.from({ length: 12 }, (_, i) => `<path class="ka-work" d="M${240 + i * 10} 144v24"/>`).join('')}<path class="ka-work" d="M360 156v60"/>${arrow("M360 160c25 20 25 40 0 50")}`,
      () => `<path class="ka-main" d="M50 156H480"/>${Array.from({ length: 14 }, (_, i) => `<path class="ka-work" d="M${230 + i * 9} 142v28"/>`).join('')}<path class="ka-work" d="M230 156v60"/>${arrow("M240 170c-20 20-30 0-10-20")}`,
      () => `${drop(290, 102)}<path class="ka-main" d="M50 156H480"/>${Array.from({ length: 14 }, (_, i) => `<path class="ka-work" d="M${230 + i * 9} 142v28"/>`).join('')}<path class="ka-work" d="M356 156c18-20 42 20 60 0"/>${arrow("M120 156H70")}${arrow("M450 156H500")}`,
      () => `<path class="ka-main" d="M50 156H225"/>${Array.from({ length: 15 }, (_, i) => `<path class="ka-work" d="M${225 + i * 9} 144v24"/>`).join('')}<path class="ka-work" d="M360 156H550"/>${trim(215, 115)}`
    ],
    'Mahin-Knoten': [
      () => `<path class="ka-main" d="M50 144H360c36 0 36 28 0 28H170"/>${tag(80, 126, 'SCHLAGSCHNUR')}${arrow("M370 144c25 0 25 28 0 28")}`,
      () => `<path class="ka-main" d="M50 144H360c36 0 36 28 0 28H170"/><path class="ka-work" d="M550 158H336c-22 0-32-14-14-22"/>${arrow("M520 158H350")}`,
      () => `<path class="ka-main" d="M50 144H360c36 0 36 28 0 28H170"/>${coils(236, 134, 184, 7, 14)}<path class="ka-work" d="M336 158H550"/>${arrow("M330 134c-30-20-60-15-80 12")}`,
      () => `${drop(290, 102)}<path class="ka-main" d="M50 144H360c36 0 36 28 0 28H170"/>${coils(236, 134, 184, 7, 14)}<path class="ka-work" d="M236 134c-20 14-10 42 18 42h104"/>${arrow("M230 138c-20 20 0 50 35 45")}`,
      () => `<path class="ka-main" d="M50 156H268"/>${coils(268, 144, 168, 7, 9)}<path class="ka-work" d="M332 156H550"/>${trim(240, 115)}`
    ],
    'Yucatan-Knoten': [
      () => `<path class="ka-main" d="M50 142H340c50 0 50 32 0 32H110"/>${tag(80, 126, 'DOPPELTES VORFACH')}${arrow("M360 142c30 0 30 32 0 32")}`,
      () => `<path class="ka-main" d="M50 142H340c50 0 50 32 0 32H110"/><path class="ka-work" d="M550 158H326c-24 0-32-16-12-24"/>${arrow("M520 158H340")}`,
      () => `<path class="ka-main" d="M50 142H340c50 0 50 32 0 32H110"/>${coils(216, 130, 186, 8, 14)}<path class="ka-work" d="M330 158H550"/>${arrow("M320 130c-30-20-60-15-80 12")}`,
      () => `${drop(295, 102)}<path class="ka-main" d="M50 142H340c50 0 50 32 0 32H110"/>${coils(216, 130, 186, 8, 14)}<path class="ka-work" d="M216 130c-18 18-10 48 16 48h128"/>${arrow("M210 135c-20 20 0 50 35 45")}`,
      () => `<path class="ka-main" d="M50 156H268"/>${coils(268, 142, 170, 7, 10)}<path class="ka-work" d="M338 156H550"/>${trim(240, 115)}`
    ],
    'Slim Beauty': [
      () => `<path class="ka-main" d="M50 156H210c14-34 46-34 46 0 0 32-30 32-10-12 18-26 60-20 120 12"/>${tag(80, 136, 'VORFACH-ACHT')}${arrow("M210 135c25-25 55 10 30 35")}`,
      () => `<path class="ka-main" d="M50 156H210c14-28 42-28 42 0h160"/><path class="ka-work" d="M236 156h40"/>${coils(280, 138, 174, 4, 14)}<path class="ka-work" d="M336 156H550"/>${arrow("M330 138c-20-20-40 0-40 20")}`,
      () => `<path class="ka-main" d="M50 156H210c14-28 42-28 42 0h160"/>${coils(280, 138, 174, 4, 14)}<path class="ka-work" d="M336 156c24-30-16-46-66-34l-36 34"/>${arrow("M330 140c-30-30-60-15-75 10")}`,
      () => `${drop(290, 102)}<path class="ka-main" d="M50 156H210c14-28 42-28 42 0h160"/>${coils(248, 138, 174, 4, 11)}${coils(300, 138, 174, 4, 11)}<path class="ka-work" d="M344 156H550"/>${arrow("M120 156H70")}${arrow("M450 156H500")}`,
      () => `<path class="ka-main" d="M50 156H258"/>${coils(258, 142, 170, 8, 9)}<path class="ka-work" d="M330 156H550"/>${trim(235, 115)}`
    ],
    'Doppelter Überhand-Schlaufenknoten': [
      () => `<path class="ka-main" d="M50 156H230"/><path class="ka-work" d="M230 156h170c56 0 56 36 0 36H230"/>${arrow("M380 156c35 0 35 36 0 36")}`,
      () => `<path class="ka-main" d="M50 156H220"/><path class="ka-work" d="M220 156c22-56 96-56 108 0 14 58 106 58 140 10 24-34-18-68-78-38"/>${arrow("M290 195c-15 15-45 15-55-10")}`,
      () => `<path class="ka-main" d="M50 156H210"/><path class="ka-work" d="M210 156c18-50 62-50 74 0 14 50 58 50 70 0 12-40 94-40 118 0 18 32-14 56-72 28"/>${arrow("M260 130c25-30 65-30 80 10")}`,
      () => `${drop(270, 102)}<path class="ka-main" d="M50 156H236"/><path class="ka-work" d="M236 156c16-30 40-30 50 0 12 30 36 30 46 0 14-28 96-28 124 0 22 22-8 48-68 24"/>${arrow("M380 156H450")}`,
      () => `<path class="ka-main" d="M50 156H264"/><path class="ka-work" d="M264 156c12-22 28-22 36 0 10 22 24 22 32 0 14-24 102-24 128 0 20 18-10 38-72 16"/>${trim(250, 115)}`
    ],
    'Achterknoten': [
      () => `<path class="ka-main" d="M50 162H230"/><path class="ka-work" d="M230 162c60-68 176-68 228 0 30 38-20 72-120 34"/>${arrow("M320 162c40-30 80-30 110 0")}`,
      () => `<path class="ka-main" d="M50 162H220"/><path class="ka-work" d="M220 162c36-64 104-64 104 0 0 56 116 56 144 0 22-44-40-78-112-34"/>${arrow("M410 180c-40 30-90 0-110-30")}`,
      () => `<path class="ka-main" d="M50 156H214"/><path class="ka-work" d="M214 156c24-52 72-52 84 0 12 52 56 52 72 0 18-48 86-40 104 0 16 36-32 62-96 24-44-26-84 22-124 4"/>${arrow("M250 130c25-30 70-30 85 10")}`,
      () => `${drop(290, 102)}<path class="ka-main" d="M50 156H232"/><path class="ka-work" d="M232 156c18-36 52-36 62 0 10 36 44 36 56 0 18-32 94-30 112 0 14 24-22 44-80 20"/>${arrow("M380 156H450")}`,
      () => `<path class="ka-main" d="M50 156H258"/><path class="ka-work" d="M258 156c12-24 34-24 42 0 8 24 30 24 38 0 16-24 98-24 118 0 16 18-14 36-74 16"/>${trim(240, 115)}`
    ],
    'Springerschlaufe': [
      () => `<path class="ka-main" d="M50 204H240"/><path class="ka-work" d="M240 204c0-96 120-96 120 0"/><path class="ka-main" d="M360 204H550"/>${arrow("M270 204c0-60 60-60 60 0")}`,
      () => `<path class="ka-main" d="M50 204H248"/><path class="ka-work" d="M248 204c34-36-22-92 52-92 74 0 18 56 52 92"/><path class="ka-main" d="M352 204H550"/>${arrow("M280 160c20-20 40 20 20 40")}`,
      () => `<path class="ka-main" d="M50 204H250"/><path class="ka-work" d="M250 204c28-36-18-98 50-98 68 0 22 62 50 98M278 148c14-48 30-48 44 0"/><path class="ka-main" d="M350 204H550"/>${arrow("M300 120v-40")}`,
      () => `${drop(300, 168)}<path class="ka-main" d="M50 204H264"/><path class="ka-work" d="M264 204c18-24 54-24 72 0M280 184c-24-86 64-86 40 0"/><path class="ka-main" d="M336 204H550"/>${arrow("M150 204H90")}${arrow("M450 204H510")}`,
      () => `<path class="ka-main" d="M50 204H280"/><path class="ka-work" d="M280 204c10-18 30-18 40 0M286 190c-18-88 46-88 28 0"/><path class="ka-main" d="M320 204H550"/>${tag(300, 75, '90° SEITENARM')}`
    ],
    'Perfekte Schlaufe': [
      () => `<path class="ka-main" d="M50 156H240"/><path class="ka-work" d="M240 156c0-56 96-56 96 0s-96 56-96 0"/>${arrow("M280 130c25-25 55 10 30 35")}`,
      () => `<path class="ka-main" d="M50 156H240"/><path class="ka-work" d="M240 156c0-52 86-52 86 0s-86 52-86 0m54 0c0-38 72-38 72 0s-72 38-72 0"/>${arrow("M350 130c20-20 45 10 25 30")}`,
      () => `<path class="ka-main" d="M50 156H240"/><path class="ka-work" d="M240 156c0-46 72-46 72 0s-72 46-72 0m66 0c22-40 112-40 132 0 18 36-86 42-132 0"/>${arrow("M380 156c30 0 50 15 40 35")}`,
      () => `${drop(280, 102)}<path class="ka-main" d="M50 156H248"/><path class="ka-work" d="M248 156c12-30 44-30 56 0 12 30-44 30-56 0m56 0c24-32 112-32 134 0 18 26-90 32-134 0"/>${arrow("M400 156H460")}`,
      () => `<path class="ka-main" d="M50 156H268"/><path class="ka-work" d="M268 156c8-18 28-18 36 0 8 18-28 18-36 0m36 0c24-24 118-24 142 0 20 20-96 26-142 0"/>${trim(250, 115)}`
    ],
    'Dropper-Loop': [
      () => `<path class="ka-main" d="M50 198H220"/><path class="ka-work" d="M220 198c0-108 160-108 160 0"/><path class="ka-main" d="M380 198H550"/>${arrow("M260 198c0-70 80-70 80 0")}`,
      () => `<path class="ka-main" d="M50 198H236"/><path class="ka-work" d="M236 198c24-28 104-28 128 0M268 176c24-24-24-56 32-56 56 0 8 32 32 56"/><path class="ka-main" d="M364 198H550"/>${arrow("M290 150c20-20 40 20 20 40")}`,
      () => `<path class="ka-main" d="M50 198H246"/><path class="ka-work" d="M246 198c22-22 86-22 108 0M272 178c-12-74 68-74 56 0"/><path class="ka-main" d="M354 198H550"/>${arrow("M300 110v-40")}`,
      () => `${drop(300, 168)}<path class="ka-main" d="M50 198H262"/><path class="ka-work" d="M262 198c16-18 60-18 76 0M282 184c-16-86 52-86 36 0"/><path class="ka-main" d="M338 198H550"/>${arrow("M150 198H90")}${arrow("M450 198H510")}`,
      () => `<path class="ka-main" d="M50 198H278"/><path class="ka-work" d="M278 198c12-14 32-14 44 0M288 188c-14-88 38-88 24 0"/><path class="ka-main" d="M322 198H550"/>${tag(300, 70, 'PATERNOSTER-SCHLAUFE')}`
    ],
    'Arborknoten': [
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M194 160c0-74 172-74 172 0s-172 74-172 0h100"/>${arrow("M250 110c40-10 80 10 90 40")}`,
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M194 160c0-74 172-74 172 0s-172 74-172 0m172 0c32-24 56 24 88 0"/>${arrow("M380 150c20-20 40 20 60 0")}`,
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M366 160c14-24 34 24 48 0h66c12-18 24 18 12 0"/>${tag(446, 128, 'STOPPER')}${arrow("M450 150c20-10 30 15 15 20")}`,
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M194 160c0-70 164-70 164 0s-164 70-164 0m172 0c10-16 24 16 34 0h34"/>${arrow("M150 160H80")}`,
      () => `${spool(280, 160)}<path class="ka-main" d="M50 160H194"/><path class="ka-work" d="M194 160c0-66 156-66 156 0s-156 66-156 0m158 0c8-14 18 14 26 0"/>${trim(385, 130)}`
    ],
    'Mümmelmannknoten': [
      () => `${hook(380, 156, 12)}<path class="ka-main" d="M50 156H366"/><path class="ka-work" d="M366 156c18 0 22-18 6-28"/>${arrow("M350 170c20 0 25-15 10-30")}`,
      () => `${hook(380, 156, 12)}<path class="ka-main" d="M50 156H366"/><path class="ka-work" d="M366 156c-18-38-76-38-76 0 0 30 46 30 62 4"/>${arrow("M340 125c-30-20-60 10-40 30")}`,
      () => `${hook(380, 156, 12)}<path class="ka-main" d="M50 156H366"/>${coils(298, 138, 174, 4, 13)}<path class="ka-work" d="M298 138c-22 14-14 38 14 38"/>${arrow("M330 138c-15-10-30 0-30 20")}`,
      () => `${hook(380, 156, 12)}${drop(310, 102)}<path class="ka-main" d="M50 156H366"/>${coils(316, 140, 172, 4, 10)}<path class="ka-work" d="M316 140l-20-16"/>${arrow("M300 145c20 0 40 0 55 0")}`,
      () => `${hook(380, 156, 12)}<path class="ka-main" d="M50 156H366"/>${coils(332, 142, 170, 4, 8)}${trim(270, 110)}`
    ],
    'Centauri-Knoten': [
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/><path class="ka-work" d="M50 162H364c28 0 28-12 0-12"/>${arrow("M330 135c20 0 35 12 40 25")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/><path class="ka-work" d="M362 156c-36-54-146-54-174 0"/>${arrow("M340 120c-50-40-120-30-140 15")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/>${coils(220, 132, 176, 4, 16)}<path class="ka-work" d="M362 156c-22-34-80-34-128-24"/>${arrow("M330 130c-30-20-70-10-90 12")}`,
      () => `${hook(380, 156)}${drop(280, 102)}<path class="ka-main" d="M50 150H364"/>${coils(220, 132, 176, 4, 16)}<path class="ka-work" d="M220 132c-22 26 20 62 114 26"/>${arrow("M210 136c-20 28 25 60 105 28")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 154H352"/>${coils(298, 138, 170, 4, 10)}<path class="ka-work" d="M298 140l-20-16"/>${trim(250, 110)}`
    ],
    'Pitzen-Knoten': [
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/><path class="ka-work" d="M364 150c-30-46-114-46-140 0"/>${arrow("M350 135c-30-30-90-25-115 10")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/><path class="ka-work" d="M364 150c14 18-16 20-140 20"/>${arrow("M350 165c-30 15-80 15-120 10")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/>${coils(226, 132, 174, 4, 15)}<path class="ka-work" d="M332 144c-14-14-14 34 0 22"/>${arrow("M310 125c-30-20-60-15-75 10")}`,
      () => `${hook(380, 156)}<path class="ka-main" d="M50 150H364"/>${coils(226, 132, 174, 4, 15)}<path class="ka-work" d="M226 132c-22 24 18 58 106 26"/>${arrow("M215 136c-20 25 15 55 100 28")}`,
      () => `${hook(380, 156)}${drop(300, 102)}<path class="ka-main" d="M50 154H352"/>${coils(300, 138, 170, 4, 10)}<path class="ka-work" d="M300 140l-18-16"/>${trim(250, 110)}`
    ],
    'Non-Slip Mono Loop': [
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H205"/><path class="ka-work" d="M205 156c16-32 48-32 48 0 0 28-30 28-10-10 14-26 56-16 86 10"/>${arrow("M210 135c30-20 60 10 30 40")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H210"/><path class="ka-work" d="M210 156c14-28 42-28 42 0 12 24 148 24 156 0-14-24-112-18-162 12"/>${arrow("M380 170c-40 20-100 10-130-10")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H198"/>${coils(212, 136, 176, 4, 14)}<path class="ka-work" d="M268 156c24 24 120 24 140 0"/>${arrow("M250 136c-20-10-40 0-40 20")}`,
      () => `${wobbler(420, 156)}${drop(280, 102)}<path class="ka-main" d="M50 156H198"/>${coils(212, 136, 176, 4, 14)}<path class="ka-work" d="M198 156c-14-32 34-44 68-18 32 26 120 34 142 18"/>${arrow("M270 156H360")}`,
      () => `${wobbler(420, 156)}<path class="ka-main" d="M50 156H290"/>${coils(290, 142, 170, 4, 9)}<path class="ka-work" d="M326 156c18-24 68-24 82 0-14 24-64 24-82 0"/>${trim(240, 114)}`
    ]
  };

  const knots = groups.flatMap((group, categoryIndex) => group[7].map((name, knotIndex) => ({
    id: `${categoryIndex}-${knotIndex}`,
    categoryIndex,
    knotIndex,
    name,
    category: group[0],
    icon: group[1],
    use: group[2],
    line: group[3],
    strength: group[4],
    tip: group[5],
    type: group[6],
    steps: details[name]
  })));

  function drawing(knot, step) {
    const arrowMarkerId = 'ka-arrow-head';
    const defs = `<defs>` +
      `<linearGradient id="ka-metal-grad" x1="0%" y1="0%" x2="100%" y2="100%">` +
        `<stop offset="0%" stop-color="#f8fafc"/>` +
        `<stop offset="45%" stop-color="#cbd5e1"/>` +
        `<stop offset="100%" stop-color="#475569"/>` +
      `</linearGradient>` +
      `<marker id="${arrowMarkerId}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">` +
        `<path d="M 0 1 L 9 5 L 0 9 z" fill="${C.arrow}" stroke="#ca8a04" stroke-width="0.8"/>` +
      `</marker>` +
    `</defs>`;

    const frames = knotDrawers[knot.name];
    const body = frames && frames[step] ? frames[step]() : '';
    return `${defs}${body}`;
  }

  function player(knot) {
    return `<section class="knot-animator" aria-label="${esc(knot.name)} Schritt-für-Schritt-Anleitung">` +
      `<div class="knot-animator-top">` +
        `<span>INTERAKTIVE KNOTENSCHULE</span>` +
        `<strong class="knot-step-count" aria-live="polite"></strong>` +
      `</div>` +
      `<div class="knot-stage">` +
        `<svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid meet"></svg>` +
      `</div>` +
      `<div class="knot-copy">` +
        `<strong class="knot-step-title"></strong>` +
        `<p class="knot-step-text"></p>` +
      `</div>` +
      `<div class="knot-dots" role="group" aria-label="Schritt direkt auswählen">` +
        knot.steps.map((_, i) => `<button class="knot-dot" type="button" data-step="${i}" aria-label="Schritt ${i + 1} wählen">${i + 1}</button>`).join('') +
      `</div>` +
      `<div class="knot-controls" role="group" aria-label="Animation steuern">` +
        `<button type="button" data-action="back" aria-label="Vorheriger Schritt">⏮ Zurück</button>` +
        `<button type="button" class="knot-play" data-action="play" aria-label="Animation abspielen">▶ Abspielen</button>` +
        `<button type="button" data-action="next" aria-label="Nächster Schritt">Weiter ⏭</button>` +
        `<button type="button" data-action="restart" aria-label="Neu starten">🔁 Neu starten</button>` +
      `</div>` +
      `<div class="knot-speed">` +
        `<span>Tempo</span>` +
        `<button type="button" data-action="normal" aria-pressed="true">Normal (3s)</button>` +
        `<button type="button" data-action="slow" aria-pressed="false">Langsam (5s)</button>` +
      `</div>` +
      `<p class="knot-colour-key">` +
        `<span><i class="key-blue"></i>Hauptschnur</span>` +
        `<span><i class="key-orange"></i>Arbeitsende</span>` +
        `<span><i class="key-metal"></i>Haken / Öse / Spule</span>` +
        `<span><i class="key-arrow"></i>↗ Bewegungsrichtung</span>` +
      `</p>` +
    `</section>`;
  }

  function mount(element, knot) {
    let current = 0;
    let timer = null;
    let duration = 3000;

    const svg = element.querySelector('svg');
    const count = element.querySelector('.knot-step-count');
    const title = element.querySelector('.knot-step-title');
    const text = element.querySelector('.knot-step-text');
    const play = element.querySelector('[data-action="play"]');
    const dots = [...element.querySelectorAll('.knot-dot')];

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (play) play.textContent = '▶ Abspielen';
    };

    const render = () => {
      const last = current === knot.steps.length - 1;
      const stateLabel = last ? 'FERTIGER KNOTEN · SITZ PRÜFEN' : (current === 3 ? 'ANFEUCHTEN & SCHLIESSEN' : 'BEWEGUNG FOLGEN');

      svg.innerHTML =
        `<rect width="600" height="320" rx="16" class="ka-bg"/>` +
        `<text x="28" y="38" class="ka-name">${esc(knot.name.toUpperCase())}</text>` +
        `<text x="572" y="38" class="ka-step-badge" text-anchor="end">SCHRITT ${current + 1}/${knot.steps.length}</text>` +
        `${drawing(knot, current)}` +
        `<text x="300" y="295" class="ka-state">${stateLabel}</text>`;

      count.textContent = `Schritt ${current + 1} von ${knot.steps.length}`;
      title.textContent = `Schritt ${current + 1}: ${knot.steps[current].split(':')[0] || knot.steps[current]}`;
      text.textContent = knot.steps[current].includes(':') ? knot.steps[current].split(':').slice(1).join(':').trim() : (last ? 'Prüfe den Sitz mit einer kurzen Zugprobe. Erst danach den Überstand sauber auf 2–3 mm kürzen.' : 'Folge dem orangefarbenen Arbeitsende. Die blaue Hauptschnur bleibt fixiert.');

      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === current);
        dot.classList.toggle('passed', i < current);
      });

      const btnBack = element.querySelector('[data-action="back"]');
      const btnNext = element.querySelector('[data-action="next"]');
      if (btnBack) btnBack.disabled = (current === 0);
      if (btnNext) btnNext.disabled = last;
    };

    const next = () => {
      if (current < knot.steps.length - 1) {
        current += 1;
        render();
      } else {
        stop();
      }
    };

    element.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;

      if (button.dataset.step !== undefined) {
        stop();
        current = Number(button.dataset.step);
        return render();
      }

      switch (button.dataset.action) {
        case 'back':
          stop();
          current = Math.max(0, current - 1);
          render();
          break;
        case 'next':
          stop();
          next();
          break;
        case 'restart':
          stop();
          current = 0;
          render();
          break;
        case 'play':
          if (timer) {
            stop();
          } else {
            if (current === knot.steps.length - 1) current = 0;
            render();
            play.textContent = '⏸ Pause';
            timer = setInterval(next, duration);
          }
          break;
        case 'normal':
        case 'slow': {
          const wasPlaying = Boolean(timer);
          stop();
          duration = button.dataset.action === 'slow' ? 5000 : 3000;
          element.querySelector('[data-action="normal"]').setAttribute('aria-pressed', String(duration === 3000));
          element.querySelector('[data-action="slow"]').setAttribute('aria-pressed', String(duration === 5000));
          if (wasPlaying) {
            play.textContent = '⏸ Pause';
            timer = setInterval(next, duration);
          }
          break;
        }
      }
    });

    render();
  }

  function category(index) {
    const group = groups[index];
    return `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><strong>Knoten</strong></div>` +
      `<header class="knot-section-head"><a class="btn-outline btn-sm" href="#knoten">Alle Kategorien</a><h2>${group[0]} <span>(5)</span></h2></header>` +
      `<div class="knot-card-grid">${knots.filter(k => k.categoryIndex === index).map(k => `<a class="knot-card" href="#knoten-knot-${k.id}"><span class="knot-card-icon">${k.icon}</span><span><strong>${esc(k.name)}</strong><small>${esc(k.use)}</small></span></a>`).join('')}</div>`;
  }

  function detail(knot) {
    const root = document.getElementById('knot-view-content');
    const at = knots.indexOf(knot);
    const previous = knots[(at + 29) % 30];
    const next = knots[(at + 1) % 30];

    root.innerHTML =
      `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><a href="#knoten-kat-${knot.categoryIndex}">${esc(knot.category)}</a><span>›</span><strong>${esc(knot.name)}</strong></div>` +
      `<article class="knot-detail">` +
        `<header class="knot-detail-head">` +
          `<p class="eyebrow">${esc(knot.category)}</p>` +
          `<h2>${esc(knot.name)}</h2>` +
          `<p>${esc(knot.use)}</p>` +
        `</header>` +
        `${player(knot)}` +
        `<section class="knot-facts" aria-label="Knoten-Steckbrief">` +
          `<div><b>EINSATZZWECK</b><span>${esc(knot.use)}</span></div>` +
          `<div><b>GEEIGNETE SCHNUR</b><span>${esc(knot.line)}</span></div>` +
          `<div><b>TRAGKRAFT</b><span>ca. ${esc(knot.strength)}</span></div>` +
          `<div><b>PRAXIS-TIPP</b><span>${esc(knot.tip)}</span></div>` +
        `</section>` +
        `<nav class="knot-detail-actions">` +
          `<a class="btn-outline btn-sm" href="#knoten-knot-${previous.id}">⏮ Vorheriger Knoten</a>` +
          `<a class="btn-outline btn-sm" href="#knoten-kat-${knot.categoryIndex}">Zur Kategorie</a>` +
          `<a class="btn-primary btn-sm" href="#knoten-knot-${next.id}">Nächster Knoten ⏭</a>` +
        `</nav>` +
      `</article>`;

    mount(root.querySelector('.knot-animator'), knot);
  }

  function route(hash = 'knoten') {
    const root = document.getElementById('knot-view-content');
    if (!root) return;

    const match = hash.match(/^knoten-knot-(\d+)-(\d+)$/);
    const cat = hash.match(/^knoten-kat-(\d+)$/);

    if (match) {
      const knot = knots.find(k => k.id === `${match[1]}-${match[2]}`);
      if (knot) return detail(knot);
    }

    if (cat && groups[Number(cat[1])]) {
      root.innerHTML = category(Number(cat[1]));
      return;
    }

    root.innerHTML =
      `<div class="knot-breadcrumb"><a href="#start">Start</a><span>›</span><strong>Alle Kategorien</strong></div>` +
      `<header class="knot-hero">` +
        `<p class="eyebrow">STERNI-APP · ANGELKNOTEN-LEXIKON</p>` +
        `<h1 id="knoten-heading">30 Angelknoten – Schritt für Schritt</h1>` +
        `<p>Blau ist die stehende Hauptschnur, Orange das geführte Arbeitsende. Jeder Knoten wird interaktiv im Animated-Knots-Stil animiert.</p>` +
      `</header>` +
      `<div class="knot-card-grid knot-category-grid">${groups.map((g, i) => `<a class="knot-card knot-category-card" href="#knoten-kat-${i}"><span class="knot-card-icon">${g[1]}</span><span><strong>${g[0]}</strong><small>5 Angelknoten</small></span></a>`).join('')}</div>`;
  }

  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    route(location.hash.replace(/^#/, '') || 'knoten');
    window.addEventListener('hashchange', () => {
      if (location.hash.startsWith('#knoten')) route(location.hash.slice(1));
    });
  }

  window.STERNI_KNOTS = { init, route, knots, version: 4 };
  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
