# Sterni-APP

## Betrieb und Wiederherstellung

GitHub Pages stellt die Webdateien aus dem Sterni-APP-Repository bereit. Der Einstieg ist [Sterni-App](https://christianpaulsternberg-sketch.github.io/Sterni-APP/#start). Die öffentliche Supabase-Verbindungskonfiguration steht in `anglertreff-config.js`. Der Anglertreff verwendet zusätzlich das Supabase-Projekt für Anmeldung, Mitgliedschaften, Beiträge, Fotos und die Verwaltungsfunktion `anglertreff-admin`.

Die lokale Wiederherstellungssammlung unter `.lokale-sterni-sicherung/` enthält vorhandene Anglertreff-Schemadateien, die Verwaltungsfunktion und die lokale Serverkonfigurationsdokumentation. Der Ordner ist in diesem Checkout vom Git-Tracking ausgeschlossen. Cloud-Daten, Konten und Fotos benötigen eine separate Sicherung im Supabase-Projekt. Dienstschlüssel und Produktionsdaten gehören nicht ins öffentliche Repository.

## Live-Duell im Wissensquiz

Zwei aktive Anglertreff-Mitglieder spielen fünf gemeinsame Fragen. Der Gastgeber fordert ein angezeigtes Online-Mitglied heraus oder teilt den Link oder achtstelligen Code. Bei einer direkten Herausforderung erscheint im geöffneten Browser ein Dialog. Nach der Annahme greifen beide Spieler auf denselben Spielstand zu. Nach jeder Frage sehen beide die richtige Antwort, sobald beide ihre Antwort abgegeben haben. Beide bestätigen den Wechsel zur nächsten Frage und können nach dem Ergebnis einer Revanche zustimmen.

Vor der Veröffentlichung der Webdateien in der vorgesehenen Supabase-Umgebung die Migration [db/live-quiz.sql](db/live-quiz.sql) ausführen. Sie setzt das bestehende Anglertreff-Schema mit `public.treff_members` und `treff_private` voraus. Sie legt eigene Tabellen und Funktionen für das Live-Duell an. Die bisherige Rangliste bleibt über „Bisherige Duelle und Rangliste“ erreichbar.

Für direkte Herausforderungen nach den bisherigen Quiz-Migrationen zusätzlich [db/live-quiz-challenges.sql](db/live-quiz-challenges.sql) ausführen. Bei einem bestehenden Anglertreff zuerst prüfen, ob `db/live-quiz.sql` bereits ausgeführt wurde. Beide Migrationen müssen vor dem Update der Webdateien angewendet sein.

Für die Abnahme zwei getrennte Browsersitzungen mit zwei aktiven Mitgliedern verwenden. Einladung per Link und Code prüfen, fünf Fragen beantworten, das Ergebnis vergleichen und die Revanche starten. Zusätzlich einmal während einer Frage neu laden, die Verbindung kurz trennen und ein Duell ausdrücklich verlassen.

## Status direkter Online-Herausforderungen

In Supabase zuerst [db/quiz-duel-lifecycle.sql](db/quiz-duel-lifecycle.sql) auf das bestehende Anglertreff- und Quiz-Schema anwenden. Die Migration setzt [db/live-quiz-challenges.sql](db/live-quiz-challenges.sql) voraus und kann gefahrlos erneut ausgeführt werden: Sie ergänzt keine neue Tabelle, erhält vorhandene Duelle und ersetzt nur die zugehörigen Funktionen. Danach die Webdateien gemeinsam veröffentlichen und die Seite in beiden Spielersitzungen neu laden.

Die aktuelle Migration liefert pro Live-Duell fünf Fragen aus fünf verschiedenen Wissensgebieten (Angeln/Fischkunde, Umwelt, Natur, Wissenschaft/Technik, Geografie/Geschichte und Allgemeinwissen). Eine Revanche schließt die Fragen der vorherigen Runde aus. Sobald beide Spieler die fünfte Frage bestätigen, werden beide Punktzahlen einmalig im vorhandenen Duelldatensatz gespeichert. Die Ansicht „Bisherige Duelle und Rangliste“ zeigt bis zu 100 eigene Duelle einschließlich Zeit, Spielern, Punkten und Status sowie die automatisch berechnete Rangliste. Bereits gespeicherte abgeschlossene Duelle werden dabei ebenfalls einbezogen.

Der Browser fragt den Status alle zwei Sekunden ab, solange die App sichtbar ist. Die serverseitige Anwesenheit gilt pro Tab. Eine empfangene Abmeldung beim Schließen erlaubt fünf Sekunden für einen Seitenwechsel. Bei fehlender Abmeldung greift der Timeout 35 Sekunden nach dem letzten gespeicherten Lebenszeichen. Unbeantwortete Einladungen laufen nach zwei Minuten ab. Supabase prüft die Fristen beim nächsten beteiligten Statusabruf oder Spielzug. Eine Rückkehr vor Ablauf hält das Duell offen. Eine Rückkehr nach Ablauf ermöglicht eine neue Einladung. Der bestehende Schutz gegen mehr als drei Einladungen pro Minute bleibt bestehen.

Lokal führt `node tests/quiz-lifecycle.cjs /pfad/zu/pglite/dist/index.cjs` die SQL-Migrationen in einer separaten PostgreSQL-Instanz aus. Der Test spielt ein Duell mit zwei getrennten Identitäten vollständig durch und prüft gemischte, eindeutige Fragen, eine überschneidungsfreie Revanche, Ergebnis-/Ranglistenspeicherung, Ablehnung, Browserabgang, kurzen und längeren Verbindungsverlust, Ablauf und erneute Herausforderungen.
