begin;

create table if not exists treff_private.live_quiz (
  id uuid primary key,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  host uuid not null references public.treff_members(id) on delete cascade,
  guest uuid references public.treff_members(id) on delete cascade,
  questions jsonb not null,
  round integer not null default 1,
  host_answers integer[] not null default '{}',
  guest_answers integer[] not null default '{}',
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  host_seen timestamptz not null default now(),
  guest_seen timestamptz,
  created_at timestamptz not null default now(),
  left_by uuid,
  rematch_id uuid references treff_private.live_quiz(id) on delete set null,
  check (host <> guest)
);

alter table treff_private.live_quiz enable row level security;
revoke all on treff_private.live_quiz from public, anon, authenticated;
create index if not exists live_quiz_host_created on treff_private.live_quiz(host, created_at desc);

create or replace function treff_private.live_quiz_questions() returns jsonb
language sql volatile set search_path = '' as $$
  select jsonb_agg(
    jsonb_build_object('text', question, 'options', options, 'correct', correct)
    order by random()
  )
  from (
    select * from (values
      ('Wie viele Barteln hat der Europäische Wels?', array['Zwei', 'Sechs', 'Vier', 'Keine'], 2),
      ('Welcher Knoten eignet sich zum Verbinden von Geflecht und dickerem Fluorocarbon?', array['Arborknoten', 'Einfacher Überhandknoten', 'Albrightknoten', 'Springerschlaufe'], 3),
      ('Welches Merkmal hilft, einen Zander vom Flussbarsch zu unterscheiden?', array['Lange Fangzähne im Maul', 'Zwei Barteln', 'Eine einzige Rückenflosse', 'Schuppenlose Haut'], 1),
      ('Was macht eine Pose beim Angeln sichtbar?', array['Die Wassertemperatur', 'Einen Biss am Köder', 'Die Windrichtung', 'Den Sauerstoffgehalt'], 2),
      ('Wozu dient ein Kescher beim Angeln?', array['Zum Abmessen der Schnur', 'Zum Auswerfen', 'Zum Festmachen des Bootes', 'Zum Landen des Fisches'], 4),
      ('Welcher Verschluss erlaubt den schnellen Wechsel eines Kunstköders?', array['Ein Einhänger (Snap)', 'Ein Stopperknoten', 'Ein Schrotblei', 'Ein Klemmblei'], 1),
      ('Wie heißt die Schnur zwischen Hauptschnur und Haken?', array['Backing', 'Rutenspitze', 'Vorfach', 'Spule'], 3),
      ('Wie heißt die Bremse, die bei Zug Schnur von der Rolle freigibt?', array['Rücklaufsperre', 'Spulenbremse', 'Schnurclip', 'Rollenbügel'], 2)
    ) as bank(question, options, correct)
    order by random()
    limit 5
  ) as selected;
$$;

revoke all on function treff_private.live_quiz_questions() from public, anon, authenticated;

create or replace function public.sterni_live_quiz(
  action text, target_id uuid default null, invite_code text default null,
  question_number integer default null, answer integer default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  game treff_private.live_quiz%rowtype;
  own_name text;
  other_name text;
  is_host boolean;
  own_answers integer[];
  other_answers integer[];
  current_question jsonb;
  correct integer;
  own_score integer;
  other_score integer;
  revealed boolean;
  opponent_seen timestamptz;
begin
  select display_name into own_name from public.treff_members where id = me and active;
  if not found then raise exception 'Aktive Mitgliedschaft im Anglertreff erforderlich.' using errcode = '42501'; end if;

  if action = 'create' then
    if target_id is null then raise exception 'Das Duell konnte nicht angelegt werden.'; end if;
    perform pg_advisory_xact_lock(hashtextextended('sterni-live-quiz:' || me::text, 0));
    if not exists (select 1 from treff_private.live_quiz where id = target_id and host = me) then
      if (select count(*) from treff_private.live_quiz where host = me and created_at > now() - interval '1 minute') >= 5 then
        raise exception 'Bitte warte kurz, bevor du ein neues Duell startest.';
      end if;
      loop
        begin
          insert into treff_private.live_quiz(id, host, questions)
          values (target_id, me, treff_private.live_quiz_questions())
          on conflict (id) do nothing;
          exit;
        exception when unique_violation then
          -- Bei einem bereits vergebenen Einladungscode erneut auslosen.
        end;
      end loop;
    end if;
  end if;

  if action = 'join' then
    select * into game from treff_private.live_quiz
      where code = upper(btrim(invite_code)) for update;
    if not found then raise exception 'Dieser Duellcode wurde nicht gefunden.'; end if;
    if me is distinct from game.host and me is distinct from game.guest then
      if game.left_by is not null or game.created_at < now() - interval '1 hour' then
        raise exception 'Diese Einladung ist abgelaufen.';
      end if;
      if game.guest is not null then raise exception 'Dieses Duell ist bereits besetzt.'; end if;
      if not exists (select 1 from public.treff_members where id = game.host and active) then
        raise exception 'Dieses Duell ist nicht mehr verfügbar.';
      end if;
      game.guest := me;
    end if;
  else
    select * into game from treff_private.live_quiz where id = target_id for update;
    if not found or (me is distinct from game.host and me is distinct from game.guest) then
      raise exception 'Dieses Duell ist für dich nicht verfügbar.';
    end if;
  end if;

  is_host := game.host = me;
  if is_host then game.host_seen := now(); else game.guest_seen := now(); end if;
  if game.left_by is null and game.round = 1 and game.guest is null
     and game.created_at < now() - interval '1 hour' then
    game.left_by := game.host;
  end if;
  if game.left_by is null then
    case action
      when 'leave' then
        game.left_by := me;
      when 'answer' then
        if game.guest is not null and game.round = question_number and game.round <= 5
           and answer between 1 and 4 then
          if is_host and cardinality(game.host_answers) = game.round - 1 then
            game.host_answers := array_append(game.host_answers, answer);
          elsif not is_host and cardinality(game.guest_answers) = game.round - 1 then
            game.guest_answers := array_append(game.guest_answers, answer);
          end if;
        end if;
      when 'next' then
        if game.round = question_number and game.round <= 5
           and game.host_answers[game.round] is not null and game.guest_answers[game.round] is not null then
          if is_host then game.host_ready := true; else game.guest_ready := true; end if;
          if game.host_ready and game.guest_ready then
            game.round := game.round + 1;
            game.host_ready := false;
            game.guest_ready := false;
          end if;
        end if;
      when 'rematch' then
        if game.round = 6 and game.rematch_id is null then
          if is_host then game.host_ready := true; else game.guest_ready := true; end if;
          if game.host_ready and game.guest_ready then
            insert into treff_private.live_quiz(id, host, guest, questions, guest_seen)
            values (gen_random_uuid(), game.host, game.guest, treff_private.live_quiz_questions(), now())
            returning id into game.rematch_id;
          end if;
        end if;
      else null;
    end case;
  end if;

  update treff_private.live_quiz set
    guest = game.guest, round = game.round, host_answers = game.host_answers, guest_answers = game.guest_answers,
    host_ready = game.host_ready, guest_ready = game.guest_ready, host_seen = game.host_seen,
    guest_seen = game.guest_seen, left_by = game.left_by, rematch_id = game.rematch_id
  where id = game.id;

  if is_host then
    own_answers := game.host_answers;
    other_answers := game.guest_answers;
    opponent_seen := game.guest_seen;
    select display_name into other_name from public.treff_members where id = game.guest;
  else
    own_answers := game.guest_answers;
    other_answers := game.host_answers;
    opponent_seen := game.host_seen;
    select display_name into other_name from public.treff_members where id = game.host;
  end if;

  current_question := (game.questions -> (game.round - 1));
  revealed := own_answers[game.round] is not null and other_answers[game.round] is not null;
  if revealed then correct := (current_question ->> 'correct')::integer; end if;
  select count(*) filter (where own_answers[i] = (game.questions -> (i - 1) ->> 'correct')::integer),
         count(*) filter (where other_answers[i] = (game.questions -> (i - 1) ->> 'correct')::integer)
    into own_score, other_score
    from generate_series(1, least(cardinality(own_answers), cardinality(other_answers))) as index(i);

  return jsonb_build_object(
    'id', game.id, 'code', game.code, 'me', own_name, 'opponent', other_name, 'round', game.round,
    'question', current_question - 'correct', 'answer', own_answers[game.round], 'correct', correct,
    'myScore', own_score, 'opponentScore', other_score,
    'ready', case when is_host then game.host_ready else game.guest_ready end,
    'left', case when game.left_by = me then 'self' when game.left_by is not null then 'opponent' end,
    'offline', coalesce(opponent_seen < now() - interval '25 seconds', false),
    'rematch', game.rematch_id
  );
end;
$$;

revoke all on function public.sterni_live_quiz(text, uuid, text, integer, integer) from public, anon;
grant execute on function public.sterni_live_quiz(text, uuid, text, integer, integer) to authenticated;

commit;
