/* Sterni-Knotenschule: eigene, lokale SVG-Schrittansicht. Keine externen Medien. */
(() => {
  'use strict';
  const selector = '#wissen-knots-list details.wissen-item';
  const cloneSvg = (svg) => svg.cloneNode(true);
  // Die älteren SVG-Skizzen verwenden noch eine einheitliche Linienfarbe.
  // Hier wird sie ohne externe Dateien in die Sterni-Farbsemantik überführt.
  function decorateSvg(svg, knotIndex) {
    const greenLines = [...svg.querySelectorAll('[stroke="#2c6a55"], [stroke="#96aa82"]')];
    greenLines.forEach((part, index) => {
      part.classList.add(index === 0 ? 'sterni-primary' : 'sterni-loose');
      if ([3, 5, 6].includes(knotIndex) && index > 0) part.classList.replace('sterni-loose', 'sterni-secondary');
    });
    return svg;
  }

  function makeButton(text, action, label) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'knot-control'; button.dataset.action = action;
    button.textContent = text; button.setAttribute('aria-label', label);
    return button;
  }

  function setupPlayer(item, knotIndex) {
    const gallery = item.querySelector('.knot-gallery');
    if (!gallery) return;
    const figures = [...gallery.querySelectorAll('figure')];
    if (!figures.length) return;
    const steps = figures.map((figure, index) => {
      const caption = figure.querySelector('figcaption');
      return { svg: cloneSvg(figure.querySelector('svg')),
        title: caption?.querySelector('b')?.textContent || `Schritt ${index + 1}`,
        text: caption?.querySelector('span')?.textContent || 'Schnurverlauf kontrollieren und erst dann weitergehen.' };
    });
    const knotName = item.querySelector('summary')?.textContent.trim() || `Knoten ${knotIndex + 1}`;
    let current = 0; let timer = null; let threeD = false; let dragStart = null; let moved = false;
    const player = document.createElement('section');
    player.className = 'knot-player';
    player.setAttribute('aria-label', `${knotName}: interaktive Knotenschule`);
    player.innerHTML = `<div class="knot-player-topline"><span class="knot-player-badge">INTERAKTIVE KNOTENSCHULE</span><span class="knot-step-count" aria-live="polite"></span></div><div class="knot-stage" tabindex="0" role="group" aria-label="Schrittzeichnung. Zum Vergrößern antippen."></div><div class="knot-copy"><strong class="knot-step-title"></strong><p class="knot-step-text"></p></div><div class="knot-controls" role="group" aria-label="Schrittsteuerung"></div><p class="knot-colour-key"><span class="key-blue">● Hauptschnur</span><span class="key-orange">● loses Ende / Bewegung</span><span class="key-green">● zweite Schnur</span><span class="key-silver">● Haken / Wirbel</span></p>`;
    const stage = player.querySelector('.knot-stage'); const count = player.querySelector('.knot-step-count');
    const title = player.querySelector('.knot-step-title'); const description = player.querySelector('.knot-step-text');
    const controls = player.querySelector('.knot-controls');
    const back = makeButton('‹ Zurück', 'back', 'Vorheriger Schritt');
    const play = makeButton('▶ Ablauf', 'play', 'Automatischen Ablauf starten');
    const next = makeButton('Weiter ›', 'next', 'Nächster Schritt');
    const zoom = makeButton('⌕ Vergrößern', 'zoom', 'Zeichnung vergrößern');
    const rotate = makeButton('◈ 3D drehen', '3d', 'Drehbare 3D-Ansicht einschalten');
    controls.append(back, play, next, zoom, rotate);
    const render = () => {
      stage.replaceChildren(decorateSvg(cloneSvg(steps[current].svg), knotIndex));
      stage.querySelector('svg').setAttribute('aria-label', `${knotName}: ${steps[current].title}`);
      stage.classList.toggle('is-3d', threeD);
      count.textContent = `Schritt ${current + 1} von ${steps.length}`;
      title.textContent = steps[current].title; description.textContent = steps[current].text;
      back.disabled = current === 0; next.disabled = current === steps.length - 1;
    };
    const stop = () => { if (timer) window.clearInterval(timer); timer = null; play.textContent = '▶ Ablauf'; play.setAttribute('aria-label', 'Automatischen Ablauf starten'); };
    const auto = () => {
      if (timer) return stop();
      play.textContent = 'Ⅱ Pause'; play.setAttribute('aria-label', 'Automatischen Ablauf pausieren');
      timer = window.setInterval(() => { if (current >= steps.length - 1) return stop(); current += 1; render(); }, 2600);
    };
    const openZoom = () => {
      const dialog = document.createElement('dialog'); dialog.className = 'knot-zoom-dialog';
      dialog.innerHTML = `<form method="dialog"><button class="knot-zoom-close" aria-label="Vergrößerte Ansicht schließen">×</button></form><div class="knot-zoom-art"></div><p>${count.textContent}: ${title.textContent}</p>`;
      dialog.querySelector('.knot-zoom-art').append(decorateSvg(cloneSvg(steps[current].svg), knotIndex)); document.body.append(dialog);
      dialog.addEventListener('close', () => dialog.remove()); dialog.showModal();
    };
    controls.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'back' && current > 0) { stop(); current -= 1; render(); }
      if (action === 'next' && current < steps.length - 1) { stop(); current += 1; render(); }
      if (action === 'play') auto(); if (action === 'zoom') openZoom();
      if (action === '3d') {
        threeD = !threeD; moved = false;
        stage.classList.toggle('is-3d', threeD);
        stage.style.removeProperty('--knot-rotate-x'); stage.style.removeProperty('--knot-rotate-y');
        rotate.textContent = threeD ? '◈ 3D an · ziehen' : '◈ 3D drehen';
        rotate.setAttribute('aria-label', threeD ? 'Drehbare 3D-Ansicht ausschalten' : 'Drehbare 3D-Ansicht einschalten');
      }
    });
    stage.addEventListener('pointerdown', event => { if (threeD) { dragStart = { x: event.clientX, y: event.clientY }; moved = false; stage.setPointerCapture?.(event.pointerId); } });
    stage.addEventListener('pointermove', event => {
      if (!threeD || !dragStart) return;
      const dx = event.clientX - dragStart.x; const dy = event.clientY - dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      stage.style.setProperty('--knot-rotate-x', `${Math.max(-18, Math.min(18, -dy / 4))}deg`);
      stage.style.setProperty('--knot-rotate-y', `${Math.max(-22, Math.min(22, dx / 4))}deg`);
    });
    stage.addEventListener('pointerup', () => { dragStart = null; });
    stage.addEventListener('click', () => { if (!moved) openZoom(); moved = false; });
    stage.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openZoom(); } });
    item.addEventListener('toggle', () => { if (!item.open) stop(); });
    gallery.hidden = true; gallery.before(player); render();
  }
  document.querySelectorAll(selector).forEach(setupPlayer);
  window.STERNI_KNOTENSCHULE = { version: 1, knotCount: document.querySelectorAll(`${selector} .knot-player`).length };
})();
