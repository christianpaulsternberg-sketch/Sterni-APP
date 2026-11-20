-- Nach quiz-duel-lifecycle.sql ausführen. Keine Tabellen, Duelle oder
-- Mitgliedsdaten werden gelöscht.
begin;

-- Der bisherige Parameterlos-Aufruf blieb in bereits installierten Projekten
-- auf der alten Angel-Fragenbank stehen. Alle neuen Duelle verwenden nun
-- zwingend die gemischte Auswahl der aktuellen Funktion.
create or replace function treff_private.live_quiz_questions() returns jsonb
language sql volatile set search_path = '' as $$
  select treff_private.live_quiz_questions('[]'::jsonb);
$$;
revoke all on function treff_private.live_quiz_questions() from public, anon, authenticated;

-- Vollständig beantwortete Live-Duelle, deren Punkte eine ältere Funktion
-- nicht übertragen hat, werden einmalig rekonstruiert. COALESCE schützt
-- bereits korrekt gespeicherte Ergebnisse und verhindert Doppelwertungen.
update treff_private.quiz_duels q set
  accepted_at = coalesce(q.accepted_at, l.created_at),
  challenger_score = coalesce(q.challenger_score, scores.host_score),
  opponent_score = coalesce(q.opponent_score, scores.guest_score)
from treff_private.live_quiz l
cross join lateral (
  select
    count(*) filter (where l.host_answers[i] = (l.questions -> (i - 1) ->> 'correct')::integer)::integer * 10 as host_score,
    count(*) filter (where l.guest_answers[i] = (l.questions -> (i - 1) ->> 'correct')::integer)::integer * 10 as guest_score
  from generate_series(1, 5) as index(i)
) scores
where q.id = l.id
  and l.round >= 6
  and cardinality(l.host_answers) >= 5
  and cardinality(l.guest_answers) >= 5
  and (q.challenger_score is null or q.opponent_score is null);

commit;
