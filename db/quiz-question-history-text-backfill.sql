-- Nach quiz-question-history.sql einmalig ausführen, wenn die erste Fassung
-- bereits produktiv installiert wurde.
begin;
alter table treff_private.quiz_question_history
  add column if not exists question_text text not null default '';
update treff_private.quiz_question_history history
set question_text = lower(coalesce(item.value->>'text',''))
from treff_private.live_quiz game
cross join lateral jsonb_array_elements(game.questions) item(value)
where history.source = 'legacy'
  and history.round_id = game.id
  and history.question_text like 'legacy-%';

update treff_private.live_quiz
set questions_reserved = true
where questions_reserved = false and jsonb_array_length(questions) > 0;

create or replace function treff_private.reserve_quiz_questions(
  players uuid[], question_bank jsonb, wanted integer, use_source text, use_round uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare chosen jsonb;
begin
  if wanted < 1 or wanted > 10 or coalesce(array_length(players, 1), 0) < 1 then raise exception 'Ungültige Fragenreservierung.'; end if;
  if exists (select 1 from unnest(players) candidate(member_id) left join public.treff_members m on m.id = candidate.member_id and m.active where m.id is null) then raise exception 'Aktive Mitgliedschaft erforderlich.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('sterni-question:' || id::text, 0)) from (select distinct unnest(players) id order by id) locks;
  with supplied as (select value, value->>'id' as question_id, coalesce(value->>'concept_id', value->>'id') as concept_id, value->>'category' as category from jsonb_array_elements(question_bank) value), valid as (select distinct on (concept_id) * from supplied where question_id ~ '^[a-z0-9][a-z0-9._-]{2,159}$' and concept_id ~ '^[a-z0-9][a-z0-9._-]{2,159}$' and jsonb_typeof(value->'options') = 'array' and jsonb_array_length(value->'options') = 4 order by concept_id, question_id), available as (select v.* from valid v where not exists (select 1 from treff_private.quiz_question_history h where h.member_id = any(players) and (h.concept_id = v.concept_id or h.question_text = lower(coalesce(v.value->>'text',''))))), per_category as (select distinct on (category) * from available order by category, random()), selected as (select * from per_category order by random() limit wanted) select jsonb_agg(value) into chosen from selected;
  if coalesce(jsonb_array_length(chosen), 0) < wanted then raise exception 'Nicht genügend neue Fragen verfügbar. Bitte ergänze den Fragenpool; alte Fragen werden nicht wiederholt.'; end if;
  insert into treff_private.quiz_question_history(member_id, concept_id, question_id, question_text, source, round_id) select player, picked.value->>'concept_id', picked.value->>'id', lower(coalesce(picked.value->>'text','')), use_source, use_round from unnest(players) player cross join lateral jsonb_array_elements(chosen) picked(value);
  return chosen;
end;
$$;

create or replace function public.sterni_quiz_prepare_questions(duel_id uuid, question_bank jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); game treff_private.live_quiz%rowtype; selected jsonb;
begin
  select * into game from treff_private.live_quiz where id = duel_id for update;
  if not found or me is distinct from game.host and me is distinct from game.guest or game.guest is null then
    raise exception 'Dieses Duell ist für dich nicht verfügbar.' using errcode = '42501';
  end if;
  if not game.questions_reserved then
    selected := treff_private.reserve_quiz_questions(array[game.host, game.guest], question_bank, 5,
      case when exists (select 1 from treff_private.live_quiz prior where prior.rematch_id = game.id)
        then 'rematch' else 'duel' end, game.id);
    update treff_private.live_quiz set questions = selected, questions_reserved = true where id = game.id;
    return jsonb_build_object('prepared', true, 'questions', selected);
  end if;
  return jsonb_build_object('prepared', false, 'questions', game.questions);
end;
$$;
commit;
