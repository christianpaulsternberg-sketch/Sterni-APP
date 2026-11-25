/* Sterni-App – 3D WebGL Knoten-Animations-Engine (knot-animator-3d.js)
 *
 * Entwickelt für höchste visuelle Authentizität, räumliche Nachvollziehbarkeit
 * und 100 % kontinuierliche Schnurbewegungen nach Vorbild von realen Bindevorgängen.
 *
 * Merkmale:
 *  - Echte 3D-Zylinderröhre (THREE.TubeGeometry) für die Angelschnur.
 *  - Durchgehende, kontinuierliche Schnurgeometrie ohne Schnitte oder sprunghafte Sprünge.
 *  - Zweifarbige Schnur: Hauptschnur kräftiges Blau (#38bdf8), Arbeitsende leuchtendes Orange (#fb923c).
 *  - 3D-Haken aus massivem poliertem Stahl mit realem Öhr (Durchführung), Schenkel, Bogen und Widerhaken.
 *  - Echte 3D-Physik: Die Schlaufe öffnet sich im Raum (Z-Achse) und wandert um den Haken herum.
 *  - Intuitive 3D-Kamera: Mit Maus oder Finger frei im 3D-Raum drehbar, um den Knoten aus jedem Blickwinkel zu prüfen.
 *  - Interaktiver Player: Schritt-Navigation, Play/Pause, Zeitlupe, synchrone deutsche Handlungsanweisungen.
 */
(function (global) {
  'use strict';

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function v3lerp(vA, vB, t) {
    return new THREE.Vector3(
      lerp(vA.x, vB.x, t),
      lerp(vA.y, vB.y, t),
      lerp(vA.z, vB.z, t)
    );
  }

  // ---------------------------------------------------------------- 3D Haken-Konstruktion
  function create3DHook() {
    const hookGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.90,
      roughness: 0.20
    });

    const hx = 1.5, hy = 0.0;

    // 1. Öhr (Torus, Loch entlang der X-Achse geöffnet)
    const eyeGeo = new THREE.TorusGeometry(0.70, 0.16, 16, 32);
    const eyeMesh = new THREE.Mesh(eyeGeo, metalMat);
    eyeMesh.rotation.y = Math.PI / 2;
    eyeMesh.position.set(hx, hy, 0);
    hookGroup.add(eyeMesh);

    // 2. Schenkel (Zylinder nach unten)
    const shankLen = 2.6;
    const shankGeo = new THREE.CylinderGeometry(0.16, 0.16, shankLen, 16);
    const shankMesh = new THREE.Mesh(shankGeo, metalMat);
    shankMesh.position.set(hx, hy - 0.70 - shankLen / 2, 0);
    hookGroup.add(shankMesh);

    // 3. Bogen (Swept Curve / Halbkreis nach rechts)
    const bendCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hx, hy - 3.3, 0),
      new THREE.Vector3(hx + 0.3, hy - 4.1, 0),
      new THREE.Vector3(hx + 1.2, hy - 4.25, 0),
      new THREE.Vector3(hx + 2.0, hy - 3.7, 0),
      new THREE.Vector3(hx + 2.0, hy - 2.8, 0)
    ]);
    const bendGeo = new THREE.TubeGeometry(bendCurve, 24, 0.16, 12, false);
    const bendMesh = new THREE.Mesh(bendGeo, metalMat);
    hookGroup.add(bendMesh);

    // 4. Hakenspitze (Konus)
    const pointGeo = new THREE.ConeGeometry(0.16, 0.7, 16);
    const pointMesh = new THREE.Mesh(pointGeo, metalMat);
    pointMesh.position.set(hx + 2.0, hy - 2.45, 0);
    hookGroup.add(pointMesh);

    // 5. Widerhaken (Barb)
    const barbGeo = new THREE.ConeGeometry(0.12, 0.5, 12);
    const barbMesh = new THREE.Mesh(barbGeo, metalMat);
    barbMesh.rotation.z = Math.PI * 0.75;
    barbMesh.position.set(hx + 1.82, hy - 2.7, 0);
    hookGroup.add(barbMesh);

    return hookGroup;
  }

  // ---------------------------------------------------------------- 3D Röhren-Mesh mit zweifarbigem Material
  function create3DRopeMesh(curve, radius = 0.13, tubularSegments = 120, radialSegments = 12) {
    const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
    
    // Zweifarbigkeit über Vertex-Farben:
    // Erste Hälfte (0 bis 50 %): Blau #38bdf8
    // Zweite Hälfte (50 bis 100 %): Orange #fb923c
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const colBlue = new THREE.Color(0x38bdf8);
    const colOrange = new THREE.Color(0xfb923c);

    // In TubeGeometry sind die Vertices entlang der Segmente geordnet: (tubularSegments + 1) Ringe
    const ringSize = radialSegments + 1;
    for (let i = 0; i < count; i++) {
      const ringIdx = Math.floor(i / ringSize);
      const ratio = ringIdx / tubularSegments;
      const c = ratio < 0.5 ? colBlue : colOrange;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.12
    });

    return new THREE.Mesh(geo, mat);
  }

  // ---------------------------------------------------------------- Player UI
  const ICONS = {
    prev: '<path d="M6 5v14M19 5l-9 7 9 7z"/>',
    play: '<path d="M7 4.5l13 7.5-13 7.5z"/>',
    pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
    next: '<path d="M18 5v14M5 5l9 7-9 7z"/>',
    restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4 3.5v4.5h4.5"/>',
    camera: '<path d="M15 8h.01M4 6a2 2 0 0 1 2-2h3l2 2h4l2-2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/><circle cx="12" cy="13" r="4"/>'
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

  function mount(container, knotDef) {
    container.innerHTML = '';
    container.classList.add('ka-player');

    // 1. Bühne (Stage) mit 3D WebGL Canvas
    const stage = document.createElement('div');
    stage.className = 'ka-stage';
    stage.style.position = 'relative';
    stage.style.overflow = 'hidden';
    stage.style.cursor = 'grab';
    container.appendChild(stage);

    // 3D Three.js Setup
    const width = container.clientWidth || 600;
    const height = Math.round(width * (320 / 600));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1017);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const defaultCamPos = new THREE.Vector3(0.5, -1.2, 9.8);
    const targetLook = new THREE.Vector3(0.5, -1.4, 0);
    camera.position.copy(defaultCamPos);
    camera.lookAt(targetLook);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    stage.appendChild(renderer.domElement);

    // Beleuchtung
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight1.position.set(5, 8, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-6, -4, 4);
    scene.add(dirLight2);

    const ambLight = new THREE.AmbientLight(0x475569, 1.2);
    scene.add(ambLight);

    // 3D Haken hinzufügen
    const hook = create3DHook();
    scene.add(hook);

    // 3D Röhre (Schnur)
    let ropeMesh = null;

    // 3D Wassertropfen (Anfeuchten)
    const dropGroup = new THREE.Group();
    const dropMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75
    });
    const drop1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), dropMat);
    const drop2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), dropMat);
    const drop3 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), dropMat);
    drop1.position.set(0.3, 0.4, 0.5);
    drop2.position.set(1.4, 0.5, 0.4);
    drop3.position.set(0.8, -0.6, 0.5);
    dropGroup.add(drop1, drop2, drop3);
    dropGroup.visible = false;
    scene.add(dropGroup);

    // 3D Schere (Ende kürzen)
    const scissorGroup = new THREE.Group();
    const scissorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const blade1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), scissorMat);
    const blade2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), scissorMat);
    blade1.rotation.z = Math.PI / 6;
    blade2.rotation.z = -Math.PI / 6;
    scissorGroup.add(blade1, blade2);
    scissorGroup.position.set(-0.8, -1.0, 0.6);
    scissorGroup.visible = false;
    scene.add(scissorGroup);

    // 3D Kamera-Rotation per Pointer (Touch / Maus)
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };
    let spherical = { theta: 0, phi: Math.PI / 2, radius: 9.8 };

    stage.addEventListener('pointerdown', (e) => {
      isDragging = true;
      stage.style.cursor = 'grabbing';
      prevPointer = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = (e.clientX - prevPointer.x) * 0.008;
      const dy = (e.clientY - prevPointer.y) * 0.008;
      prevPointer = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy));

      camera.position.x = targetLook.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = targetLook.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = targetLook.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(targetLook);
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
      stage.style.cursor = 'grab';
    });

    function resetCamera() {
      spherical = { theta: 0, phi: Math.PI / 2, radius: 9.8 };
      camera.position.copy(defaultCamPos);
      camera.lookAt(targetLook);
    }

    // 2. UI-Elemente
    const caption = document.createElement('div');
    caption.className = 'ka-caption';
    caption.innerHTML = '<div class="ka-step-label"></div><p class="ka-text"></p>';

    const controls = document.createElement('div');
    controls.className = 'ka-controls';
    const bPrev = button('ka-prev', 'Zurück', ICONS.prev);
    const bPlay = button('ka-play', 'Abspielen', ICONS.play);
    const bPause = button('ka-pause', 'Pause', ICONS.pause);
    const bNext = button('ka-next', 'Weiter', ICONS.next);
    const bRestart = button('ka-restart', 'Neu starten', ICONS.restart);
    const bCam = button('ka-cam', 'Blickwinkel', ICONS.camera);
    [bPrev, bPlay, bPause, bNext, bRestart, bCam].forEach((b) => controls.appendChild(b));

    const meta = document.createElement('div');
    meta.className = 'ka-meta';
    const dots = document.createElement('div');
    dots.className = 'ka-dots';
    dots.setAttribute('role', 'group');
    dots.setAttribute('aria-label', 'Schritt direkt wählen');

    const speed = document.createElement('div');
    speed.className = 'ka-speed';
    speed.innerHTML = '<button type="button" data-speed="0.45">Langsam</button><button type="button" data-speed="1.0" aria-pressed="true">Normal</button>';

    meta.appendChild(dots);
    meta.appendChild(speed);
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
    let rate = 1.0;
    let lastTime = 0;
    let raf = 0;

    const STEP_DURATION = 3200; // ms pro Schritt

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

    function render3D() {
      // 1. Schnur-Geometrie für aktuellen Schritt und Fortschritt holen
      const curve = knotDef.getCurve(curStep, t);
      if (ropeMesh) {
        ropeMesh.geometry.dispose();
        scene.remove(ropeMesh);
      }
      ropeMesh = create3DRopeMesh(curve);
      scene.add(ropeMesh);

      // 2. Haken-Position aktualisieren
      const hookState = knotDef.getHookState ? knotDef.getHookState(curStep, t) : { y: 0 };
      hook.position.y = hookState.y || 0;

      // 3. Wassertropfen (Schritt 5)
      if (curStep === 4 && t > 0.5) {
        dropGroup.visible = true;
        const scale = Math.sin((t - 0.5) / 0.5 * Math.PI) * 1.2;
        dropGroup.scale.set(scale, scale, scale);
      } else {
        dropGroup.visible = false;
      }

      // 4. Schere (Schritt 6)
      if (curStep === 5 && t > 0.45 && t < 0.95) {
        scissorGroup.visible = true;
        const snipP = (t - 0.45) / 0.5;
        blade1.rotation.z = Math.PI / 6 * Math.cos(snipP * Math.PI * 2);
        blade2.rotation.z = -Math.PI / 6 * Math.cos(snipP * Math.PI * 2);
      } else {
        scissorGroup.visible = false;
      }

      // 5. Rendern
      renderer.render(scene, camera);
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
        render3D();
        if (playAll && curStep < steps.length - 1) {
          curStep++;
          t = 0;
          render3D();
          raf = requestAnimationFrame(loop);
          return;
        } else {
          playing = false;
          playAll = false;
          syncButtons();
          return;
        }
      }

      render3D();
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
      render3D();
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

    bNext.addEventListener('click', () => goStep(curStep + 1));
    bPlay.addEventListener('click', play);
    bPause.addEventListener('click', pause);
    bRestart.addEventListener('click', () => goStep(0));
    bCam.addEventListener('click', resetCamera);

    speed.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-speed]');
      if (!b) return;
      rate = Number(b.dataset.speed);
      speed.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });

    // Resize Handler
    window.addEventListener('resize', () => {
      const w = container.clientWidth || 600;
      const h = Math.round(w * (320 / 600));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    });

    // Start-Rendering
    t = 0;
    curStep = 0;
    render3D();
    syncButtons();

    return {
      goStep,
      play,
      pause,
      seek(stepIdx, progress) {
        pause();
        curStep = Math.max(0, Math.min(steps.length - 1, stepIdx));
        t = Math.max(0, Math.min(1, progress));
        render3D();
      },
      get step() { return curStep; },
      get progress() { return t; },
      resetCamera,
      destroy() {
        pause();
        renderer.dispose();
        container.innerHTML = '';
      }
    };
  }

  global.STERNI_KNOT_ANIMATOR_3D = {
    mount,
    easeInOut,
    lerp,
    v3lerp,
    version: '3.0.0'
  };
})(window);
