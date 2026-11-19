# Sterni-APP

## Live-Duell im Wissensquiz

Zwei aktive Anglertreff-Mitglieder spielen fünf gemeinsame Fragen. Der Gastgeber teilt den Link oder den achtstelligen Code. Nach jeder Frage sehen beide die richtige Antwort, sobald beide ihre Antwort abgegeben haben. Beide bestätigen den Wechsel zur nächsten Frage und können nach dem Ergebnis einer Revanche zustimmen.

Vor der Veröffentlichung der Webdateien in der vorgesehenen Supabase-Umgebung die Migration [db/live-quiz.sql](db/live-quiz.sql) ausführen. Sie setzt das bestehende Anglertreff-Schema mit `public.treff_members` und `treff_private` voraus. Sie legt eigene Tabellen und Funktionen für das Live-Duell an. Die bisherige Rangliste bleibt über „Bisherige Duelle und Rangliste“ erreichbar.

Für die Abnahme zwei getrennte Browsersitzungen mit zwei aktiven Mitgliedern verwenden. Einladung per Link und Code prüfen, fünf Fragen beantworten, das Ergebnis vergleichen und die Revanche starten. Zusätzlich einmal während einer Frage neu laden, die Verbindung kurz trennen und ein Duell ausdrücklich verlassen.
