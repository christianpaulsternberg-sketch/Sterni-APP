/* Sterni-App – 3D Palomarknoten-Modell (palomar-3d.js)
 *
 * Mathematisch kontinuierliche 3D-Schnurgeometrie.
 * 16 feste 3D-Kontrollpunkte, deren Positionen stetig über die Zeit interpoliert werden.
 * Keine Sprünge, keine Ausblendungen, echte räumliche Über- und Unterkreuzungen.
 */
(function (global) {
  'use strict';

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const lerp = (a, b, t) => a + (b - a) * t;
  const v3lerp = (a, b, t) => new THREE.Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Basis-Punkte für die 7 Zustände (Key-Positions)
  // Jeder Zustand definiert exakt 16 Kontrollpunkte in 3D:
  // P0..P6: Hauptschnur (Blau)
  // P7: Bucht-Spitze (Apex)
  // P8..P15: Arbeitsende (Orange)

  function getState0(t) {
    // Schritt 1: Schnur doppeln
    const tipX = lerp(-3.5, 0.2, t);
    return [
      V3(-6.5, 0.18, 0),
      V3(lerp(-6.0, -2.5, t), 0.18, 0),
      V3(lerp(-5.0, -1.5, t), 0.18, 0),
      V3(lerp(-4.2, -0.6, t), 0.18, 0),
      V3(lerp(-3.8, -0.1, t), 0.18, 0),
      V3(tipX - 0.2, 0.15, 0),
      V3(tipX - 0.05, 0.10, 0),
      // Bucht-Spitze P7
      V3(tipX, 0, 0),
      V3(tipX - 0.05, -0.10, 0),
      V3(tipX - 0.2, -0.15, 0),
      V3(lerp(-3.8, -0.1, t), -0.18, 0),
      V3(lerp(-4.2, -0.6, t), -0.18, 0),
      V3(lerp(-5.0, -1.5, t), -0.18, 0),
      V3(lerp(-6.0, -2.5, t), -0.18, 0),
      V3(-6.5, -0.18, 0),
      V3(-7.5, -0.18, 0)
    ];
  }

  function getState1(t) {
    // Schritt 2: Durchs Hakenöhr führen (Öhr bei x=1.5)
    const tipX = lerp(0.2, 4.2, t);
    return [
      V3(-6.5, 0.18, 0),
      V3(-3.5, 0.18, 0),
      V3(-1.0, 0.18, 0),
      V3(0.5, 0.15, 0),
      V3(1.5, 0.12, 0),
      V3(lerp(0.2, 2.8, t), 0.10, 0),
      V3(tipX - 0.3, 0.08, 0),
      // Bucht-Spitze P7
      V3(tipX, 0, 0),
      V3(tipX - 0.3, -0.08, 0),
      V3(lerp(0.2, 2.8, t), -0.10, 0),
      V3(1.5, -0.12, 0),
      V3(0.5, -0.15, 0),
      V3(-1.0, -0.18, 0),
      V3(-3.5, -0.18, 0),
      V3(-6.5, -0.18, 0),
      V3(-7.5, -0.18, 0)
    ];
  }

  function getState2(t) {
    // Schritt 3: Lockeren Überhandknoten bilden
    // Tip P7 wandert von (4.2, 0, 0) über oben nach links, taucht unter durch
    const arcX = t < 0.5 ? lerp(4.2, 0.2, t / 0.5) : lerp(0.2, 0.0, (t - 0.5) / 0.5);
    const arcY = t < 0.5 ? lerp(0.0, 1.6, Math.sin(t / 0.5 * Math.PI)) : lerp(0.0, 0.9, (t - 0.5) / 0.5);
    const arcZ = t < 0.5 ? lerp(0.0, 0.8, Math.sin(t / 0.5 * Math.PI)) : lerp(-0.7, 0.4, (t - 0.5) / 0.5);

    const hookY = lerp(0.0, -0.8, t);

    return [
      V3(-6.5, 0.18, 0),
      V3(-3.5, 0.18, 0),
      V3(-1.0, 0.18, 0),
      V3(lerp(0.5, 0.0, t), 0.15, 0),
      V3(lerp(1.5, 0.8, t), hookY + 0.12, 0),
      V3(lerp(2.8, 0.5, t), arcY * 0.7, arcZ * 0.5),
      V3(arcX + 0.2, arcY, arcZ),
      // Bucht-Spitze P7
      V3(arcX, arcY, arcZ),
      V3(arcX - 0.2, arcY * 0.8, arcZ * 0.8),
      V3(lerp(2.8, 0.5, t), -0.2, -arcZ * 0.5),
      V3(lerp(1.5, 0.8, t), hookY - 0.12, 0),
      V3(lerp(0.5, 0.0, t), -0.15, 0),
      V3(-1.0, -0.18, 0),
      V3(-3.5, -0.18, 0),
      V3(-6.5, -0.18, 0),
      V3(-7.5, -0.18, 0)
    ];
  }

  function getState3(t) {
    // Schritt 4: Schlaufe vollständig über den Haken führen
    // Schlaufe öffnet sich in Z (Z=+1.3 vorn, Z=-1.3 hinten)
    // und senkt sich von y=0.9 bis y=-5.0 (unter den Hakenbogen bei -4.2)
    const loopY = lerp(0.9, -5.0, t);
    const loopW = lerp(0.4, 1.35, Math.sin(t * Math.PI * 0.8 + 0.2));
    const hookY = -0.8;

    return [
      V3(-6.5, 0.18, 0),
      V3(-3.5, 0.18, 0),
      V3(-1.0, 0.18, 0),
      V3(0.0, 0.15, 0),
      V3(0.8, hookY + 0.12, 0),
      V3(1.5 - loopW, loopY + 0.8, -loopW), // Hinterer Strang hinter dem Haken
      V3(2.5, loopY, -loopW * 0.8),
      // Bucht-Spitze P7 (unter dem Haken)
      V3(2.5, loopY - 0.3, 0),
      V3(2.5, loopY, loopW * 0.8),
      V3(1.5 + loopW, loopY + 0.8, loopW), // Vorderer Strang vor dem Haken
      V3(0.8, hookY - 0.12, 0),
      V3(0.0, -0.15, 0),
      V3(-1.0, -0.18, 0),
      V3(-3.5, -0.18, 0),
      V3(-6.5, -0.18, 0),
      V3(-7.5, -0.18, 0)
    ];
  }

  function getState4(t) {
    // Schritt 5: Schlaufe über das Öhr nach oben führen & anfeuchten
    // Wandert von y=-5.0 nach oben bis y=0.5 oberhalb des Öhrs
    const loopY = lerp(-5.0, 0.5, Math.min(1, t * 1.5));
    const loopW = lerp(1.35, 0.35, Math.min(1, t * 1.5));
    const hookY = -0.8;

    return [
      V3(-6.5, 0.18, 0),
      V3(-3.5, 0.18, 0),
      V3(-1.0, 0.18, 0),
      V3(0.0, 0.15, 0),
      V3(0.8, hookY + 0.12, 0),
      V3(1.5 - loopW, loopY + 0.2, -loopW),
      V3(1.5, loopY + 0.3, -loopW * 0.5),
      // Bucht-Spitze P7 (oben um die Hauptschnur gelegt)
      V3(1.5, loopY + 0.4, 0),
      V3(1.5, loopY + 0.3, loopW * 0.5),
      V3(1.5 + loopW, loopY + 0.2, loopW),
      V3(0.8, hookY - 0.12, 0),
      V3(0.0, -0.15, 0),
      V3(-1.0, -0.18, 0),
      V3(-3.5, -0.18, 0),
      V3(-6.5, -0.18, 0),
      V3(-7.5, -0.18, 0)
    ];
  }

  function getState5(t) {
    // Schritt 6: Gleichmäßig festziehen & Ende kürzen
    // Knoten zieht sich bündig an das Hakenöhr (x=1.5, y=0.2) zusammen
    const cinch = Math.min(1, t * 1.8);
    const hookY = lerp(-0.8, 0.0, cinch);
    const kX = lerp(0.8, 1.5, cinch);
    const kY = lerp(hookY + 0.3, hookY + 0.25, cinch);

    const isCut = t > 0.65;
    const tagEndLen = isCut ? -1.0 : -6.5;

    return [
      V3(-6.5, 0.18, 0),
      V3(-3.5, 0.18, 0),
      V3(lerp(-1.0, 0.5, cinch), 0.18, 0),
      V3(kX - 0.2, kY + 0.05, 0),
      V3(kX, kY + 0.08, 0),
      V3(kX + 0.15, kY, 0.1),
      V3(kX + 0.18, kY - 0.05, 0),
      // Bucht P7 sitzt fest als Kragen über dem Öhr
      V3(kX + 0.15, kY - 0.10, -0.1),
      V3(kX, kY - 0.08, 0),
      V3(kX - 0.15, kY - 0.05, 0),
      V3(kX - 0.2, kY - 0.05, 0),
      V3(lerp(0.0, kX - 0.3, cinch), kY - 0.15, 0),
      V3(lerp(-1.0, kX - 0.5, cinch), kY - 0.3, 0),
      V3(lerp(-3.5, tagEndLen * 0.5, cinch), -0.6, 0),
      V3(lerp(-6.5, tagEndLen, cinch), -0.8, 0),
      V3(lerp(-7.5, tagEndLen - 0.5, cinch), -0.9, 0)
    ];
  }

  const PALOMAR_3D = {
    id: 'palomar',
    title: 'Palomarknoten',
    category: 'grundknoten',

    steps: [
      {
        title: 'Schnur doppeln',
        text: 'Lege ca. 15 cm Angelschnur zu einer doppelten Bucht. Die Hauptschnur (blau) und das Arbeitsende (orange) liegen parallel nebeneinander.'
      },
      {
        title: 'Doppelte Schnur durchs Hakenöhr führen',
        text: 'Führe die gelegte Schlaufenspitze von vorne nach hinten sauber durch das Hakenöhr.'
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

    getHookState(stepIdx, t) {
      const p = ease(Math.max(0, Math.min(1, t)));
      if (stepIdx === 2) return { y: lerp(0.0, -0.8, p) };
      if (stepIdx === 3 || stepIdx === 4) return { y: -0.8 };
      if (stepIdx === 5) return { y: lerp(-0.8, 0.0, Math.min(1, p * 1.8)) };
      return { y: 0.0 };
    },

    getCurve(stepIdx, t) {
      const p = ease(Math.max(0, Math.min(1, t)));
      let pts;
      switch (stepIdx) {
        case 0: pts = getState0(p); break;
        case 1: pts = getState1(p); break;
        case 2: pts = getState2(p); break;
        case 3: pts = getState3(p); break;
        case 4: pts = getState4(p); break;
        case 5: pts = getState5(p); break;
        default: pts = getState5(1.0);
      }
      return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    }
  };

  global.STERNI_KNOT_PALOMAR_3D = PALOMAR_3D;
})(window);
