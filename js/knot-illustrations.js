/* Sterni-Knoten: eigenständige Schrittgrafiken, keine übernommenen Fremdgrafiken. */
(() => {
  const BLUE = '#1777d1';
  const ORANGE = '#f06a24';
  const NAVY = '#12375f';
  const INK = '#263746';
  const knotNames = [
    'Verbesserter Clinch', 'Palomar', 'Grinner', 'Doppel-Grinner',
    'Doppelte Schlaufe', 'Albright', 'Blutknoten', 'Rapala',
    'Arbor', 'Springerschlaufe', 'Snell'
  ];

  const esc = (value) => String(value).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  const arrow = (x, y, direction = 'right') => {
    const paths = { right: `M${x} ${y}h28m-10-9 10 9-10 9`, left: `M${x} ${y}h-28m10-9-10 9 10 9`, up: `M${x} ${y}v-28m-9 10 9-10 9 10`, down: `M${x} ${y}v28m-9-10 9 10 9-10` };
    return `<path d="${paths[direction]}" class="motion"/>`;
  };
  const hook = () => `<g class="hardware"><ellipse cx="137" cy="101" rx="12" ry="8"/><path d="M137 109v43q0 23 20 23t20-23v-13l-8 12"/></g>`;
  const spool = () => `<g class="hardware"><circle cx="137" cy="102" r="37"/><circle cx="137" cy="102" r="13"/><path d="M101 72h72M101 132h72"/></g>`;
  const line = (d, cls = 'line') => `<path d="${d}" class="${cls}"/>`;
  const label = (text) => `<text x="130" y="31" text-anchor="middle" class="step-label">${esc(text)}</text>`;

  function drawing(knot, step) {
    const last = step > 2;
    const winding = step === 1;
    const joining = step === 2;
    const loop = step === 0;
    let art = '';

    if ([0, 1, 2, 7, 10].includes(knot)) {
      art += hook();
      if (knot === 1) {
        art += loop
          ? line('M32 64C74 64 75 137 121 108M32 72C74 72 78 145 126 112') + arrow(68, 54, 'down')
          : winding
            ? line('M34 66C80 52 102 65 111 84C120 103 97 118 75 105C52 91 66 59 91 58M38 74C80 60 99 70 108 87') + arrow(194, 66, 'left')
            : joining
              ? line('M35 80C75 71 101 74 121 98M36 89C76 80 101 82 124 103M104 49C185 43 198 157 131 151') + arrow(202, 94, 'down')
              : line('M42 58V103M53 57V103M128 96V53M137 96V53') + arrow(46, 46, 'up') + arrow(132, 46, 'up');
      } else if (knot === 7) {
        art += loop ? line('M30 62C94 62 98 135 128 109M30 70C87 70 93 129 125 106') + arrow(72, 50, 'down')
          : winding ? line('M32 76C79 69 106 78 122 99M71 59c-14 17 14 25 0 42m17-48c-14 17 14 25 0 42m17-42c-14 17 14 25 0 42') + arrow(214, 74, 'left')
          : joining ? line('M34 82C78 74 109 80 126 100M45 101C77 93 104 94 126 105M132 70q-35 6-23 38q10 22 39 11') + arrow(200, 121, 'left')
          : line('M40 83H113M131 101H202') + arrow(45, 64, 'down') + arrow(196, 119, 'up');
      } else if (knot === 10) {
        art += loop ? line('M32 74H123M32 84H123') + arrow(70, 54, 'down')
          : winding ? line('M35 75H122M41 87H120M70 66q-17 19 0 39m14-39q-17 19 0 39m14-39q-17 19 0 39') + arrow(207, 73, 'left')
          : joining ? line('M36 80H121M46 92H121M104 66q-17 22 2 39q16-19 1-39') + arrow(50, 117, 'up')
          : line('M32 78H112M32 88H112M111 72q22 10 11 34') + arrow(45, 54, 'down');
      } else {
        art += loop ? line('M30 70L126 101M30 79L126 105') + arrow(68, 54, 'down')
          : winding ? line('M33 76L124 100M47 64q-13 15 1 28m14-22q-13 15 1 28m14-22q-13 15 1 28m14-22q-13 15 1 28') + arrow(210, 78, 'left')
          : joining ? line('M33 78L126 102M45 96L126 106M114 82q-18 12 2 29q18-11 0-29') + arrow(47, 118, 'up')
          : line('M37 74L124 101M45 94L125 106') + arrow(42, 52, 'down');
      }
    } else if ([3, 5, 6].includes(knot)) {
      art += line('M23 76H237') + line('M23 124H237', 'line secondary');
      if (loop) art += line('M76 77q-31 48 25 48t23-48') + arrow(66, 57, 'down');
      else if (winding) art += line('M57 89q-14 20 2 39m15-39q-14 20 2 39m15-39q-14 20 2 39m15-39q-14 20 2 39', 'motion') + arrow(198, 75, 'left');
      else if (joining) art += line('M83 74q-23 25 4 52M177 126q23-25-4-52') + arrow(42, 76, 'right') + arrow(218, 124, 'left');
      else art += line('M95 78q17 22 34 0q17 22 34 0') + arrow(48, 52, 'down') + arrow(212, 148, 'up');
    } else if ([4, 9].includes(knot)) {
      if (loop) art += line('M30 78H139q65 0 65 33t-65 33H30') + arrow(90, 54, 'down');
      else if (winding) art += line('M30 78H139q65 0 65 33t-65 33H30') + line('M101 69q-18 15 0 31q18-15 0-31', 'motion') + arrow(206, 101, 'left');
      else if (joining) art += line('M30 92H114q31-39 62 0q-31 39-62 0H30') + arrow(59, 127, 'up');
      else art += line('M30 89H109q30-32 59 0q-29 32-59 0H30') + arrow(49, 59, 'down') + arrow(199, 120, 'left');
    } else if (knot === 8) {
      art += spool();
      if (loop) art += line('M35 76C83 76 100 82 104 99M35 85C83 85 100 91 103 103') + arrow(67, 56, 'down');
      else if (winding) art += line('M34 80C76 80 94 89 103 102M44 68q-16 16 0 32m16-34q-16 16 0 32m16-30q-16 16 0 32') + arrow(211, 80, 'left');
      else if (joining) art += line('M34 83H101M102 87q23 14 0 29q-23-14 0-29') + arrow(44, 116, 'up');
      else art += line('M32 84H100M99 84q31 24 0 47') + arrow(44, 57, 'down');
    }
    return `<svg viewBox="0 0 260 200" role="img" aria-label="${esc(knotNames[knot])}, Schritt ${step + 1}">
      <rect width="260" height="200" rx="14" class="paper"/>
      <rect x="12" y="12" width="236" height="28" rx="8" class="head"/>
      ${label(`SCHRITT ${step + 1}`)}
      <text x="24" y="57" class="knot-title">${esc(knotNames[knot])}</text>
      ${art}
      <circle cx="21" cy="181" r="5" fill="${BLUE}"/><text x="32" y="185" class="legend-text">Schnur</text>
      <circle cx="103" cy="181" r="5" fill="${ORANGE}"/><text x="114" y="185" class="legend-text">Bewegung</text>
    </svg>`;
  }

  function replaceOldSketches() {
    document.querySelectorAll('#wissen-knots-list details.wissen-item').forEach((item, knot) => {
      item.querySelectorAll('.knot-gallery figure').forEach((figure, step) => {
        const old = figure.querySelector('svg');
        if (old) old.outerHTML = drawing(knot, step);
      });
    });
  }

  replaceOldSketches();
})();
