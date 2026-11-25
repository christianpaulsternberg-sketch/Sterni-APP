/* Sterni-App – Palomarknoten v2 (palomar.js)
 *
 * Fachlich exakter, physikalisch plausibler Bewegungsablauf:
 * 1. Schnur doppeln (15 cm Bucht)
 * 2. Doppelte Schnur durch das Hakenöhr führen
 * 3. Lockeren Überhandknoten mit der doppelten Schnur schlagen
 * 4. Die Schlaufe vollständig ÜBER den Haken führen (Front- & Back-Layering)
 * 5. Schlaufe nach oben über das Öhr führen & Schnur befeuchten
 * 6. Gleichmäßig festziehen (Knoten schließt bündig am Öhr) & Arbeitsende kürzen
 */
(function (global) {
  'use strict';

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  const PALOMAR_DEF = {
    id: 'palomar',
    title: 'Palomarknoten',
    category: 'grundknoten',
    viewBox: '0 0 600 320',

    steps: [
      {
        title: 'Schnur doppeln',
        text: 'Lege ca. 15 cm Angelschnur zu einer doppelten Bucht. Die Hauptschnur (blau) und das Arbeitsende (orange) liegen parallel nebeneinander.'
      },
      {
        title: 'Doppelte Schnur durchs Hakenöhr führen',
        text: 'Führe die gelegte Schlaufenspitze (beide Stränge zusammen) von vorne nach hinten sauber durch das Hakenöhr.'
      },
      {
        title: 'Lockeren Überhandknoten bilden',
        text: 'Schlage mit der durchgezogenen Schlaufe einen einfachen Überhandknoten um die beiden Schnüre. Den Knoten noch nicht festziehen!'
      },
      {
        title: 'Schlaufe vollständig über den Haken führen',
        text: 'Weite die aus dem Knoten ragende Schlaufe und führe den gesamten Haken komplett durch diese Schlaufe hindurch.'
      },
      {
        title: 'Schlaufe über das Öhr führen & anfeuchten',
        text: 'Ziehe die Schlaufe nach oben über das Hakenöhr. Befeuchte die Schnur gründlich mit Speichel oder Wasser vor dem Festziehen.'
      },
      {
        title: 'Gleichmäßig festziehen & Ende kürzen',
        text: 'Halte den Haken fest und ziehe gleichmäßig an Hauptschnur und Arbeitsende. Der Knoten schließt bündig am Öhr. Arbeitsende auf ca. 2–3 mm abschneiden.'
      }
    ],

    /**
     * Haupt-Renderfunktion für jeden Schritt und Fortschritt t (0.0 bis 1.0).
     */
    render(container, ctx, stepIdx, t) {
      const p = ctx.easeInOut(Math.max(0, Math.min(1, t)));

      // -------------------------------------------------------------
      // SCHRITT 0: SCHNUR DOPPELN
      // -------------------------------------------------------------
      if (stepIdx === 0) {
        const hx = 380, hy = 110;
        // Haken ruht rechts
        ctx.drawHook(container, hx, hy, 'all');

        // Bucht-Spitze wandert von x=80 nach x=230
        const tipX = lerp(80, 230, p);
        const yTop = 106, yBot = 116;

        // Hauptschnur (Blau, oben)
        ctx.drawRope(container, `M 40 ${yTop} L ${tipX} ${yTop}`, 'standing', 5.5);
        // Bucht-Umlenkung
        ctx.drawRope(container, `M ${tipX} ${yTop} A 5 5 0 0 1 ${tipX} ${yBot}`, 'standing', 5.5);
        // Arbeitsende (Orange, unten)
        ctx.drawRope(container, `M ${tipX} ${yBot} L 40 ${yBot}`, 'working', 5.5);

        // Bewegungspfeil nach rechts
        ctx.drawArrow(container, `M ${tipX - 45} 85 L ${tipX + 15} 85`, '', Math.sin(p * Math.PI) * 0.95);
      }

      // -------------------------------------------------------------
      // SCHRITT 1: DURCH DAS HAKENÖHR FÜHREN
      // -------------------------------------------------------------
      else if (stepIdx === 1) {
        const hx = 360, hy = 110;
        const tipX = lerp(230, 460, p);
        const yTop = 106, yBot = 114;

        // 1. Öhr-Rückseite (Layer hinter der Schnur)
        ctx.drawHook(container, hx, hy, 'back');

        // 2. Schnüre (Hauptschnur Blau, Arbeitsende Orange)
        ctx.drawRope(container, `M 40 ${yTop} L ${tipX} ${yTop}`, 'standing', 5.5);
        ctx.drawRope(container, `M ${tipX} ${yTop} A 4 4 0 0 1 ${tipX} ${yBot}`, 'standing', 5.5);
        ctx.drawRope(container, `M ${tipX} ${yBot} L 40 ${yBot}`, 'working', 5.5);

        // 3. Haken-Körper (Schenkel, Bogen, Spitze)
        ctx.drawHook(container, hx, hy, 'body');

        // 4. Öhr-Vorderseite (Layer VOR der Schnur -> umschließt die Schnur echt)
        ctx.drawHook(container, hx, hy, 'front');

        // Bewegungspfeil durch das Öhr
        const arrowX = lerp(260, 420, p);
        ctx.drawArrow(container, `M ${arrowX - 40} 85 L ${arrowX + 20} 85`, '', Math.sin(p * Math.PI) * 0.95);
      }

      // -------------------------------------------------------------
      // SCHRITT 2: LOCKEREN ÜBERHANDKNOTEN BILDEN
      // -------------------------------------------------------------
      else if (stepIdx === 2) {
        const hx = 360, hy = 160; // Haken hängt tiefer

        // Öhr-Rückseite
        ctx.drawHook(container, hx, hy, 'back');

        // Schnüre vom Haken nach links oben zum Überhandknoten
        const knotX = 260, knotY = 110;

        // Ankommende Stränge von links (x=40..210)
        ctx.drawRope(container, `M 40 106 L 210 106`, 'standing', 5.5);
        ctx.drawRope(container, `M 40 114 L 210 114`, 'working', 5.5);

        // Stränge vom Knoten zum Haken
        ctx.drawRope(container, `M 280 112 C 320 112, 330 145, 360 156`, 'standing', 5.2);
        ctx.drawRope(container, `M 280 118 C 320 118, 330 150, 360 164`, 'working', 5.2);

        // Der Überhandknoten im Werden
        if (p < 0.45) {
          // Phase A: Schlaufe biegt nach oben und links über die Schnüre
          const subP = p / 0.45;
          const tipX = lerp(460, 240, subP);
          const tipY = lerp(110, 50, Math.sin(subP * Math.PI));

          // Schlaufenbogen
          const dLoop = `M 360 156 C 440 150, ${tipX + 60} ${tipY - 30}, ${tipX} ${tipY}`;
          ctx.drawRope(container, dLoop, 'standing', 5.5);
          ctx.drawArrow(container, `M 420 100 C 390 50, 320 40, 270 55`, '', 0.9);
        } else if (p < 0.8) {
          // Phase B: Schlaufe taucht links nach unten ab
          const subP = (p - 0.45) / 0.35;
          const tipX = lerp(240, 230, subP);
          const tipY = lerp(50, 165, subP);

          // Große Schleife über die Stränge (Z > 50)
          const dOver = `M 360 156 C 430 150, 380 40, 280 45 C 240 48, 220 90, ${tipX} ${tipY}`;
          ctx.drawRope(container, dOver, 'standing', 5.5);
          ctx.drawArrow(container, `M 260 55 C 220 80, 210 120, 235 155`, '', 0.9);
        } else {
          // Phase C: Schlaufenspitze taucht durch das Auge von unten nach oben durch
          const subP = (p - 0.8) / 0.2;
          const tipX = lerp(230, 275, subP);
          const tipY = lerp(165, 120, subP);

          // Hinterer Teil des Knotens (Z < 40)
          ctx.drawRope(container, `M 230 155 C 245 175, 270 160, ${tipX} ${tipY}`, 'standing', 5.5);

          // Vorderer Bogen des Überhandknotens (Z > 60)
          ctx.drawRope(container, `M 360 156 C 430 150, 380 40, 280 45 C 230 48, 215 90, 230 155`, 'standing', 5.5);
          ctx.drawArrow(container, `M 240 170 C 260 165, 275 145, 280 125`, '', 0.9);
        }

        // Haken-Körper & Öhr-Vorderseite
        ctx.drawHook(container, hx, hy, 'body');
        ctx.drawHook(container, hx, hy, 'front');
      }

      // -------------------------------------------------------------
      // SCHRITT 3: SCHLAUFE VOLLSTÄNDIG ÜBER DEN HAKEN FÜHREN
      // -------------------------------------------------------------
      else if (stepIdx === 3) {
        const hx = 360, hy = 160;

        // Basis-Überhandknoten bei (260, 110)
        ctx.drawRope(container, `M 40 106 L 240 106`, 'standing', 5.5);
        ctx.drawRope(container, `M 40 114 L 240 114`, 'working', 5.5);
        // Feste Windung des Knotens
        ctx.drawRope(container, `M 240 106 C 265 95, 280 105, 280 115 C 280 125, 255 130, 240 114`, 'standing', 5.5);
        // Stränge zum Öhr
        ctx.drawRope(container, `M 280 115 C 310 115, 330 145, 360 156`, 'standing', 5.2);
        ctx.drawRope(container, `M 270 122 C 310 122, 330 152, 360 164`, 'working', 5.2);

        // Die große Schlaufe weitet sich und wandert nach unten über den Haken
        // Loop-Zentrum wandert von y=120 bis y=275 (unter den Hakenbogen bei y=255)
        const loopY = lerp(120, 275, p);
        const loopW = lerp(30, 85, Math.sin(p * Math.PI * 0.75 + 0.25));

        // 1. Öhr-Rückseite
        ctx.drawHook(container, hx, hy, 'back');

        // 2. HINTERER STRANG DER SCHLAUFE (Z = 30 -> läuft HINTER dem Hakenschenkel)
        const dLoopBack = `M 275 115 C 270 ${loopY - 30}, ${hx - loopW * 0.5} ${loopY}, ${hx} ${loopY + 25}`;
        ctx.drawRope(container, dLoopBack, 'standing', 5.2);

        // 3. HAKEN-KÖRPER (Z = 50 -> Hakenschenkel liegt VOR dem hinteren Strang)
        ctx.drawHook(container, hx, hy, 'body');

        // 4. VORDERER STRANG DER SCHLAUFE (Z = 70 -> läuft VOR dem Hakenschenkel und Bogen)
        const dLoopFront = `M ${hx} ${loopY + 25} C ${hx + loopW * 0.65} ${loopY}, ${hx + 30} ${loopY - 40}, 280 115`;
        ctx.drawRope(container, dLoopFront, 'standing', 5.2);

        // 5. Öhr-Vorderseite
        ctx.drawHook(container, hx, hy, 'front');

        // Bewegungspfeil nach unten über den Haken
        const arrowY = lerp(140, 250, p);
        ctx.drawArrow(container, `M 395 ${arrowY - 30} C 415 ${arrowY}, 410 ${arrowY + 25}, 375 ${arrowY + 35}`, '', Math.sin(p * Math.PI) * 0.95);
      }

      // -------------------------------------------------------------
      // SCHRITT 4: SCHLAUFE ÜBER DAS ÖHR FÜHREN & ANFEUCHTEN
      // -------------------------------------------------------------
      else if (stepIdx === 4) {
        const hx = 360, hy = 160;

        // Basis-Überhandknoten
        ctx.drawRope(container, `M 40 106 L 250 106`, 'standing', 5.5);
        ctx.drawRope(container, `M 40 114 L 250 114`, 'working', 5.5);
        ctx.drawRope(container, `M 250 106 C 275 95, 290 105, 290 115 C 290 125, 265 130, 250 114`, 'standing', 5.5);

        // Öhr-Rückseite
        ctx.drawHook(container, hx, hy, 'back');

        // Schlaufe wird von unten (y=275) nach oben über das Öhr gezogen (y=98)
        const loopUpY = lerp(275, 98, Math.min(1, p * 1.4));

        if (p < 0.7) {
          // Schlaufe wandert am Haken nach oben
          const dLoopBack = `M 280 115 C 310 ${loopUpY + 40}, ${hx - 25} ${loopUpY + 20}, ${hx} ${loopUpY}`;
          const dLoopFront = `M ${hx} ${loopUpY} C ${hx + 35} ${loopUpY + 20}, 330 ${loopUpY + 50}, 290 115`;
          ctx.drawRope(container, dLoopBack, 'standing', 5.2);
          ctx.drawHook(container, hx, hy, 'body');
          ctx.drawRope(container, dLoopFront, 'standing', 5.2);
          ctx.drawArrow(container, `M 385 ${loopUpY + 40} L 385 ${loopUpY - 10}`, '', 0.9);
        } else {
          // Schlaufe sitzt bereits oben über dem Knoten
          ctx.drawHook(container, hx, hy, 'body');
          // Schlaufe schmiegt sich eng um die Hauptschnüre direkt am Öhr
          const dCollar = `M 290 115 C 320 85, 360 90, 360 110 C 360 130, 315 135, 285 115`;
          ctx.drawRope(container, dCollar, 'standing', 5.5);

          // Wassertropfen animieren (Anfeuchten)
          const dropP = (p - 0.7) / 0.3;
          ctx.drawWaterDroplets(container, 335, 110, Math.sin(dropP * Math.PI) * 0.95);
        }

        // Stränge zum Öhr
        ctx.drawRope(container, `M 290 115 C 320 120, 340 145, 360 156`, 'standing', 5.2);
        ctx.drawRope(container, `M 285 122 C 320 128, 340 152, 360 164`, 'working', 5.2);

        // Öhr-Vorderseite
        ctx.drawHook(container, hx, hy, 'front');
      }

      // -------------------------------------------------------------
      // SCHRITT 5: GLEICHMÄSSIG FESTZIEHEN & ENDE KÜRZEN
      // -------------------------------------------------------------
      else if (stepIdx === 5) {
        // Cinching: Haken wandert von hy=160 nach hy=110 hoch
        const cinchP = Math.min(1, p * 1.8);
        const hy = lerp(160, 110, cinchP);
        const hx = 360;

        // Öhr-Rückseite
        ctx.drawHook(container, hx, hy, 'back');

        // Knoten zieht sich zu einem kompakten Paket bei (hx - 15, hy) zusammen
        const kx = lerp(290, hx - 12, cinchP);
        const ky = lerp(115, hy, cinchP);

        // Hauptschnur (straff gezogen)
        ctx.drawRope(container, `M 40 106 L ${kx} ${ky - 3}`, 'standing', 5.5);

        // Schlaufenkragen fest um die Schnur direkt am Öhr
        const collarW = lerp(25, 12, cinchP);
        const dCollarTight = `M ${kx - 5} ${ky - 6} C ${kx + collarW} ${ky - 8}, ${kx + collarW} ${ky + 8}, ${kx - 5} ${ky + 6} Z`;
        ctx.drawRope(container, dCollarTight, 'standing', 5.5);

        // Arbeitsende (Orange)
        if (p < 0.65) {
          // Noch lang vor dem Schnitt
          ctx.drawRope(container, `M ${kx} ${ky + 3} C ${kx - 30} ${ky + 25}, 180 180, 120 200`, 'working', 5.5);
        } else {
          // Sauber auf ca. 2–3 mm (18 px) gekürzt
          ctx.drawRope(container, `M ${kx} ${ky + 3} L ${kx - 16} ${ky + 15}`, 'working', 5.5);
        }

        // Haken-Körper & Öhr-Vorderseite
        ctx.drawHook(container, hx, hy, 'body');
        ctx.drawHook(container, hx, hy, 'front');

        // Spannungs-Pfeile während des Zuziehens (0.0 bis 0.5)
        if (p < 0.5) {
          const arrowAlpha = Math.sin(p / 0.5 * Math.PI);
          // Zug nach links (Schnüre)
          ctx.drawArrow(container, `M 180 90 L 110 90`, '', arrowAlpha * 0.9);
          // Gegenhalt am Haken nach unten
          ctx.drawArrow(container, `M ${hx} ${hy + 160} L ${hx} ${hy + 210}`, '', arrowAlpha * 0.9);
        }

        // Schere schneidet das Ende ab (0.6 bis 0.9)
        if (p >= 0.55 && p <= 0.95) {
          const scissorP = (p - 0.55) / 0.4;
          const sx = kx - 18, sy = ky + 18;
          ctx.drawScissors(container, sx, sy, scissorP);
        }

        // Fertig-Erfolgs-Indikator bei p > 0.9
        if (p > 0.92) {
          const badgeG = ctx.el('g', { opacity: lerp(0, 1, (p - 0.92) / 0.08).toFixed(2) }, container);
          ctx.el('rect', { x: 420, y: 35, width: 155, height: 32, rx: 6, fill: 'rgba(56, 189, 248, 0.15)', stroke: '#38bdf8', 'stroke-width': '1.2' }, badgeG);
          const txt = ctx.el('text', { x: 497, y: 56, fill: '#38bdf8', 'font-size': '12', 'font-weight': '700', 'text-anchor': 'middle', 'font-family': 'sans-serif' }, badgeG);
          txt.textContent = '✓ 95 % TRAGKRAFT';
        }
      }
    }
  };

  global.STERNI_KNOT_PALOMAR = PALOMAR_DEF;
})(window);
