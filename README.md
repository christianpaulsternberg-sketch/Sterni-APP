# Sterni-APP

## Live-Duell im Wissensquiz

Zwei aktive Anglertreff-Mitglieder spielen fünf gemeinsame Fragen. Der Gastgeber fordert ein angezeigtes Online-Mitglied heraus oder teilt den Link oder achtstelligen Code. Bei einer direkten Herausforderung erscheint im geöffneten Browser ein Dialog. Nach der Annahme greifen beide Spieler auf denselben Spielstand zu. Nach jeder Frage sehen beide die richtige Antwort, sobald beide ihre Antwort abgegeben haben. Beide bestätigen den Wechsel zur nächsten Frage und können nach dem Ergebnis einer Revanche zustimmen.

Vor der Veröffentlichung der Webdateien in der vorgesehenen Supabase-Umgebung die Migration [db/live-quiz.sql](db/live-quiz.sql) ausführen. Sie setzt das bestehende Anglertreff-Schema mit `public.treff_members` und `treff_private` voraus. Sie legt eigene Tabellen und Funktionen für das Live-Duell an. Die bisherige Rangliste bleibt über „Bisherige Duelle und Rangliste“ erreichbar.

Für direkte Herausforderungen nach den bisherigen Quiz-Migrationen zusätzlich [db/live-quiz-challenges.sql](db/live-quiz-challenges.sql) ausführen. Bei einem bestehenden Anglertreff zuerst prüfen, ob `db/live-quiz.sql` bereits ausgeführt wurde. Beide Migrationen müssen vor dem Update der Webdateien angewendet sein.

Für die Abnahme zwei getrennte Browsersitzungen mit zwei aktiven Mitgliedern verwenden. Einladung per Link und Code prüfen, fünf Fragen beantworten, das Ergebnis vergleichen und die Revanche starten. Zusätzlich einmal während einer Frage neu laden, die Verbindung kurz trennen und ein Duell ausdrücklich verlassen.
