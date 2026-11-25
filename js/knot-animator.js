/* Sterni-App – Knoten-Animations-Engine v2 (knot-animator.js)
 *
 * Speziell entwickelt für fachlich exakte, physikalisch plausible Angelknoten-Animationen.
 *
 * Funktionsprinzip:
 *  - Jedes Knotenmodell definiert parametrische Render-Funktionen für jeden Schritt:
 *    `render(container, ctx, stepIndex, t)` mit kontinuierlichem Fortschritt `t` (0.0 bis 1.0).
 *  - Keine unkontrollierten Spline-Verformungen oder schwebenden Schnurenden:
 *    Jeder Strang (Hauptschnur, Arbeitsende, Schlaufe) behält in jedem Frame seine
 *    physikalische Kontinuität und exakte Dicke.
 *  - Echte 3D-Röhrenoptik für Angelschnüre (5-Schicht-Rendering: Kontur, Schatten,
 *    Grundfarbe, Lichtkante, Glanzreflex).
 *  - Hochwertiges 3D-Metall-Rendering für Haken (Öhr, Schenkel, Bogen, Widerhaken).
 *  - Präzise Tiefenebenen (Z-Ordering) für Haken und Schnüre: Die Schlaufe umschließt
 *    den Haken real (Vorderstrang vor dem Haken, Hinterstrang hinter dem Haken).
 *  - Interaktiver Player: Zurück, Abspielen, Pause, Weiter, Neustart, Schritt-Punkte,
 *    Geschwindigkeit (0.45x / 1.0x), synchrone deutsche Handlungsanweisungen.
 */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  // ---------------------------------------------------------------- Easing
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ---------------------------------------------------------------- SVG Hilfsfunktionen
  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---------------------------------------------------------------- Schnur-Styling (3D Tube)
  const ROPE_THEMES = {
    standing: {
      outline: '#0369a1',
      shade: '#0284c7',
      base: '#38bdf8',
      light: '#bae6fd',
      spec: '#ffffff'
    },
    working: {
      outline: '#9a3412',
      shade: '#ea580c',
      base: '#fb923c',
      light: '#fed7aa',
      spec: '#ffffff'
    }
  };

  /**
   * Zeichnet einen Schnurpfad mit plastischer 3D-Röhrenoptik.
   * @param {SVGElement} parent - Ziel-Container
   * @param {string} d - SVG-Pfad-Daten (M... C... L...)
   * @param {'standing'|'working'} theme - Farbthema (Blau oder Orange)
   * @param {number} width - Schnurdicke (z. B. 5.5)
   * @param {number} [opacity=1] - Transparenz
   */
  function drawRope(parent, d, theme, width = 5.5, opacity = 1) {
    const s = ROPE_THEMES[theme] || ROPE_THEMES.standing;
    const g = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: opacity.toFixed(2) }, parent);

    // 1. Tiefe Kontur
    el('path', { d, stroke: s.outline, 'stroke-width': (width + 2.4).toFixed(1) }, g);
    // 2. Schattenkörper
    el('path', { d, stroke: s.shade, 'stroke-width': width.toFixed(1), transform: 'translate(0.6, 0.8)' }, g);
    // 3. Grundfarbe
    el('path', { d, stroke: s.base, 'stroke-width': (width * 0.78).toFixed(1) }, g);
    // 4. Helle Lichtkante
    el('path', { d, stroke: s.light, 'stroke-width': (width * 0.35).toFixed(1), transform: 'translate(-0.8, -0.9)', opacity: '0.9' }, g);
    // 5. Glanzreflex
    el('path', { d, stroke: s.spec, 'stroke-width': (width * 0.14).toFixed(1), transform: 'translate(-1.1, -1.3)', opacity: '0.85' }, g);
    return g;
  }

  // ---------------------------------------------------------------- Haken-Rendering (3D Chrom/Stahl)
  const HOOK_STYLE = {
    outline: '#1e293b',
    dark: '#475569',
    base: '#94a3b8',
    light: '#cbd5e1',
    spec: '#f8fafc'
  };

  /**
   * Zeichnet den Angelhaken in realistischer metallischer Ausführung.
   */
  function drawHook(parent, hx = 360, hy = 110, eyePart = 'all') {
    const g = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);

    // Maße
    const eyeR = 10;
    const shankBottom = hy + 95; // 205
    const bendBottom = hy + 145; // 255
    const pointY = hy + 75; // 185
    const pointX = hx + 55; // 415

    // 1. Öhr (Auge)
    if (eyePart === 'all' || eyePart === 'back') {
      // Hinterer Teil des Öhrs (links)
      const dEyeBack = `M ${hx} ${hy - eyeR} A ${eyeR} ${eyeR} 0 0 0 ${hx} ${hy + eyeR}`;
      el('path', { d: dEyeBack, stroke: HOOK_STYLE.outline, 'stroke-width': '6.5' }, g);
      el('path', { d: dEyeBack, stroke: HOOK_STYLE.base, 'stroke-width': '4.5' }, g);
      el('path', { d: dEyeBack, stroke: HOOK_STYLE.light, 'stroke-width': '2.2', transform: 'translate(-0.6,-0.6)' }, g);
      el('path', { d: dEyeBack, stroke: HOOK_STYLE.spec, 'stroke-width': '0.9', opacity: '0.9', transform: 'translate(-1,-1)' }, g);
    }

    if (eyePart === 'all' || eyePart === 'body') {
      // Schenkel + Bogen + Spitze
      const dBody = `M ${hx} ${hy + eyeR - 1} L ${hx} ${shankBottom} C ${hx} ${bendBottom}, ${hx + 30} ${bendBottom + 8}, ${hx + 50} ${bendBottom - 10} C ${hx + 55} ${bendBottom - 20}, ${pointX} ${pointY + 30}, ${pointX} ${pointY + 15} L ${pointX} ${pointY}`;

      // Schatten
      el('path', { d: dBody, stroke: 'rgba(0,0,0,0.4)', 'stroke-width': '8', transform: 'translate(3,4)' }, g);
      // Kontur
      el('path', { d: dBody, stroke: HOOK_STYLE.outline, 'stroke-width': '6.8' }, g);
      // Grundkörper
      el('path', { d: dBody, stroke: HOOK_STYLE.dark, 'stroke-width': '5.2' }, g);
      el('path', { d: dBody, stroke: HOOK_STYLE.base, 'stroke-width': '4.2' }, g);
      // Glanzkante
      el('path', { d: dBody, stroke: HOOK_STYLE.light, 'stroke-width': '2.2', transform: 'translate(-0.7,-0.7)' }, g);
      el('path', { d: dBody, stroke: HOOK_STYLE.spec, 'stroke-width': '0.9', opacity: '0.9', transform: 'translate(-1.2,-1.2)' }, g);

      // Widerhaken (Barb)
      const dBarb = `M ${pointX} ${pointY + 18} L ${pointX - 7} ${pointY + 28} L ${pointX} ${pointY + 24} Z`;
      el('path', { d: dBarb, fill: HOOK_STYLE.base, stroke: HOOK_STYLE.outline, 'stroke-width': '1.2' }, g);
      el('path', { d: `M ${pointX - 6} ${pointY + 27} L ${pointX - 1} ${pointY + 20}`, stroke: HOOK_STYLE.light, 'stroke-width': '1' }, g);

      // Hakenspitze (konisch verjüngt)
      const dPoint = `M ${pointX - 2.5} ${pointY + 6} L ${pointX} ${pointY - 8} L ${pointX + 2.5} ${pointY + 6} Z`;
      el('path', { d: dPoint, fill: HOOK_STYLE.light, stroke: HOOK_STYLE.outline, 'stroke-width': '1.1' }, g);
      el('path', { d: `M ${pointX} ${pointY + 4} L ${pointX} ${pointY - 6}`, stroke: HOOK_STYLE.spec, 'stroke-width': '1', opacity: '0.95' }, g);
    }

    if (eyePart === 'all' || eyePart === 'front') {
      // Vorderer Teil des Öhrs (rechts)
      const dEyeFront = `M ${hx} ${hy - eyeR} A ${eyeR} ${eyeR} 0 0 1 ${hx} ${hy + eyeR}`;
      el('path', { d: dEyeFront, stroke: HOOK_STYLE.outline, 'stroke-width': '6.5' }, g);
      el('path', { d: dEyeFront, stroke: HOOK_STYLE.base, 'stroke-width': '4.5' }, g);
      el('path', { d: dEyeFront, stroke: HOOK_STYLE.light, 'stroke-width': '2.2', transform: 'translate(0.6,0.6)' }, g);
      el('path', { d: dEyeFront, stroke: HOOK_STYLE.spec, 'stroke-width': '0.9', opacity: '0.9', transform: 'translate(1,1)' }, g);
    }

    return g;
  }

  // ---------------------------------------------------------------- Bewegungspfeil
  function drawArrow(parent, d, label = '', opacity = 1) {
    if (!d || opacity <= 0.02) return null;
    const g = el('g', { opacity: opacity.toFixed(2) }, parent);
    // Schattenlinie
    el('path', { d, fill: 'none', stroke: 'rgba(0,0,0,0.5)', 'stroke-width': '3.2', 'stroke-dasharray': '7 5', 'stroke-linecap': 'round', transform: 'translate(1.5, 2)' }, g);
    // Hauptpfeil
    el('path', { d, fill: 'none', stroke: '#38bdf8', 'stroke-width': '2.4', 'stroke-dasharray': '7 5', 'stroke-linecap': 'round', 'marker-end': 'url(#ka-arrow-head)' }, g);
    return g;
  }

  // ---------------------------------------------------------------- Wassertropfen (Anfeuchten)
  function drawWaterDroplets(parent, cx, cy, opacity = 1) {
    if (opacity <= 0.05) return null;
    const g = el('g', { opacity: opacity.toFixed(2) }, parent);
    const drops = [
      { x: cx - 18, y: cy - 14, r: 4.5 },
      { x: cx + 16, y: cy - 18, r: 5.5 },
      { x: cx + 2, y: cy + 16, r: 4.0 }
    ];
    drops.forEach((d) => {
      // Tropfenkörper
      el('circle', { cx: d.x, cy: d.y, r: d.r, fill: '#38bdf8', opacity: '0.5', stroke: '#0284c7', 'stroke-width': '1' }, g);
      // Glanzpunkt
      el('circle', { cx: d.x - d.r * 0.35, cy: d.y - d.r * 0.35, r: d.r * 0.35, fill: '#ffffff', opacity: '0.9' }, g);
    });
    return g;
  }

  // ---------------------------------------------------------------- Schere (Ende kürzen)
  function drawScissors(parent, x, y, progress = 0) {
    if (progress <= 0.05 || progress >= 0.98) return null;
    const g = el('g', { transform: `translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(0.85)` }, parent);
    const cutAngle = Math.sin(progress * Math.PI) * 14;
    // Klingen
    el('path', { d: 'M -18 -10 L 4 0 L 22 -6', stroke: '#cbd5e1', 'stroke-width': '2.5', fill: 'none', transform: `rotate(${-cutAngle})` }, g);
    el('path', { d: 'M -18 10 L 4 0 L 22 6', stroke: '#cbd5e1', 'stroke-width': '2.5', fill: 'none', transform: `rotate(${cutAngle})` }, g);
    // Gelenkschraube
    el('circle', { cx: 4, cy: 0, r: 2.2, fill: '#334155' }, g);
    return g;
  }

  // ---------------------------------------------------------------- Player Engine
  const ICONS = {
    prev: '<path d="M6 5v14M19 5l-9 7 9 7z"/>',
    play: '<path d="M7 4.5l13 7.5-13 7.5z"/>',
    pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
    next: '<path d="M18 5v14M5 5l9 7-9 7z"/>',
    restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4 3.5v4.5h4.5"/>'
  };

  function button(cls, label, icon) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ka-btn ' + cls;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${label}</span>`;
    return b;
  }

  /**
   * Initialisiert den Knoten-Player im angegebenen HTML-Element.
   */
  function mount(container, knotDef, options = {}) {
    container.innerHTML = '';
    container.classList.add('ka-player');

    // DOM-Aufbau
    const stage = document.createElement('div');
    stage.className = 'ka-stage';
    const svg = el('svg', {
      viewBox: knotDef.viewBox || '0 0 600 320',
      role: 'img',
      'aria-label': `Animation: ${knotDef.title}`,
      preserveAspectRatio: 'xMidYMid meet'
    });
    stage.appendChild(svg);

    // Defs: Pfeil-Marker, Schatten
    const defs = el('defs', {}, svg);
    const marker = el('marker', {
      id: 'ka-arrow-head',
      viewBox: '0 0 10 10',
      refX: '7',
      refY: '5',
      markerWidth: '6',
      markerHeight: '6',
      orient: 'auto'
    }, defs);
    el('path', { d: 'M 0 1 L 9 5 L 0 9 z', fill: '#38bdf8' }, marker);

    // SVG Layer Gruppen
    const gBg = el('g', { id: 'layer-bg' }, svg);
    const gScene = el('g', { id: 'layer-scene' }, svg);

    // Hintergrund-Verlauf
    const grad = el('radialGradient', { id: 'ka-bg-grad', cx: '50%', cy: '45%', r: '75%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#161f2c' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#0a0d12' }, grad);
    el('rect', { x: 0, y: 0, width: 600, height: 320, fill: 'url(#ka-bg-grad)' }, gBg);

    // UI-Elemente unter der Bühne
    const caption = document.createElement('div');
    caption.className = 'ka-caption';
    caption.setAttribute('aria-live', 'polite');
    caption.innerHTML = '<div class="ka-step-label"></div><p class="ka-text"></p>';

    const controls = document.createElement('div');
    controls.className = 'ka-controls';
    const bPrev = button('ka-prev', 'Zurück', ICONS.prev);
    const bPlay = button('ka-play', 'Abspielen', ICONS.play);
    const bPause = button('ka-pause', 'Pause', ICONS.pause);
    const bNext = button('ka-next', 'Weiter', ICONS.next);
    const bRestart = button('ka-restart', 'Neu starten', ICONS.restart);
    [bPrev, bPlay, bPause, bNext, bRestart].forEach((b) => controls.appendChild(b));

    const meta = document.createElement('div');
    meta.className = 'ka-meta';
    const dots = document.createElement('div');
    dots.className = 'ka-dots';
    dots.setAttribute('role', 'group');
    dots.setAttribute('aria-label', 'Schritt direkt wählen');

    const speed = document.createElement('div');
    speed.className = 'ka-speed';
    speed.setAttribute('role', 'group');
    speed.setAttribute('aria-label', 'Geschwindigkeit');
    speed.innerHTML = '<button type="button" data-speed="0.45">Langsam</button><button type="button" data-speed="1.0" aria-pressed="true">Normal</button>';

    meta.appendChild(dots);
    meta.appendChild(speed);
    container.appendChild(stage);
    container.appendChild(caption);
    container.appendChild(controls);
    container.appendChild(meta);

    // Schritt-Punkte
    const steps = knotDef.steps;
    const dotBtns = steps.map((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ka-dot';
      b.setAttribute('aria-label', `Schritt ${i + 1}: ${s.title}`);
      b.title = `Schritt ${i + 1}: ${s.title}`;
      b.textContent = String(i + 1);
      b.addEventListener('click', () => goStep(i));
      dots.appendChild(b);
      return b;
    });

    // Player Status
    let curStep = 0;
    let t = 0; // 0.0 bis 1.0 innerhalb des aktuellen Schritts
    let playing = false;
    let playAll = false;
    let rate = 1.0; // Geschwindigkeit
    let lastTime = 0;
    let raf = 0;

    const STEP_DURATION = 2600; // ms pro Schritt bei Normal-Geschwindigkeit

    function updateCaption(stepIdx) {
      const s = steps[stepIdx];
      caption.querySelector('.ka-step-label').textContent = `Schritt ${stepIdx + 1} von ${steps.length} · ${s.title}`;
      caption.querySelector('.ka-text').textContent = s.text;
      dotBtns.forEach((b, k) => {
        b.classList.toggle('is-active', k === stepIdx);
        b.classList.toggle('is-done', k < stepIdx);
        b.setAttribute('aria-current', k === stepIdx ? 'step' : 'false');
      });
      bPrev.disabled = stepIdx === 0 && t <= 0.05;
      bNext.disabled = stepIdx === steps.length - 1 && t >= 0.95;
    }

    function render() {
      gScene.innerHTML = '';
      const ctx = {
        el,
        drawRope,
        drawHook,
        drawArrow,
        drawWaterDroplets,
        drawScissors,
        easeInOut
      };
      knotDef.render(gScene, ctx, curStep, t);
      updateCaption(curStep);
    }

    function syncButtons() {
      container.classList.toggle('is-playing', playing);
      bPlay.setAttribute('aria-pressed', String(playing));
      bPause.disabled = !playing;
    }

    function loop(now) {
      if (!playing) return;
      const dt = Math.min(64, now - lastTime);
      lastTime = now;

      t += (dt * rate) / STEP_DURATION;

      if (t >= 1.0) {
        t = 1.0;
        render();
        if (playAll && curStep < steps.length - 1) {
          curStep++;
          t = 0;
          render();
          raf = requestAnimationFrame(loop);
          return;
        } else {
          playing = false;
          playAll = false;
          syncButtons();
          return;
        }
      }

      render();
      raf = requestAnimationFrame(loop);
    }

    function play() {
      if (playing) return;
      if (curStep >= steps.length - 1 && t >= 0.99) {
        curStep = 0;
        t = 0;
      }
      playing = true;
      playAll = true;
      lastTime = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      syncButtons();
    }

    function pause() {
      playing = false;
      playAll = false;
      cancelAnimationFrame(raf);
      syncButtons();
    }

    function goStep(i) {
      pause();
      curStep = Math.max(0, Math.min(steps.length - 1, i));
      t = 0;
      render();
      // Automatisch diesen Einzelschritt abspielen
      playing = true;
      playAll = false;
      lastTime = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      syncButtons();
    }

    bPrev.addEventListener('click', () => {
      if (t > 0.2) goStep(curStep);
      else goStep(curStep - 1);
    });

    bNext.addEventListener('click', () => {
      goStep(curStep + 1);
    });

    bPlay.addEventListener('click', play);
    bPause.addEventListener('click', pause);
    bRestart.addEventListener('click', () => {
      goStep(0);
    });

    speed.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-speed]');
      if (!b) return;
      rate = Number(b.dataset.speed);
      speed.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });

    // Initialer Zustand
    t = 0;
    curStep = 0;
    render();
    syncButtons();

    return {
      goStep,
      play,
      pause,
      seek(stepIdx, progress) {
        pause();
        curStep = Math.max(0, Math.min(steps.length - 1, stepIdx));
        t = Math.max(0, Math.min(1, progress));
        render();
      },
      get step() { return curStep; },
      get progress() { return t; },
      get isPlaying() { return playing; },
      destroy() {
        pause();
        container.innerHTML = '';
      }
    };
  }

  global.STERNI_KNOT_ANIMATOR = {
    mount,
    drawRope,
    drawHook,
    drawArrow,
    drawWaterDroplets,
    easeInOut,
    version: '2.0.0'
  };
})(window);
