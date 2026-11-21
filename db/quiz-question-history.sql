-- Dauerhafte, gemeinsame Fragenhistorie für Wissensquiz, Duelle und Revanchen.
begin;

create table if not exists treff_private.quiz_question_history (
  member_id uuid not null references public.treff_members(id) on delete cascade,
  concept_id text not null check (concept_id ~ '^[a-z0-9][a-z0-9._-]{2,159}$'),
  question_id text not null check (question_id ~ '^[a-z0-9][a-z0-9._-]{2,159}$'),
  shown_at timestamptz not null default clock_timestamp(),
  source text not null check (source in ('duel', 'rematch', 'solo', 'legacy')),
  round_id uuid,
  primary key (member_id, concept_id)
);
alter table treff_private.quiz_question_history enable row level security;
revoke all on treff_private.quiz_question_history from public, anon, authenticated;
create index if not exists quiz_question_history_member_seen
  on treff_private.quiz_question_history(member_id, shown_at desc);

-- Bereits gezeigte Fragen bleiben dauerhaft gesperrt. Neue Runden werden erst
-- nach der Reservierung mit der aktuellen Fragenbank befüllt.
alter table treff_private.live_quiz add column if not exists questions_reserved boolean not null default false;
update treff_private.live_quiz set questions_reserved = true where questions_reserved = false and created_at < clock_timestamp() - interval '5 minutes';

insert into treff_private.quiz_question_history(member_id, concept_id, question_id, source, round_id)
select participant.member_id,
  'legacy-' || md5(lower(regexp_replace(coalesce(item.value->>'text',''), '[^[:alnum:]]', '', 'g'))),
  'legacy-' || md5(lower(regexp_replace(coalesce(item.value->>'text',''), '[^[:alnum:]]', '', 'g'))),
  'legacy', game.id
from treff_private.live_quiz game
cross join lateral (values (game.host), (game.guest)) participant(member_id)
cross join lateral jsonb_array_elements(game.questions) item(value)
where participant.member_id is not null and coalesce(item.value->>'text','') <> ''
on conflict (member_id, concept_id) do nothing;

create or replace function treff_private.reserve_quiz_questions(
  players uuid[], question_bank jsonb, wanted integer, use_source text, use_round uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare chosen jsonb;
begin
  if wanted < 1 or wanted > 10 or coalesce(array_length(players, 1), 0) < 1 then
    raise exception 'Ungültige Fragenreservierung.';
  end if;
  if exists (
    select 1 from unnest(players) candidate(member_id)
    left join public.treff_members m on m.id = candidate.member_id and m.active
    where m.id is null
  ) then
    raise exception 'Aktive Mitgliedschaft erforderlich.' using errcode = '42501';
  end if;
  -- Gleiche Spieler werden in derselben Reihenfolge gesperrt: parallele Starts
  -- können deshalb keine Frage doppelt reservieren.
  perform pg_advisory_xact_lock(hashtextextended('sterni-question:' || id::text, 0))
  from (select distinct unnest(players) id order by id) locks;

  with supplied as (
    select value,
      value->>'id' as question_id,
      coalesce(value->>'concept_id', value->>'id') as concept_id,
      value->>'category' as category
    from jsonb_array_elements(question_bank) value
  ), valid as (
    select distinct on (concept_id) * from supplied
    where question_id ~ '^[a-z0-9][a-z0-9._-]{2,159}$'
      and concept_id ~ '^[a-z0-9][a-z0-9._-]{2,159}$'
      and jsonb_typeof(value->'options') = 'array'
      and jsonb_array_length(value->'options') = 4
    order by concept_id, question_id
  ), available as (
    select v.* from valid v
    where not exists (
      select 1 from treff_private.quiz_question_history h
      where h.member_id = any(players) and h.concept_id = v.concept_id
    )
  ), per_category as (
    select distinct on (category) * from available
    order by category, random()
  ), selected as (
    select * from per_category order by random() limit wanted
  )
  select jsonb_agg(value) into chosen from selected;

  if coalesce(jsonb_array_length(chosen), 0) < wanted then
    raise exception 'Nicht genügend neue Fragen verfügbar. Bitte ergänze den Fragenpool; alte Fragen werden nicht wiederholt.';
  end if;

  insert into treff_private.quiz_question_history(member_id, concept_id, question_id, source, round_id)
  select player, picked.value->>'concept_id', picked.value->>'id', use_source, use_round
  from unnest(players) player
  cross join lateral jsonb_array_elements(chosen) picked(value);
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
      case when game.rematch_id is not null then 'rematch' else 'duel' end, game.id);
    update treff_private.live_quiz set questions = selected, questions_reserved = true where id = game.id;
    return jsonb_build_object('prepared', true, 'questions', selected);
  end if;
  return jsonb_build_object('prepared', false, 'questions', game.questions);
end;
$$;

-- Direkte Herausforderungen werden erst nach Annahme reserviert, damit die
-- Historie beider Teilnehmer gemeinsam geprüft werden kann.
create or replace function public.sterni_quiz_accept(duel_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); invitation treff_private.quiz_duels%rowtype;
begin
  select q.* into invitation from treff_private.quiz_duels q
  where q.id = duel_id and q.opponent = me and q.declined_at is null and q.ended_at is null
    and q.created_at >= now() - interval '7 days' and q.challenger_score is null and q.opponent_score is null
    and exists (select 1 from public.treff_members where id = me and active)
    and exists (select 1 from public.treff_members where id = q.challenger and active)
  for update;
  if not found then raise exception 'Diese Einladung ist nicht verfügbar.' using errcode = '42501'; end if;
  insert into treff_private.live_quiz(id, host, guest, questions, guest_seen, questions_reserved)
  values (duel_id, invitation.challenger, me, '[]'::jsonb, now(), false)
  on conflict (id) do nothing;
  update treff_private.quiz_duels set accepted_at = coalesce(accepted_at, now()) where id = duel_id;
end;
$$;

revoke all on function treff_private.reserve_quiz_questions(uuid[], jsonb, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.sterni_quiz_prepare_questions(uuid, jsonb) from public, anon;
grant execute on function public.sterni_quiz_prepare_questions(uuid, jsonb) to authenticated;
revoke all on function public.sterni_quiz_accept(uuid) from public, anon;
grant execute on function public.sterni_quiz_accept(uuid) to authenticated;
commit;
