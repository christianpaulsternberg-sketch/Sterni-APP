/* Sterni-App – Palomarknoten (Musteranimation)
 *
 * Fachliche Referenz:
 * - Geeignet für: Monofil, Fluorocarbon und Geflochtene (bei Geflochtener oft bester Allroundknoten).
 * - Tragkraft: ca. 90–95 % der linearen Schnurtragkraft.
 * - Ablauf in 6 präzisen Schritten mit kontinuierlicher Schnurbewegung:
 *   1. Schnur doppeln & Bucht durch das Hakenöhr führen
 *   2. Einfachen Überhandknoten mit der Doppelschnur schlagen (locker lassen)
 *   3. Schlaufe öffnen & über die Hakenspitze klappen
 *   4. Schlaufe über den gesamten Hakenbogen nach oben ziehen
 *   5. Schnur anfeuchten & an beiden Enden gleichmäßig festziehen
 *   6. Fertiger Knoten – überstehendes Arbeitsende sauber kürzen
 */
(function (global) {
  'use strict';

  // Hakenposition: Öhr bei (300, 150)
  // z-Ebenen:
  //   Haken-Körper: 20
  //   Öhr-Rückseite: 15
  //   Öhr-Vorderseite: 25
  // Schnüre:
  //   z < 15: hinter dem Haken
  //   15 < z < 25: durch das Öhr
  //   z > 25: vor dem Haken

  const PALOMAR_DEF = {
    id: 'palomar',
    title: 'Palomarknoten',
    category: 'grundknoten',
    viewBox: '0 0 600 320',
    props: [
      { id: 'hook1', type: 'hook', x: 300, y: 150, zBody: 20, zEyeBack: 15, zEyeFront: 25, eyeFront: 'right' }
    ],
    ropes: [
      {
        id: 'main',
        width: 4.8,
        length: 560,
        samples: 280,
        split: 170 // die letzten 170 px stellen das Arbeitsende (Orange) dar
      }
    ],
    steps: [
      {
        title: 'Schnur doppeln & durchs Öhr führen',
        from: 1, to: 1,
        text: 'Lege ca. 15 cm Schnur zu einer doppelten Bucht und führe die Schlaufenspitze von vorne nach hinten durch das Hakenöhr.'
      },
      {
        title: 'Überhandknoten schlagen',
        from: 2, to: 3,
        text: 'Binde mit der durchgezogenen Doppelschnur einen einfachen, lockeren Überhandknoten um die beiden Schnurstränge. Den Knoten noch nicht festziehen.'
      },
      {
        title: 'Schlaufe über den Haken klappen',
        from: 4, to: 4,
        text: 'Weite die entstandene Schlaufe und führe den gesamten Haken komplett durch die herabhängende Schlaufe.'
      },
      {
        title: 'Schlaufe nach oben führen',
        from: 5, to: 5,
        text: 'Ziehe die Schlaufe über die Hakenspitze und den Bogen nach oben, sodass sie sich oberhalb des Hakenöhrs um die Schnüre legt.'
      },
      {
        title: 'Befeuchten & gleichmäßig festziehen',
        from: 6, to: 6,
        text: 'Knoten vor dem Zuziehen mit Speichel oder Wasser befeuchten (vermeidet Reibungshitze). Gleichmäßig an Hauptschnur und Arbeitsende anziehen.'
      },
      {
        title: 'Fertiger Knoten & Ende kürzen',
        from: 7, to: 7,
        text: 'Der Palomarknoten sitzt kompakt direkt am Öhr. Schneide das überstehende Arbeitsende auf ca. 2–3 mm ab.'
      }
    ],
    keyframes: [
      // 0: Anfangslage vor Schritt 1 (Schnur gedoppelt links vom Öhr)
      {
        duration: 0,
        props: { hook1: { x: 300, y: 150 } },
        arrow: null,
        ropes: {
          main: {
            cps: [
              [50, 146, 18], [120, 146, 18], [190, 146, 18], [220, 146, 18],
              // Bucht (Schlaufenspitze) bei (235, 148)
              [235, 148, 18],
              // Rückweg (unterer Schenkel = Arbeitsende)
              [220, 154, 18], [190, 154, 18], [120, 154, 18], [50, 158, 18]
            ]
          }
        }
      },
      // 1: Schritt 1 – Bucht gleitet durchs Öhr nach rechts (300, 150)
      {
        duration: 1500,
        props: { hook1: { x: 300, y: 150 } },
        arrow: 'M250 135 L330 135',
        ropes: {
          main: {
            cps: [
              [60, 146, 18], [160, 146, 18], [260, 148, 18],
              // Durchs Öhr (z=20, zwischen Rück- und Vorderseite)
              [296, 149, 20], [304, 149, 20],
              // Spitze ragt rechts heraus
              [380, 149, 18], [420, 150, 18], [435, 150, 18],
              [420, 155, 18], [380, 155, 18],
              [304, 152, 20], [296, 152, 20],
              [260, 154, 18], [160, 155, 18], [80, 160, 18]
            ]
          }
        }
      },
      // 2: Schritt 2a – Schlaufe biegt nach oben und bildet das Auge des Überhandknotens
      {
        duration: 1400,
        props: { hook1: { x: 300, y: 150 } },
        arrow: 'M380 140 C380 90 280 80 250 110',
        ropes: {
          main: {
            cps: [
              [60, 146, 18], [180, 146, 18], [280, 148, 18],
              [296, 149, 20], [304, 149, 20],
              // Schlaufe biegt nach oben und links über die Schnüre
              [360, 130, 22], [350, 80, 28], [280, 70, 28], [230, 95, 28],
              [210, 130, 28], [230, 155, 28],
              [280, 152, 22],
              [296, 152, 20], [304, 152, 20],
              [260, 160, 18], [180, 165, 18], [90, 175, 18]
            ]
          }
        }
      },
      // 3: Schritt 2b – Schlaufe taucht durch das Auge (Überhandknoten geformt, aber locker)
      {
        duration: 1600,
        props: { hook1: { x: 300, y: 150 } },
        arrow: 'M230 110 C260 110 270 125 285 140',
        ropes: {
          main: {
            cps: [
              [60, 146, 18], [190, 146, 18], [265, 142, 18],
              // Knotenwindung locker um die Stränge
              [275, 120, 28], [255, 95, 28], [230, 105, 28], [225, 135, 16],
              // Schlaufenspitze taucht hindurch und hängt rechts/unten heraus
              [255, 150, 16], [290, 160, 30], [350, 175, 30], [380, 195, 30],
              [370, 215, 30], [330, 205, 30], [285, 170, 30],
              [296, 152, 20], [304, 152, 20],
              [270, 162, 18], [190, 168, 18], [100, 180, 18]
            ]
          }
        }
      },
      // 4: Schritt 3 – Schlaufe wird geweitet und nach unten über den Haken geklappt
      {
        duration: 1800,
        props: { hook1: { x: 300, y: 150 } },
        arrow: 'M370 180 C390 220 370 275 315 280',
        ropes: {
          main: {
            cps: [
              [60, 146, 18], [200, 145, 18], [270, 138, 28],
              [260, 122, 28], [245, 135, 16], [260, 148, 16],
              // Große weite Schlaufe, die unten um den Hakenschenkel (y=240..270) greift
              [295, 155, 30], [355, 180, 30], [380, 230, 30], [355, 275, 30],
              [300, 285, 30], [255, 270, 30], [250, 210, 10], [275, 160, 10],
              [296, 152, 20], [304, 152, 20],
              [275, 160, 18], [200, 165, 18], [110, 182, 18]
            ]
          }
        }
      },
      // 5: Schritt 4 – Schlaufe gleitet über den Haken nach oben zum Öhr
      {
        duration: 1600,
        props: { hook1: { x: 300, y: 150 } },
        arrow: 'M300 270 C310 220 310 180 305 160',
        ropes: {
          main: {
            cps: [
              [60, 146, 18], [210, 146, 18], [278, 140, 28],
              [270, 132, 28], [262, 140, 16], [270, 146, 16],
              // Schlaufe liegt jetzt eng über dem Hakenöhr (um die Stränge)
              [290, 146, 28], [315, 142, 28], [330, 152, 28], [320, 165, 16],
              [300, 166, 16], [285, 160, 16], [280, 150, 28],
              [296, 150, 20], [304, 150, 20],
              [278, 156, 18], [210, 162, 18], [120, 180, 18]
            ]
          }
        }
      },
      // 6: Schritt 5 – Zusammenziehen (Schnüre straffen sich, Knoten schrumpft ans Öhr)
      {
        duration: 1500,
        props: { hook1: { x: 300, y: 150 } },
        arrow: 'M200 150 L100 150',
        ropes: {
          main: {
            cps: [
              [40, 149, 18], [180, 149, 18], [275, 149, 18],
              // Kleiner kompakter Knoten direkt am Hakenöhr (288..300)
              [286, 147, 28], [292, 145, 28], [296, 148, 28], [294, 153, 16],
              [290, 153, 16], [287, 150, 28],
              // Durchs Öhr
              [298, 149, 20], [302, 149, 20], [300, 151, 20],
              // Arbeitsende läuft nach links unten
              [288, 153, 18], [250, 165, 18], [180, 180, 18], [110, 195, 18]
            ]
          }
        }
      },
      // 7: Schritt 6 – Fertiger Knoten, Arbeitsende wird abgeschnitten
      {
        duration: 1200,
        props: { hook1: { x: 300, y: 150 } },
        arrow: null,
        ropes: {
          main: {
            trim: 145, // Arbeitsende wird um 145 px gekürzt (nur 25 px Stummel bleibt)
            cps: [
              [40, 149, 18], [180, 149, 18], [275, 149, 18],
              // Fester Knoten direkt über dem Öhr
              [286, 147, 28], [292, 145, 28], [296, 148, 28], [294, 153, 16],
              [290, 153, 16], [287, 150, 28],
              [298, 149, 20], [302, 149, 20], [300, 151, 20],
              // Sauberes kurzes Ende (nur noch kurzer Stummel)
              [288, 153, 18], [270, 162, 18]
            ]
          }
        }
      }
    ]
  };

  global.STERNI_KNOT_PALOMAR = PALOMAR_DEF;
})(window);
