/* Sterni-Knoten: eigene, nachbindbare Schrittzeichnungen. Blau = feste Schnur, Rot = geführtes Ende. */
(() => {
  const BLUE = '#1268c4', RED = '#d92727';
  const guides = {
    0: { name: 'Verbesserter Clinchknoten', steps: [
      ['Durch die Öse', 'Das rote Ende von hinten durch die Öse führen. Etwa 15 cm Ende stehen lassen.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108H258')}${arrow('M248 88V104')}${label('START: rotes Ende durch die Öse', 150, 74)}`],
      ['Sechsmal wickeln', 'Das rote Ende 5–7-mal eng um die blaue Hauptschnur wickeln.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108 C235 70 248 148 205 142 C173 137 177 84 205 82 C239 79 241 142 205 142')}${moving('M205 142 C184 142 185 94 206 94 C228 94 230 132 209 133')}${label('5–7 enge Wicklungen', 150, 62)}${arrow('M265 86C251 74 240 72 228 75')}`],
      ['Kleine Schlaufe', 'Das rote Ende zuerst durch die kleine Schlaufe direkt an der Öse stecken.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108C225 66 242 150 202 142C177 137 182 91 204 88C229 84 234 133 207 134')}<ellipse cx="164" cy="108" rx="19" ry="15" class="loop"/>${arrow('M235 130C215 145 187 138 174 121')}${label('durch die kleine rote Schlaufe', 150, 66)}`],
      ['Große Schlaufe', 'Jetzt das rote Ende durch die große, eben entstandene Schlaufe führen.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108C220 62 262 94 244 143C230 181 181 164 181 135C181 104 219 101 224 125')}<ellipse cx="213" cy="132" rx="36" ry="29" class="loop"/>${arrow('M266 105C258 121 250 132 239 139')}${label('dann durch die große rote Schlaufe', 150, 66)}`],
      ['Anfeuchten und zuziehen', 'Anfeuchten. Blaues Hauptende und rotes Ende gleichmäßig ziehen; Wicklungen an die Öse schieben.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108C179 91 190 92 198 108C190 124 179 125 163 108')}${moving('M198 108H267')}${arrow('M38 82H18')}${arrow('M242 82H270')}${label('anfeuchten – beide Enden ziehen', 150, 65)}`]
    ]},
    1: { name: 'Palomarknoten', steps: [
      ['Schnur doppelt durch die Öse', 'Eine etwa 20 cm große rote Bucht bilden und doppelt durch die Öse führen.', () => `${hook()}${fixed('M22 100H139M22 116H139')}${moving('M163 100C227 66 236 152 163 116')}${arrow('M236 80V103')}${label('rote Bucht doppelt durch die Öse', 150, 64)}`],
      ['Lockeren Überhandknoten', 'Mit der doppelten Schnur einen lockeren Überhandknoten legen. Nicht festziehen.', () => `${hook()}${fixed('M22 100H139M22 116H139')}${moving('M163 100C215 80 231 113 197 129C171 141 164 85 199 85C223 85 229 130 247 141')}${arrow('M250 151C232 149 219 141 211 131')}${label('lockeren Überhandknoten legen', 150, 64)}`],
      ['Bucht über den Haken', 'Die große rote Bucht vollständig über Haken und Öse legen.', () => `${hook()}${fixed('M22 100H139M22 116H139')}${moving('M50 62C250 45 262 172 150 177C42 182 30 89 120 79')}${arrow('M252 76C268 108 253 145 222 158')}${label('große rote Bucht über den ganzen Haken', 150, 64)}`],
      ['Gleichmäßig festziehen', 'Anfeuchten. An beiden blauen Schnursträngen ziehen und die rote Bucht sauber anlegen.', () => `${hook()}${fixed('M22 100H139M22 116H139')}${moving('M163 100C180 88 194 88 206 108C195 128 179 128 163 116')}${arrow('M48 80H18')}${arrow('M48 137H18')}${label('blau ziehen – rote Bucht legt sich an', 150, 64)}`]
    ]},
    2: { name: 'Grinnerknoten (Uni)', steps: [
      ['Schlaufe legen', 'Rotes Ende durch die Öse führen und parallel zur blauen Hauptschnur zurücklegen.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108H254M254 108C258 161 94 165 95 111')}${arrow('M242 86H265')}${label('rote Schlaufe parallel zur blauen Schnur', 150, 64)}`],
      ['Durch die Schlaufe wickeln', 'Das rote Ende 5–6-mal durch die rote Schlaufe um beide Schnurstränge führen.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108H251M251 108C258 163 91 163 95 111')}${moving('M110 94C100 102 100 116 111 123 M125 94C115 102 115 116 126 123 M140 94C130 102 130 116 141 123 M155 94C145 102 145 116 156 123 M170 94C160 102 160 116 171 123')}${label('5–6-mal durch die rote Schlaufe', 150, 64)}${arrow('M205 78C191 82 180 89 170 98')}`],
      ['Wicklung schließen', 'Rotes Ende ziehen, bis die Wicklung geschlossen ist. Noch nicht zur Öse schieben.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108C176 86 204 87 211 108C204 129 176 130 163 108H263')}${arrow('M241 84H272')}${label('rotes Ende ziehen: Wicklung schließt sich', 150, 64)}`],
      ['Zur Öse schieben', 'Anfeuchten, den Knoten mit der blauen Hauptschnur bis zur Öse schieben und festziehen.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108C178 93 195 93 204 108C195 123 178 123 163 108')}${arrow('M46 82H18')}${arrow('M243 82H271')}${label('Knoten bis zur Öse schieben und festziehen', 150, 64)}`]
    ]},
    5: { name: 'Albrightknoten', steps: [
      ['Bucht in die dicke Schnur', 'Die dickere blaue Schnur zur Bucht legen. Das rote Ende der dünneren Schnur von unten hineinführen.', () => `${fixed('M25 84H185C246 84 246 142 185 142H25')}${moving('M50 178L168 142')}${arrow('M163 165L183 145')}${label('rote dünne Schnur von unten in die blaue Bucht', 150, 64)}`],
      ['Nach oben wickeln', 'Das rote Ende 8–10-mal von der Bucht weg um beide blauen Schenkel wickeln.', () => `${fixed('M25 84H185C246 84 246 142 185 142H25')}${moving('M52 178L174 142M72 136v-42 M85 140v-46 M98 140v-46 M111 140v-46 M124 140v-46 M137 140v-46 M150 140v-46 M163 140v-46')}${arrow('M185 157L169 143')}${label('8–10 rote Wicklungen von der Bucht weg', 150, 64)}`],
      ['Gleiche Austrittsseite', 'Rotes Ende wieder durch die Bucht führen – auf derselben Seite, auf der es hineinging.', () => `${fixed('M25 84H185C246 84 246 142 185 142H25')}${moving('M52 178L174 142M72 136v-42 M85 140v-46 M98 140v-46 M111 140v-46 M124 140v-46 M137 140v-46 M150 140v-46 M163 140v-46 M174 142L195 165')}${arrow('M190 180L198 166')}${label('auf derselben Seite wieder aus der Bucht', 150, 64)}`],
      ['Anfeuchten und festziehen', 'Anfeuchten. Erst das rote Ende leicht anziehen, dann beide blauen Hauptschnüre gegeneinander ziehen.', () => `${fixed('M25 108H122 M178 108H275')}${moving('M122 96q28-24 56 12q-28 36-56 12q-22-12 0-24')}${arrow('M55 80H22')}${arrow('M245 80H278')}${label('anfeuchten – blaue Hauptschnüre gegeneinander ziehen', 150, 64)}`]
    ]},
    7: { name: 'Rapalaknoten', steps: [
      ['Lockeren Überhandknoten', 'Etwa 10 cm vor dem roten Ende einen lockeren Überhandknoten legen.', () => `${fixed('M22 108H269')}${moving('M82 108C66 83 111 78 113 105C114 130 77 131 82 108')}${arrow('M122 81C108 75 96 76 87 87')}${label('lockeren roten Überhandknoten vorlegen', 150, 64)}`],
      ['Durch Öse und Knoten zurück', 'Rotes Ende durch die Köderöse und zurück durch den offenen Knoten führen.', () => `${hook()}${fixed('M22 108H139')}${moving('M70 108C58 83 110 80 111 106C112 132 75 133 70 108M163 108H240L110 108')}${arrow('M232 86H263')}${label('durch Öse und zurück durch den offenen Knoten', 150, 64)}`],
      ['Dreimal um die Hauptschnur', 'Rotes Ende dreimal um die blaue Hauptschnur wickeln.', () => `${hook()}${fixed('M22 108H139')}${moving('M163 108C205 83 229 92 214 110C202 124 190 102 205 95 M188 120C201 132 223 120 212 108 M177 129C194 143 218 127 209 115')}${label('dreimal um die blaue Hauptschnur wickeln', 150, 64)}${arrow('M244 84C228 83 217 89 209 97')}`],
      ['Schlaufe einstellen und zuziehen', 'Rotes Ende durch die Schlaufe führen. Anfeuchten und so zuziehen, dass eine kleine freie Köderschlaufe bleibt.', () => `${hook()}${fixed('M22 108H132')}${moving('M163 108C184 84 209 93 207 112C205 130 181 133 163 116')}${moving('M207 112H266')}<ellipse cx="148" cy="108" rx="17" ry="14" class="loop"/>${arrow('M240 83H271')}${label('kleine rote Köderschlaufe bleibt frei', 150, 64)}`]
    ]}
  };
  const svg = (title, step, body) => `<svg viewBox="0 0 300 220" role="img" aria-label="${title}, Schritt ${step}: feste Schnur blau, geführtes Ende rot" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow-red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="${RED}"/></marker></defs><rect width="300" height="220" rx="14" class="paper"/><rect x="12" y="12" width="276" height="30" rx="8" class="head"/><text x="150" y="32" text-anchor="middle" class="step-label">SCHRITT ${step}</text>${body}<path d="M22 198h28" class="fixed"/><text x="55" y="202" class="legend-text">feste Schnur</text><path d="M175 198h28" class="moving"/><text x="208" y="202" class="legend-text">geführtes Ende</text></svg>`;
  const fixed = d => `<path d="${d}" class="fixed"/>`, moving = d => `<path d="${d}" class="moving"/>`, arrow = d => `<path d="${d}" class="arrow"/>`, label = (t, x = 150, y = 62) => `<text x="${x}" y="${y}" class="diagram-label">${t}</text>`;
  const hook = () => `<g class="hardware"><ellipse cx="151" cy="108" rx="12" ry="8"/><path d="M151 116v47q0 24 21 24t21-24v-13l-9 12"/></g>`;
  document.querySelectorAll('#wissen-knots-list details.wissen-item').forEach((knot, index) => {
    knot.dataset.knotIndex = index;
    const guide = guides[index];
    if (!guide) return;
    guide.steps.forEach(([heading, instruction, drawing], step) => {
      const figure = knot.querySelectorAll('.knot-gallery figure')[step];
      if (!figure) return;
      const replacement = document.createRange().createContextualFragment(svg(`${guide.name}: ${heading}`, step + 1, drawing())).firstChild;
      figure.querySelector('svg')?.replaceWith(replacement);
      const caption = figure.querySelector('figcaption');
      if (caption) caption.innerHTML = `<b>${step + 1}. ${heading}</b><span>${instruction}</span>`;
    });
  });
})();
