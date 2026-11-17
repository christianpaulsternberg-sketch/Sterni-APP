window.STERNI_QUIZ_DATA = (() => {
  const QUIZ_CATEGORIES = [
    { id: "angeln", label: "Angeln & Fischkunde" },
    { id: "mathe", label: "Mathematik & Logik" },
    { id: "physik", label: "Physik & Technik" },
    { id: "allgemein", label: "Allgemeinwissen" },
    { id: "medizin", label: "Medizin & Gesundheit" },
    { id: "chemie", label: "Chemie" },
    { id: "biologie", label: "Biologie & Natur" },
    { id: "geographie", label: "Geographie & Länder" },
    { id: "geschichte", label: "Geschichte" },
    { id: "astronomie", label: "Astronomie & Weltall" },
    { id: "informatik", label: "Informatik & Digitales" },
    { id: "sport", label: "Sport & Olympisches" },
    { id: "literatur", label: "Literatur & Sprache" },
    { id: "musik", label: "Musik & Kunst" },
    { id: "film", label: "Film & Serien" },
    { id: "wirtschaft", label: "Wirtschaft & Recht" },
    { id: "essen", label: "Essen & Trinken" },
    { id: "handwerk", label: "Handwerk & Alltag" },
    { id: "verkehr", label: "Verkehr & Boote" },
    { id: "kurioses", label: "Rekorde & Kurioses" }
  ];

  const DEFAULT_MEMBERS = [];

  const QUESTIONS = [
    // 1. Angeln & Fischkunde
    { category: "angeln", question: "Woran erkennst du einen Zander eindeutig gegenüber dem Flussbarsch?", options: ["Langgestreckter Körper, Hundszähne im Maul und keine kräftigen Querstreifen", "Rote Schwanzflosse und zwei Barteln", "Nur eine einzelne Rückenflosse", "Komplett schuppenlose Haut"], correct: 0, explanation: "Der Zander trägt spitze Hundszähne im Maul und verwaschene Binden statt kräftiger Barsch-Querstreifen." },
    { category: "angeln", question: "Welcher Knoten verbindet dünne geflochtene Hauptschnur zuverlässig mit dickem Fluorocarbon?", options: ["Albrightknoten", "Arborknoten", "Springerschlaufe", "Einfacher Überhandknoten"], correct: 0, explanation: "Der Albrightknoten ist speziell für stark unterschiedliche Schnurdurchmesser gedacht." },
    { category: "angeln", question: "Wie viele Barteln besitzt ein Europäischer Wels?", options: ["6 Barteln (2 lange oben, 4 kürzere unten)", "2 Barteln am Unterkiefer", "4 gleich lange Barteln", "Keine Barteln"], correct: 0, explanation: "Zwei lange Oberkiefer- und vier kürzere Unterkieferbarteln dienen dem Wels als Tast- und Geschmacksorgan." },

    // 2. Mathematik & Logik
    { category: "mathe", question: "Was ist das Ergebnis von 15 % von 240?", options: ["36", "24", "42", "32"], correct: 0, explanation: "10 % von 240 sind 24, 5 % sind 12 – zusammen 36." },
    { category: "mathe", question: "Du überholst in einem Rennen den Zweitplatzierten. Welchen Platz hast du jetzt?", options: ["Zweiter", "Erster", "Dritter", "Vierter"], correct: 0, explanation: "Du nimmst genau den Platz des Überholten ein – also den zweiten Platz." },
    { category: "mathe", question: "Wie groß ist die Innenwinkelsumme in jedem ebenen Dreieck?", options: ["180°", "90°", "270°", "360°"], correct: 0, explanation: "Die drei Innenwinkel eines Dreiecks ergeben in der euklidischen Geometrie stets 180°." },

    // 3. Physik & Technik
    { category: "physik", question: "In welcher Einheit wird der elektrische Widerstand gemessen?", options: ["Ohm (Ω)", "Watt (W)", "Ampere (A)", "Volt (V)"], correct: 0, explanation: "Georg Simon Ohm gab der Einheit Ω des elektrischen Widerstands seinen Namen." },
    { category: "physik", question: "Warum schwimmt Eis auf flüssigem Wasser?", options: ["Eis hat durch seine Kristallstruktur eine geringere Dichte als flüssiges Wasser", "Eis enthält eingeschlossenes Salz", "Wasser zieht sich beim Gefrieren stark zusammen", "Die Oberflächenspannung hält Eis oben"], correct: 0, explanation: "Bei 4 °C hat Wasser seine höchste Dichte; gefrorenes Eis dehnt sich aus und wird leichter pro Volumen." },
    { category: "physik", question: "Mit welcher Geschwindigkeit breitet sich Licht im Vakuum näherungsweise aus?", options: ["ca. 300.000 km/s", "ca. 340 m/s", "ca. 30.000 km/s", "ca. 150.000 km/h"], correct: 0, explanation: "Die Lichtgeschwindigkeit im Vakuum beträgt exakt 299.792.458 m/s (rund 300.000 km/s)." },

    // 4. Allgemeinwissen
    { category: "allgemein", question: "Wie viele Bundesländer hat die Bundesrepublik Deutschland?", options: ["16", "14", "15", "18"], correct: 0, explanation: "Deutschland besteht aus 13 Flächenländern und 3 Stadtstaaten (Berlin, Hamburg, Bremen)." },
    { category: "allgemein", question: "Welches Metall ist bei Raumtemperatur (20 °C) flüssig?", options: ["Quecksilber", "Blei", "Zinn", "Aluminium"], correct: 0, explanation: "Quecksilber schmilzt bereits bei −38,8 °C und ist daher bei Zimmertemperatur flüssig." },
    { category: "allgemein", question: "Wie viele Tage hat ein Schaltjahr?", options: ["366 Tage", "365 Tage", "364 Tage", "367 Tage"], correct: 0, explanation: "Im Schaltjahr kommt der 29. Februar hinzu, wodurch das Jahr 366 Tage zählt." },

    // 5. Medizin & Gesundheit
    { category: "medizin", question: "Welches Organ produziert das Hormon Insulin zur Regulierung des Blutzuckers?", options: ["Bauchspeicheldrüse (Pankreas)", "Leber", "Milz", "Niere"], correct: 0, explanation: "Die Beta-Zellen der Langerhans-Inseln in der Bauchspeicheldrüse bilden Insulin." },
    { category: "medizin", question: "Was gilt bei Erwachsenen als normaler Ruhepuls?", options: ["ca. 60–80 Schläge pro Minute", "ca. 20–30 Schläge pro Minute", "ca. 120–140 Schläge pro Minute", "ca. 160–180 Schläge pro Minute"], correct: 0, explanation: "Ein gesunder Erwachsener hat im Ruhezustand meist zwischen 60 und 80 Herzschläge pro Minute." },
    { category: "medizin", question: "Welche Blutgruppe gilt für rote Blutkörperchen (Erythrozyten) als Universalspender?", options: ["0 negativ (0 Rh-)", "AB positiv", "A positiv", "B negativ"], correct: 0, explanation: "Erythrozyten der Blutgruppe 0 negativ tragen weder A-, B- noch Rhesus-D-Antigene." },

    // 6. Chemie
    { category: "chemie", question: "Welches chemische Symbol steht für Gold?", options: ["Au", "Ag", "Gd", "Go"], correct: 0, explanation: "Au leitet sich vom lateinischen Wort ‚aurum‘ für Gold ab." },
    { category: "chemie", question: "Welchen pH-Wert hat reines, neutrales Wasser bei 25 °C?", options: ["7", "0", "5", "14"], correct: 0, explanation: "Die pH-Skala reicht von 0 (stark sauer) bis 14 (stark basisch); 7 ist neutral." },
    { category: "chemie", question: "Welches Gas macht mit rund 78 % den größten Anteil der Erdatmosphäre aus?", options: ["Stickstoff", "Sauerstoff", "Kohlenstoffdioxid", "Argon"], correct: 0, explanation: "Trockene Luft besteht zu etwa 78 % aus Stickstoff (N₂) und rund 21 % aus Sauerstoff (O₂)." },

    // 7. Biologie & Natur
    { category: "biologie", question: "Welcher heimische Vogel kann als einziger auch rückwärts fliegen?", options: ["Kein heimischer – das können nur Kolibris", "Der Eisvogel", "Der Mauersegler", "Die Rauchschwalbe"], correct: 0, explanation: "Kolibris sind die einzigen Vögel, die dauerhaft rückwärts fliegen können; sie leben jedoch nur in Amerika." },
    { category: "biologie", question: "Wie heißt der grüne Blattfarbstoff, mit dem Pflanzen Photosynthese betreiben?", options: ["Chlorophyll", "Hämoglobin", "Melanin", "Keratin"], correct: 0, explanation: "Chlorophyll absorbiert Sonnenlicht und ermöglicht die Umwandlung von CO₂ und Wasser in Zucker und Sauerstoff." },
    { category: "biologie", question: "Zu welcher Tierklasse gehören Wale und Delfine?", options: ["Säugetiere", "Fische", "Amphibien", "Reptilien"], correct: 0, explanation: "Wale atmen Luft mit Lungen, sind gleichwarm und säugen ihre Jungen mit Muttermilch." },

    // 8. Geographie & Länder
    { category: "geographie", question: "Welcher ist der flächenmäßig größte Binnensee Deutschlands?", options: ["Bodensee (auch wenn er Anrainerstaaten hat; komplett deutsch: Müritz)", "Chiemsee", "Starnberger See", "Steinhuder Meer"], correct: 0, explanation: "Der Bodensee ist insgesamt der größte See an deutscher Grenze; die Müritz ist der größte vollständig in Deutschland liegende See." },
    { category: "geographie", question: "Durch wie viele Länder fließt die Donau auf ihrem Weg zum Schwarzen Meer?", options: ["10 Länder", "4 Länder", "6 Länder", "15 Länder"], correct: 0, explanation: "Die Donau durchfließt oder berührt 10 Staaten – mehr als jeder andere Fluss der Erde." },
    { category: "geographie", question: "Wie heißt die Hauptstadt von Kanada?", options: ["Ottawa", "Toronto", "Vancouver", "Montreal"], correct: 0, explanation: "Ottawa liegt in Ontario und ist seit 1857 Hauptstadt Kanadas." },

    // 9. Geschichte
    { category: "geschichte", question: "In welchem Jahr fiel die Berliner Mauer?", options: ["1989", "1985", "1990", "1991"], correct: 0, explanation: "Am Abend des 9. November 1989 öffneten sich die Grenzübergänge der Berliner Mauer." },
    { category: "geschichte", question: "Wer erfand um 1450 in Mainz den Buchdruck mit beweglichen Metalllettern?", options: ["Johannes Gutenberg", "Martin Luther", "Galileo Galilei", "Leonardo da Vinci"], correct: 0, explanation: "Johannes Gutenberg revolutionierte mit dem mechanischen Buchdruck die Verbreitung von Wissen." },
    { category: "geschichte", question: "Welches Schiff sank auf seiner Jungfernfahrt im April 1912 im Nordatlantik?", options: ["RMS Titanic", "RMS Lusitania", "SS Andrea Doria", "Bismarck"], correct: 0, explanation: "Die Titanic kollidierte in der Nacht vom 14. auf den 15. April 1912 mit einem Eisberg." },

    // 10. Astronomie & Weltall
    { category: "astronomie", question: "Welcher Planet unseres Sonnensystems ist der Sonne am nächsten?", options: ["Merkur", "Venus", "Mars", "Erde"], correct: 0, explanation: "Die Reihenfolge von innen nach außen lautet: Merkur, Venus, Erde, Mars, Jupiter, Saturn, Uranus, Neptun." },
    { category: "astronomie", question: "Wie lange braucht das Licht der Sonne ungefähr bis zur Erde?", options: ["ca. 8 Minuten", "ca. 1 Sekunde", "ca. 2 Stunden", "ca. 24 Stunden"], correct: 0, explanation: "Bei rund 150 Millionen Kilometern Abstand benötigt das Sonnenlicht etwa 8 Minuten und 20 Sekunden." },
    { category: "astronomie", question: "Welcher ist der größte Planet in unserem Sonnensystem?", options: ["Jupiter", "Saturn", "Neptun", "Uranus"], correct: 0, explanation: "Jupiter ist ein Gasriese mit etwa dem elffachen Erddurchmesser." },

    // 11. Informatik & Digitales
    { category: "informatik", question: "Wie viele Bits bilden genau ein Byte?", options: ["8 Bits", "4 Bits", "16 Bits", "10 Bits"], correct: 0, explanation: "Ein Byte besteht aus 8 Bits und kann 256 verschiedene Zustände darstellen." },
    { category: "informatik", question: "Wofür steht die Abkürzung ‚HTTP‘ im Web?", options: ["Hypertext Transfer Protocol", "High Tech Transmission Path", "Host Terminal Text Process", "Hyperlink Tool Transport"], correct: 0, explanation: "HTTP ist das grundlegende Übertragungsprotokoll zum Laden von Webseiten." },
    { category: "informatik", question: "Welche Taste oder Kombination macht auf Windows die letzte Aktion rückgängig?", options: ["Strg + Z", "Strg + C", "Strg + X", "Alt + F4"], correct: 0, explanation: "Strg + Z (bzw. Cmd + Z am Mac) steht fast überall für ‚Rückgängig‘ (Undo)." },

    // 12. Sport & Olympisches
    { category: "sport", question: "Wie lang ist ein olympischer Marathonlauf exakt?", options: ["42,195 km", "40,000 km", "45,500 km", "50,000 km"], correct: 0, explanation: "Die Marathondistanz beträgt seit 1921 offiziell 42,195 Kilometer." },
    { category: "sport", question: "Wie viele Spieler stehen beim Fußball pro Mannschaft regulär auf dem Feld?", options: ["11 Spieler", "9 Spieler", "10 Spieler", "12 Spieler"], correct: 0, explanation: "Eine Fußballmannschaft besteht auf dem Platz aus zehn Feldspielern und einem Torwart." },
    { category: "sport", question: "Welche Farben haben die fünf olympischen Ringe (neben Blau, Gelb, Schwarz und Grün)?", options: ["Rot", "Weiß", "Orange", "Violett"], correct: 0, explanation: "Die fünf Ringe sind Blau, Gelb, Schwarz, Grün und Rot auf weißem Grund." },

    // 13. Literatur & Sprache
    { category: "literatur", question: "Wer schrieb das berühmte Drama ‚Faust‘?", options: ["Johann Wolfgang von Goethe", "Friedrich Schiller", "Heinrich Heine", "Bertolt Brecht"], correct: 0, explanation: "Goethes ‚Faust‘ (Teil I erschien 1808) zählt zu den bedeutendsten Werken der deutschen Literatur." },
    { category: "literatur", question: "Wie lautet der Fachbegriff für ein Wort, das vorwärts und rückwärts gleich gelesen wird (z. B. ‚Otto‘)?", options: ["Palindrom", "Anagramm", "Synonym", "Oxymoron"], correct: 0, explanation: "Ein Palindrom (wie ‚Reliefpfeiler‘ oder ‚Lagerregal‘) liest sich in beide Richtungen identisch." },
    { category: "literatur", question: "Wie viele Buchstaben hat das deutsche Standard-Alphabet (ohne Umlaute und ß)?", options: ["26", "24", "28", "30"], correct: 0, explanation: "Das lateinische Grundalphabet umfasst 26 Buchstaben von A bis Z." },

    // 14. Musik & Kunst
    { category: "musik", question: "Wie viele Saiten hat eine klassische Konzertgitarre standardmäßig?", options: ["6 Saiten", "4 Saiten", "5 Saiten", "8 Saiten"], correct: 0, explanation: "Die klassische Gitarre besitzt sechs Saiten in der Standardstimmung E-A-d-g-h-e'." },
    { category: "musik", question: "Wer malte die ‚Mona Lisa‘?", options: ["Leonardo da Vinci", "Michelangelo", "Vincent van Gogh", "Pablo Picasso"], correct: 0, explanation: "Leonardo da Vinci malte das Porträt Anfang des 16. Jahrhunderts; es hängt heute im Louvre in Paris." },
    { category: "musik", question: "Welcher Komponist schuf die ‚Neunte Symphonie‘ mit der ‚Ode an die Freude‘?", options: ["Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Johann Sebastian Bach", "Franz Schubert"], correct: 0, explanation: "Beethoven vollendete die 9. Symphonie im Jahr 1824 – ihre Melodie ist heute auch die Europahymne." },

    // 15. Film & Serien
    { category: "film", question: "Wie heißt der fiktive Archäologe, der von Harrison Ford gespielt wird?", options: ["Indiana Jones", "James Bond", "Jack Sparrow", "Luke Skywalker"], correct: 0, explanation: "Dr. Henry ‚Indiana‘ Jones Jr. ist die berühmte Abenteuerfigur von George Lucas und Steven Spielberg." },
    { category: "film", question: "Wie heißt die goldene Film-Trophäe, die jährlich in Hollywood verliehen wird?", options: ["Oscar (Academy Award)", "Goldener Bär", "Emmy", "Grammy"], correct: 0, explanation: "Die Academy Awards werden weltweit unter dem Spitznamen ‚Oscar‘ vergeben." },
    { category: "film", question: "Welcher Filmklassiker spielt auf dem Schiff ‚Orca‘ bei der Jagd auf einen Weißen Hai?", options: ["Der weiße Hai (Jaws)", "Moby Dick", "Das Boot", "Titanic"], correct: 0, explanation: "Steven Spielbergs ‚Der weiße Hai‘ (1975) gilt als erster großer Sommer-Blockbuster." },

    // 16. Wirtschaft & Recht
    { category: "wirtschaft", question: "Wie hoch ist der reguläre Mehrwertsteuersatz in Deutschland?", options: ["19 %", "16 %", "21 %", "7 %"], correct: 0, explanation: "Der Regelsteuersatz beträgt 19 %, der ermäßigte Satz (z. B. für viele Lebensmittel und Bücher) 7 %." },
    { category: "wirtschaft", question: "Welche Währung gilt in der Schweiz?", options: ["Schweizer Franken (CHF)", "Euro (EUR)", "Schilling", "Krone"], correct: 0, explanation: "Die Schweiz nutzt den Schweizer Franken (CHF), unterteilt in 100 Rappen." },
    { category: "wirtschaft", question: "Was bedeutet die Abkürzung ‚AGB‘ bei Verträgen und Online-Käufen?", options: ["Allgemeine Geschäftsbedingungen", "Amtliche Gebührenbestimmung", "Arbeitsgesetzbuch", "Aktiengesellschafts-Bund"], correct: 0, explanation: "AGB sind vorformulierte Vertragsbedingungen für eine Vielzahl von Verträgen." },

    // 17. Essen & Trinken
    { category: "essen", question: "Aus welcher Pflanze wird klassischerweise Marzipan hauptsächlich hergestellt?", options: ["Mandeln (und Zucker)", "Haselnüsse", "Walnüsse", "Pistazien"], correct: 0, explanation: "Echtes Marzipan besteht aus gemahlenen blanchierten Mandeln und Zucker." },
    { category: "essen", question: "Bei welcher Kerntemperatur gilt heißgeräucherter Fisch laut BfR als sicher durchgegart?", options: ["Mindestens 70 °C", "Maximal 35 °C", "Genau 15 °C", "50 °C reichen immer"], correct: 0, explanation: "Mindestens 70 °C Kerntemperatur töten Keime und mögliche Parasiten zuverlässig ab." },
    { category: "essen", question: "Welches Land gilt als Ursprungsland der Pizza Margherita?", options: ["Italien (Neapel)", "Spanien", "Griechenland", "Frankreich"], correct: 0, explanation: "Die Pizza Margherita entstand im 19. Jahrhundert in Neapel mit Tomate, Mozzarella und Basilikum." },

    // 18. Handwerk & Alltag
    { category: "handwerk", question: "Welches Messwerkzeug misst Außen-, Innen- und Tiefenmaße auf Zehntelmillimeter genau?", options: ["Messschieber (Schieblehre)", "Zollstock", "Wasserwaage", "Senklot"], correct: 0, explanation: "Der Messschieber besitzt Außenschnäbel, Innenschnäbel und ein Tiefenmaß mit Nonius oder Digitalanzeige." },
    { category: "handwerk", question: "Wozu dient ein FI-Schutzschalter (RCD) in der Hauselektrik?", options: ["Er schaltet bei Fehlerströmen blitzschnell ab und schützt vor tödlichen Stromschlägen", "Er erhöht die Spannung auf 400 Volt", "Er misst nur den Stromverbrauch", "Er ersetzt alle Lichtschalter"], correct: 0, explanation: "Ein Fehlerstrom-Schutzschalter erkennt kleinste Ableitströme (z. B. über den Körper) und trennt innerhalb von Millisekunden." },
    { category: "handwerk", question: "In welche Richtung dreht man eine normale Rechtsgewinde-Schraube zum Festziehen?", options: ["Im Uhrzeigersinn (nach rechts)", "Gegen den Uhrzeigersinn (nach links)", "Beide Richtungen ziehen fest", "Nur durch Klopfen"], correct: 0, explanation: "Merksatz: ‚Solang das deutsche Reich besteht, wird jede Schraube rechts gedreht‘ (Rechtsgewinde)." },

    // 19. Verkehr & Boote
    { category: "verkehr", question: "Wie viel km/h entspricht genau 1 Knoten (Seemeile pro Stunde) auf dem Wasser?", options: ["1,852 km/h", "1,000 km/h", "2,500 km/h", "3,600 km/h"], correct: 0, explanation: "Eine Seemeile misst 1.852 Meter – 1 Knoten entspricht also 1,852 km/h." },
    { category: "verkehr", question: "Welche Seite eines Bootes heißt in Fahrtrichtung gesehen ‚Steuerbord‘?", options: ["Rechts", "Links", "Vorne", "Hinten"], correct: 0, explanation: "Steuerbord ist rechts (grünes Positionslicht), Backbord ist links (rotes Positionslicht)." },
    { category: "verkehr", question: "Welche Farben haben die Positionslichter eines Motorbootes an Backbord und Steuerbord?", options: ["Backbord rot, Steuerbord grün", "Backbord grün, Steuerbord rot", "Beide Seiten blau", "Beide Seiten gelb"], correct: 0, explanation: "Links (Backbord) leuchtet Rot, rechts (Steuerbord) leuchtet Grün – so erkennt man nachts die Fahrtrichtung." },

    // 20. Rekorde & Kurioses
    { category: "kurioses", question: "Welches Tier hat im Verhältnis zu seiner Körpergröße das größte Auge im Tierreich (oder absolut das größte)?", options: ["Der Riesenkalmar (bis 27 cm Augendurchmesser)", "Der Blauwal", "Der Afrikanische Elefant", "Der Adler"], correct: 0, explanation: "Riesen- und Koloss-Kalmare besitzen mit bis zu 27 cm Durchmesser die größten Augen aller bekannten Tiere." },
    { category: "kurioses", question: "Welches ist das einzige Säugetier, das aktiv fliegen kann?", options: ["Die Fledermaus (Fledertiere)", "Das Flughörnchen", "Der Strauß", "Der Pinguin"], correct: 0, explanation: "Flughörnchen können nur gleiten – echte aktive Flieger unter den Säugetieren sind nur Fledermäuse und Flughunde." },
    { category: "kurioses", question: "Wie viele Herzen besitzt ein Oktopus (Krake)?", options: ["3 Herzen", "1 Herz", "2 Herzen", "5 Herzen"], correct: 0, explanation: "Ein Oktopus hat zwei Kiemenherzen für die Atmung und ein Hauptherz für den Körperkreislauf." }
  ];

  return { QUIZ_CATEGORIES, DEFAULT_MEMBERS, QUESTIONS };
})();
