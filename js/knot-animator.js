/* Sterni-App – Knoten-Animations-Engine (knot-animator.js)
 *
 * Eigenständige Umsetzung, keine fremden Grafiken.
 * Prinzip:
 *  - Jede Schnur hat eine feste physische Länge und wird pro Bild in N gleich
 *    lange Stücke zerlegt (verankert am Arbeitsende). Dadurch "gleitet" die Schnur
 *    sichtbar durch Ösen und Schlaufen, statt zu springen.
 *  - Schlüsselbilder (Keyframes) beschreiben die Schnurlage; dazwischen wird jeder
 *    Schnurpunkt auf einer weichen Kurve (Catmull-Rom über die Zeit) bewegt.
 *  - Jeder Schnurpunkt hat eine Tiefe (z). Daraus entstehen getrennte Ebenen für
 *    saubere Über- und Unterkreuzungen, auch mit Haken/Öse.
 *  - Darstellung als Röhre: Kontur, Schatten-, Grund-, Licht- und Glanzlinie.
 */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;

  // ---------------------------------------------------------------- Geometrie
  function crPoint(p0, p1, p2, p3, t) {
    const d = (a, b) => Math.max(1e-3, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    const tt = t1 + (t2 - t1) * t;
    const L = (a, b, ta, tb) => { const w = (tt - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]; };
    const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
    return L(B1, B2, t1, t2);
  }

  /** Kontrollpunkte [x,y,z] -> dichte, weiche Punktliste [x,y,z] (zentripetales Catmull-Rom). */
  function spline(cps, step = 3) {
    const P = cps.map((p) => [p[0], p[1], p[2] == null ? 0 : p[2]]);
    if (P.length < 2) return P.slice();
    const out = [];
    const n = P.length;
    const ext0 = [2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]];
    const extN = [2 * P[n - 1][0] - P[n - 2][0], 2 * P[n - 1][1] - P[n - 2][1]];
    for (let i = 0; i < n - 1; i++) {
      const p0 = i === 0 ? ext0 : P[i - 1];
      const p3 = i + 2 >= n ? extN : P[i + 2];
      const len = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      const k = Math.max(2, Math.ceil(len / step));
      for (let j = 0; j < k; j++) {
        const t = j / k;
        const q = crPoint(p0, P[i], P[i + 1], p3, t);
        out.push([q[0], q[1], t < 0.5 ? P[i][2] : P[i + 1][2]]);
      }
    }
    out.push(P[n - 1].slice());
    return out;
  }

  function lengthOf(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }

  /** Nimmt die letzten `len` Pixel (vom Ende her) einer dichten Linie; verlängert bei Bedarf geradlinig am Anfang. */
  function takeFromEnd(pts, len) {
    const out = [pts[pts.length - 1].slice()];
    let acc = 0;
    for (let i = pts.length - 1; i > 0; i--) {
      const a = pts[i], b = pts[i - 1];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + seg >= len) {
        const w = (len - acc) / seg;
        out.push([a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, b[2]]);
        return out.reverse();
      }
      acc += seg;
      out.push(b.slice());
    }
    // zu kurz: geradlinig verlängern
    const p0 = pts[0], p1 = pts[Math.min(1, pts.length - 1)];
    const dl = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) || 1;
    const rest = len - acc;
    out.push([p0[0] + (p0[0] - p1[0]) / dl * rest, p0[1] + (p0[1] - p1[1]) / dl * rest, p0[2]]);
    return out.reverse();
  }

  function normals(pts) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
  }

  function offset(pts, nrm, d) {
    return pts.map((p, i) => [p[0] + nrm[i][0] * d, p[1] + nrm[i][1] * d, p[2]]);
  }

  /**
   * Gedoppelte Schnur (Bucht/Schlaufe), wie beim Palomar- oder Springerknoten.
   * opt.D       Mittellinie der Doppelschnur [x,y,z] vom Anfang (Schnurenden) bis zur Schlaufenspitze
   * opt.length  Länge der Doppelschnur (Mittellinie); wird von der Spitze aus gemessen
   * opt.total   konstante Länge Arbeitsende-Seite (Schenkel + halbe Spitze + Endstück)
   * opt.delta   halber Abstand der beiden Schenkel
   * opt.lead    Kontrollpunkte der Hauptschnur (von außerhalb bis kurz vor den Anfang)
   * opt.tail    Kontrollpunkte des freien Endstücks (relativ zum Schenkelanfang, Richtung/Form)
   * opt.flip    Schenkelseiten tauschen
   */
  function doubled(opt) {
    const delta = opt.delta == null ? 3.6 : opt.delta;
    const side = opt.flip ? -1 : 1;
    const Dd = takeFromEnd(spline(opt.D, 2), opt.length);
    const nrm = normals(Dd);
    const legA = offset(Dd, nrm, -delta * side);
    const legB = offset(Dd, nrm, delta * side);
    const tip = Dd[Dd.length - 1];
    const tz = tip[2];
    const tn = nrm[nrm.length - 1];
    const tt = [tn[1], -tn[0]]; // Vorwärtsrichtung
    const arc = [];
    for (let k = 1; k < 10; k++) {
      const a = Math.PI * k / 10;
      const c = Math.cos(a), s = Math.sin(a);
      // von -delta*n über +t nach +delta*n
      const nx = -tn[0] * side * c + tt[0] * s, ny = -tn[1] * side * c + tt[1] * s;
      arc.push([tip[0] + nx * delta, tip[1] + ny * delta, tz]);
    }
    const leadDense = opt.lead ? spline(opt.lead.concat([legA[0]]), 3).slice(0, -1) : [];
    // Endstück: Länge so, dass die Gesamtlänge der Arbeitsende-Seite konstant bleibt
    const tailLen = Math.max(4, (opt.total || (opt.length + 16)) - opt.length - Math.PI * delta / 2);
    const start = legB[0];
    const tcp = [start].concat((opt.tail || [[-12, 4]]).map((p) => [start[0] + p[0], start[1] + p[1], p[2] == null ? start[2] : p[2]]));
    const tailDense = spline(tcp, 2);
    const tailFixed = takeFromStart(tailDense, tailLen);
    return leadDense.concat(legA, arc, legB.slice().reverse(), tailFixed.slice(1));
  }

  /** Nimmt die ersten `len` Pixel einer Linie; verlängert bei Bedarf am Ende geradlinig. */
  function takeFromStart(pts, len) {
    return takeFromEnd(pts.slice().reverse(), len).reverse();
  }

  /** Dichte Linie -> N Punkte mit festem Abstand ds, vom Ende (Arbeitsende) aus. */
  function resample(dense, N, ds) {
    const xs = new Float32Array(N), ys = new Float32Array(N), zs = new Float32Array(N);
    let j = dense.length - 1;
    let acc = 0; // Bogenlänge vom Ende bis dense[j]
    let segLen = j > 0 ? Math.hypot(dense[j][0] - dense[j - 1][0], dense[j][1] - dense[j - 1][1]) : 0;
    for (let i = N - 1; i >= 0; i--) {
      const s = (N - 1 - i) * ds;
      while (j > 0 && acc + segLen < s) {
        acc += segLen;
        j--;
        segLen = j > 0 ? Math.hypot(dense[j][0] - dense[j - 1][0], dense[j][1] - dense[j - 1][1]) : 0;
      }
      if (j > 0) {
        const w = segLen ? (s - acc) / segLen : 0;
        const a = dense[j], b = dense[j - 1];
        xs[i] = a[0] + (b[0] - a[0]) * w;
        ys[i] = a[1] + (b[1] - a[1]) * w;
        zs[i] = w < 0.5 ? a[2] : b[2];
      } else {
        const p0 = dense[0], p1 = dense[Math.min(1, dense.length - 1)];
        const dl = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) || 1;
        const r = s - acc;
        xs[i] = p0[0] + (p0[0] - p1[0]) / dl * r;
        ys[i] = p0[1] + (p0[1] - p1[1]) / dl * r;
        zs[i] = p0[2];
      }
    }
    return { xs, ys, zs };
  }

  // ---------------------------------------------------------------- Gerät (Haken)
  const METAL = { outline: '#334155', base: '#94a3b8', light: '#cbd5e1', spec: '#f8fafc' };

  function metalStroke(d, w, extra = '') {
    return `<path d="${d}" fill="none" stroke="${METAL.outline}" stroke-width="${w + 2}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>` +
      `<path d="${d}" fill="none" stroke="${METAL.base}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>` +
      `<path d="${d}" fill="none" stroke="${METAL.light}" stroke-width="${w * 0.55}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.6 -0.7)" ${extra}/>` +
      `<path d="${d}" fill="none" stroke="${METAL.spec}" stroke-width="${Math.max(0.8, w * 0.17)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" transform="translate(-1.1 -1.3)" ${extra}/>`;
  }

  /** Öhrhaken, Öhr oben (0,0), Schenkel nach unten, Bogen, Spitze mit Widerhaken. */
  function hookParts(o) {
    const zb = o.zBody == null ? 20 : o.zBody;
    const eyeRX = 8.5, eyeRY = 10.5, w = 4.2;
    const shank = 'M0 10.5 L0 92 C0 128 48 128 48 92 L48 70';
    const body =
      `<path d="M0 10 L0 92 C0 128 48 128 48 92 L48 70" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="7" stroke-linecap="round" transform="translate(4 5)"/>` +
      metalStroke(shank, 5.6) +
      // Spitze (verjüngt)
      `<path d="M45.2 71 L48 52 L50.8 71 Z" fill="${METAL.light}" stroke="${METAL.outline}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M47.3 68 L48 56" stroke="${METAL.spec}" stroke-width="0.9" opacity="0.9"/>` +
      // Widerhaken
      `<path d="M46 66 L39.5 79 L46.5 74 Z" fill="${METAL.base}" stroke="${METAL.outline}" stroke-width="1.1" stroke-linejoin="round"/>`;
    const right = `M0 ${-eyeRY} A${eyeRX} ${eyeRY} 0 0 1 0 ${eyeRY}`;
    const left = `M0 ${-eyeRY} A${eyeRX} ${eyeRY} 0 0 0 0 ${eyeRY}`;
    const front = o.eyeFront === 'left' ? left : right;
    const back = o.eyeFront === 'left' ? right : left;
    return [
      { z: zb, svg: body },
      { z: o.zEyeBack == null ? zb - 1 : o.zEyeBack, svg: metalStroke(back, w) },
      { z: o.zEyeFront == null ? zb + 1 : o.zEyeFront, svg: metalStroke(front, w) }
    ];
  }

  const PROP_BUILDERS = { hook: hookParts };

  // ---------------------------------------------------------------- Farben der Schnur
  const ROPE_STYLES = {
    standing: { outline: '#0b3550', shade: '#0284c7', base: '#38bdf8', light: '#a5e3fd', spec: '#ffffff' },
    working: { outline: '#6b2a0c', shade: '#ea580c', base: '#fb923c', light: '#fed7aa', spec: '#ffffff' }
  };

  // ---------------------------------------------------------------- Easing
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // ---------------------------------------------------------------- Vorbereitung eines Knotens
  function prepare(knot) {
    const ropes = knot.ropes.map((r) => ({
      ...r,
      N: r.samples || 260,
      ds: r.length / (r.samples || 260)
    }));
    const frames = knot.keyframes.map((kf) => {
      const out = { duration: kf.duration || 0, ropes: {}, props: kf.props || {}, arrow: kf.arrow || null, label: kf.label || '' };
      ropes.forEach((r) => {
        const def = kf.ropes[r.id];
        const dense = typeof def === 'function' ? def() : (def.dense || spline(def.cps || def));
        const rs = resample(dense, r.N, r.ds);
        rs.trim = (def && def.trim) || 0;
        out.ropes[r.id] = rs;
      });
      return out;
    });
    // Zeitachse
    const cum = [0];
    for (let i = 1; i < frames.length; i++) cum[i] = cum[i - 1] + frames[i].duration;
    const steps = knot.steps.map((s, i) => {
      const first = s.from, last = s.to; // Keyframe-Indizes (first-1 -> last)
      return { ...s, index: i, start: cum[first - 1], end: cum[last], first, last };
    });
    return { ...knot, ropes, frames, cum, steps, total: cum[cum.length - 1] };
  }

  // ---------------------------------------------------------------- Renderer
  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function createRenderer(svg, K) {
    const id = 'ka' + (++uid);
    const defs = el('defs', {}, svg);
    // Hintergrund
    const grad = el('radialGradient', { id: id + '-bg', cx: '50%', cy: '40%', r: '75%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#18212d' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#0b0f15' }, grad);
    const arrowM = el('marker', { id: id + '-arr', viewBox: '0 0 10 10', refX: '6', refY: '5', markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0 L10 5 L0 10 Z', fill: '#e2e8f0' }, arrowM);
    const vb = (K.viewBox || '0 0 600 320').split(/\s+/).map(Number);
    el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: `url(#${id}-bg)` }, svg);
    const shadowG = el('g', { opacity: '0.33', transform: 'translate(3 4.5)' }, svg);
    const scene = el('g', {}, svg);
    const overlay = el('g', {}, svg);
    const arrowPath = el('path', { fill: 'none', stroke: '#e2e8f0', 'stroke-width': '2.2', 'stroke-dasharray': '7 6', 'stroke-linecap': 'round', 'marker-end': `url(#${id}-arr)`, opacity: '0' }, overlay);

    // Requisiten
    const propItems = [];
    (K.props || []).forEach((p) => {
      const parts = PROP_BUILDERS[p.type](p);
      parts.forEach((part, k) => {
        const g = el('g', {});
        g.innerHTML = part.svg;
        propItems.push({ key: `p:${p.id}:${k}`, z: part.z, el: g, prop: p });
      });
    });

    const ropeShadow = {};
    K.ropes.forEach((r) => {
      ropeShadow[r.id] = el('path', { fill: 'none', stroke: '#000', 'stroke-width': r.width + 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, shadowG);
    });

    const segPool = [];
    let lastOrder = '';

    function makeSeg() {
      const pid = `${id}-s${segPool.length}`;
      const path = el('path', { id: pid }, defs);
      const g = el('g', { fill: 'none', 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' });
      const href = '#' + pid;
      const uses = [0, 1, 2, 3, 4].map(() => {
        const u = el('use', {}, g);
        u.setAttribute('href', href);
        u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
        return u;
      });
      const seg = { path, g, uses, style: null, width: 0 };
      segPool.push(seg);
      return seg;
    }

    function styleSeg(seg, style, w) {
      if (seg.style === style && seg.width === w) return;
      const s = ROPE_STYLES[style];
      const [o, sh, b, l, sp] = seg.uses;
      o.setAttribute('stroke', s.outline); o.setAttribute('stroke-width', (w + 2.6).toFixed(2));
      sh.setAttribute('stroke', s.shade); sh.setAttribute('stroke-width', w.toFixed(2)); sh.setAttribute('transform', 'translate(0.7 0.9)');
      b.setAttribute('stroke', s.base); b.setAttribute('stroke-width', (w * 0.74).toFixed(2)); b.setAttribute('transform', 'translate(-0.35 -0.45)');
      l.setAttribute('stroke', s.light); l.setAttribute('stroke-width', (w * 0.32).toFixed(2)); l.setAttribute('transform', 'translate(-0.9 -1.1)'); l.setAttribute('opacity', '0.9');
      sp.setAttribute('stroke', s.spec); sp.setAttribute('stroke-width', (w * 0.12).toFixed(2)); sp.setAttribute('transform', 'translate(-1.25 -1.5)'); sp.setAttribute('opacity', '0.75');
      seg.style = style; seg.width = w;
    }

    function pathD(xs, ys, a, b) {
      let d = 'M' + xs[a].toFixed(1) + ' ' + ys[a].toFixed(1);
      for (let i = a + 1; i <= b; i++) d += 'L' + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1);
      return d;
    }

    function draw(state) {
      const items = [];
      let segUsed = 0;
      K.ropes.forEach((r) => {
        const st = state.ropes[r.id];
        const { xs, ys, zs } = st;
        const N = r.N;
        const trimN = Math.min(N - 2, Math.round(st.trim / r.ds));
        const lastI = N - 1 - trimN;
        const splitI = r.split ? N - 1 - Math.round(r.split / r.ds) : -1;
        ropeShadow[r.id].setAttribute('d', pathD(xs, ys, 0, lastI));
        let a = 0;
        while (a < lastI) {
          const z = zs[a];
          const work = a > splitI;
          let b = a + 1;
          while (b < lastI && zs[b] === z && (b > splitI) === work) b++;
          const seg = segPool[segUsed] || makeSeg();
          segUsed++;
          styleSeg(seg, work ? 'working' : 'standing', r.width);
          seg.path.setAttribute('d', pathD(xs, ys, Math.max(0, a - 1), b));
          items.push({ key: 'r' + segUsed, z: z, el: seg.g });
          a = b;
        }
      });
      // Requisiten-Transformationen
      propItems.forEach((it) => {
        const t = state.props[it.prop.id] || it.prop;
        const tr = `translate(${(t.x ?? it.prop.x).toFixed(2)} ${(t.y ?? it.prop.y).toFixed(2)}) rotate(${(t.rot ?? it.prop.rot ?? 0).toFixed(2)}) scale(${t.scale ?? it.prop.scale ?? 1})`;
        if (it.lastTr !== tr) { it.el.setAttribute('transform', tr); it.lastTr = tr; }
        items.push(it);
      });
      items.sort((p, q) => p.z - q.z);
      const order = items.map((i) => i.key + '@' + i.z).join(',');
      if (order !== lastOrder) {
        items.forEach((i) => scene.appendChild(i.el));
        for (let k = segUsed; k < segPool.length; k++) if (segPool[k].g.parentNode) segPool[k].g.remove();
        lastOrder = order;
      }
      // Bewegungspfeil
      if (state.arrow) {
        if (arrowPath.getAttribute('d') !== state.arrow.d) arrowPath.setAttribute('d', state.arrow.d);
        arrowPath.setAttribute('opacity', state.arrow.opacity.toFixed(2));
      } else arrowPath.setAttribute('opacity', '0');
    }
    return { draw };
  }

  // ---------------------------------------------------------------- Interpolation
  function cr1(a, b, c, d, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  }

  function stateAt(K, t, scratch) {
    const F = K.frames, cum = K.cum;
    t = Math.max(0, Math.min(K.total, t));
    // Schritt bestimmen und schrittweises Easing anwenden
    let step = K.steps.find((s) => t >= s.start && t <= s.end) || K.steps[K.steps.length - 1];
    const sp = step.end > step.start ? (t - step.start) / (step.end - step.start) : 1;
    const tt = step.start + easeInOut(sp) * (step.end - step.start);
    let k = 1;
    while (k < F.length - 1 && cum[k] < tt) k++;
    const dur = F[k].duration || 1;
    const e = Math.max(0, Math.min(1, (tt - cum[k - 1]) / dur));
    const i0 = Math.max(0, k - 2), i1 = k - 1, i2 = k, i3 = Math.min(F.length - 1, k + 1);
    // Nachbarn nur innerhalb des Schritts verwenden (weiche Bewegung, kein Vorgriff)
    const a = i0 >= step.first - 1 ? i0 : i1;
    const d = i3 <= step.last ? i3 : i2;
    const out = { ropes: {}, props: {}, arrow: null };
    K.ropes.forEach((r) => {
      const A = F[a].ropes[r.id], B = F[i1].ropes[r.id], C = F[i2].ropes[r.id], D = F[d].ropes[r.id];
      const s = scratch[r.id] || (scratch[r.id] = { xs: new Float32Array(r.N), ys: new Float32Array(r.N), zs: new Float32Array(r.N) });
      for (let i = 0; i < r.N; i++) {
        s.xs[i] = cr1(A.xs[i], B.xs[i], C.xs[i], D.xs[i], e);
        s.ys[i] = cr1(A.ys[i], B.ys[i], C.ys[i], D.ys[i], e);
        s.zs[i] = e < 0.5 ? B.zs[i] : C.zs[i];
      }
      s.trim = B.trim + (C.trim - B.trim) * e;
      out.ropes[r.id] = s;
    });
    (K.props || []).forEach((p) => {
      const pb = Object.assign({}, p, F[i1].props[p.id] || {});
      const pc = Object.assign({}, p, F[i2].props[p.id] || {});
      out.props[p.id] = {
        x: pb.x + (pc.x - pb.x) * e, y: pb.y + (pc.y - pb.y) * e,
        rot: (pb.rot || 0) + ((pc.rot || 0) - (pb.rot || 0)) * e, scale: pb.scale || 1
      };
    });
    if (F[i2].arrow && sp < 1) out.arrow = { d: F[i2].arrow, opacity: Math.sin(Math.PI * e) * 0.85 };
    return { state: out, step: step.index };
  }

  // ---------------------------------------------------------------- Player
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

  function mount(container, knotDef, options = {}) {
    const K = prepare(knotDef);
    container.innerHTML = '';
    container.classList.add('ka-player');
    const stage = document.createElement('div');
    stage.className = 'ka-stage';
    const svg = el('svg', { viewBox: K.viewBox || '0 0 600 320', role: 'img', 'aria-label': `Animation: ${K.title}`, preserveAspectRatio: 'xMidYMid meet' });
    stage.appendChild(svg);
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
    speed.innerHTML = '<button type="button" data-speed="0.45">Langsam</button><button type="button" data-speed="1" aria-pressed="true">Normal</button>';
    meta.appendChild(dots);
    meta.appendChild(speed);
    container.appendChild(stage);
    container.appendChild(caption);
    container.appendChild(controls);
    container.appendChild(meta);

    const dotBtns = K.steps.map((s, i) => {
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

    const R = createRenderer(svg, K);
    const scratch = {};
    let t = 0, playing = false, stopAt = null, rate = 1, lastNow = 0, raf = 0, cur = 0, lastShownStep = -1;

    function showStep(i) {
      cur = i;
      if (i === lastShownStep) return;
      lastShownStep = i;
      const s = K.steps[i];
      caption.querySelector('.ka-step-label').textContent = `Schritt ${i + 1} von ${K.steps.length} · ${s.title}`;
      caption.querySelector('.ka-text').textContent = s.text;
      dotBtns.forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.classList.toggle('is-done', k < i);
        b.setAttribute('aria-current', k === i ? 'step' : 'false');
      });
      bPrev.disabled = i === 0;
      bNext.disabled = i === K.steps.length - 1;
      if (options.onStep) options.onStep(i, s);
    }

    function render() {
      const r = stateAt(K, t, scratch);
      R.draw(r.state);
      // Während des Abspielens folgt der Text dem Schritt, in dem sich die Animation befindet.
      if (playing && stopAt == null) {
        const idx = K.steps.findIndex((s) => t >= s.start && t < s.end);
        showStep(idx === -1 ? K.steps.length - 1 : idx);
      }
    }

    function syncButtons() {
      container.classList.toggle('is-playing', playing);
      bPlay.setAttribute('aria-pressed', String(playing));
      bPause.disabled = !playing;
    }

    function loop(now) {
      const dt = Math.min(64, now - lastNow);
      lastNow = now;
      t += dt * rate;
      if (stopAt != null && t >= stopAt) { t = stopAt; playing = false; stopAt = null; }
      if (t >= K.total) { t = K.total; playing = false; stopAt = null; }
      render();
      syncButtons();
      if (playing) raf = requestAnimationFrame(loop);
    }

    function start() {
      if (playing) return;
      playing = true;
      lastNow = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      syncButtons();
    }

    function pause() {
      playing = false;
      cancelAnimationFrame(raf);
      // stopAt bleibt erhalten, damit "Abspielen" den angefangenen Schritt korrekt beendet
      syncButtons();
    }

    function goStep(i) {
      i = Math.max(0, Math.min(K.steps.length - 1, i));
      pause();
      showStep(i);
      t = K.steps[i].start;
      stopAt = K.steps[i].end;
      render();
      start();
    }

    function playAll() {
      if (t >= K.total - 1) { t = 0; showStep(0); }
      if (stopAt != null) {
        // laufender Einzelschritt: einfach fortsetzen
        start();
        return;
      }
      start();
    }

    bPrev.addEventListener('click', () => goStep(cur - 1));
    bNext.addEventListener('click', () => goStep(cur + 1));
    bPlay.addEventListener('click', () => { stopAt = stopAt != null && playing ? stopAt : (stopAt != null ? stopAt : null); playAll(); });
    bPause.addEventListener('click', pause);
    bRestart.addEventListener('click', () => { pause(); t = 0; stopAt = null; showStep(0); render(); start(); });
    speed.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-speed]');
      if (!b) return;
      rate = Number(b.dataset.speed);
      speed.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });

    // Anfangszustand
    showStep(0);
    render();
    syncButtons();

    return {
      goStep, pause, play: playAll,
      /** nur für Tests/Vorschau: Zeitpunkt setzen */
      seek(ms) { pause(); t = ms; stopAt = null; const idx = K.steps.findIndex((s) => t >= s.start && t <= s.end); showStep(Math.max(0, idx)); render(); },
      seekFrame(k) { this.seek(K.cum[k]); },
      get time() { return t; }, get total() { return K.total; }, get step() { return cur; }, get playing() { return playing; },
      knot: K,
      destroy() { pause(); container.innerHTML = ''; }
    };
  }

  global.STERNI_KNOT_ANIMATOR = { mount, spline, doubled, takeFromEnd, lengthOf, version: '1.0.0' };
})(window);
