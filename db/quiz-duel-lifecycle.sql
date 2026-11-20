-- Nach live-quiz-challenges.sql und vor den zugehörigen Webdateien anwenden.
begin;

alter table treff_private.quiz_duels
  add column if not exists declined_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by uuid,
  add column if not exists end_reason text;

create table if not exists treff_private.quiz_sessions (
  member_id uuid not null references public.treff_members(id) on delete cascade,
  id uuid not null,
  seen_at timestamptz not null,
  available_until timestamptz not null,
  left_at timestamptz,
  primary key (member_id, id)
);
alter table treff_private.quiz_sessions enable row level security;
revoke all on treff_private.quiz_sessions from public, anon, authenticated;
create index if not exists quiz_sessions_member_expiry
  on treff_private.quiz_sessions(member_id, available_until desc);

-- Auch bei einer bereits installierten App steht die neue, gemischte
-- Fragenbank nach dem erneuten Ausführen dieser Migration bereit.
create or replace function treff_private.live_quiz_questions(excluded jsonb) returns jsonb
language sql volatile set search_path = '' as $$
  with bank(category, question, options, correct) as (values
    ('angeln', 'Wie viele Barteln hat der Europäische Wels?', array['Zwei', 'Sechs', 'Vier', 'Keine'], 2),
    ('angeln', 'Welches Merkmal unterscheidet den Zander vom Flussbarsch?', array['Lange Fangzähne im Maul', 'Zwei Barteln', 'Schuppenlose Haut', 'Eine Rückenflosse'], 1),
    ('angeln', 'Wozu dient ein Kescher beim Angeln?', array['Zum Auswerfen', 'Zum Landen eines Fisches', 'Zum Messen der Schnur', 'Zum Festmachen des Boots'], 2),
    ('umwelt', 'Welches Gas trägt am stärksten zum menschengemachten Treibhauseffekt bei?', array['Sauerstoff', 'Stickstoff', 'Kohlendioxid', 'Helium'], 3),
    ('umwelt', 'Was gehört in Deutschland in die Biotonne?', array['Glasflaschen', 'Küchen- und Gartenabfälle', 'Batterien', 'Verpackungsfolie'], 2),
    ('umwelt', 'Warum sind Moore für den Klimaschutz wichtig?', array['Sie speichern viel Kohlenstoff', 'Sie erzeugen Strom', 'Sie filtern Meerwasser', 'Sie verhindern Wind'], 1),
    ('natur', 'Welches Säugetier kann als einziges aktiv fliegen?', array['Eichhörnchen', 'Fledermaus', 'Pinguin', 'Igel'], 2),
    ('natur', 'Wie nennt man die Verwandlung einer Raupe zum Schmetterling?', array['Metamorphose', 'Photosynthese', 'Migration', 'Symbiose'], 1),
    ('natur', 'Welcher Baum trägt Eicheln?', array['Buche', 'Kiefer', 'Eiche', 'Birke'], 3),
    ('wissenschaft', 'Welche Einheit misst elektrische Spannung?', array['Watt', 'Volt', 'Ohm', 'Ampere'], 2),
    ('wissenschaft', 'Was ist die kleinste Einheit eines chemischen Elements?', array['Zelle', 'Atom', 'Molekül', 'Proton'], 2),
    ('wissenschaft', 'Welche Energiequelle nutzt eine Solarzelle?', array['Wind', 'Sonnenlicht', 'Erdwärme', 'Wasserströmung'], 2),
    ('geographie', 'Welcher Fluss fließt durch Berlin?', array['Elbe', 'Oder', 'Spree', 'Rhein'], 3),
    ('geographie', 'Auf welchem Kontinent liegt Ägypten überwiegend?', array['Europa', 'Afrika', 'Asien', 'Südamerika'], 2),
    ('geschichte', 'In welchem Jahr fiel die Berliner Mauer?', array['1979', '1989', '1999', '2009'], 2),
    ('geschichte', 'Wie hieß die erste deutsche Demokratie ab 1919?', array['Weimarer Republik', 'Deutscher Bund', 'Kaiserreich', 'DDR'], 1),
    ('allgemein', 'Wie viele Minuten hat eine Stunde?', array['50', '60', '80', '100'], 2),
    ('allgemein', 'Welche Farbe entsteht aus Blau und Gelb?', array['Grün', 'Violett', 'Orange', 'Rot'], 1),
    ('allgemein', 'Wie viele Seiten hat ein Würfel?', array['Vier', 'Fünf', 'Sechs', 'Acht'], 3)
  ), available as (
    select b.* from bank b where not exists (
      select 1 from jsonb_array_elements(coalesce(excluded, '[]'::jsonb)) old
      where old ->> 'text' = b.question
    )
  ), per_category as (
    select distinct on (category) * from available order by category, random()
  ), selected as (
    select * from per_category order by random() limit 5
  )
  select jsonb_agg(jsonb_build_object('category', category, 'text', question,
    'options', options, 'correct', correct)) from selected;
$$;

revoke all on function treff_private.live_quiz_questions(jsonb) from public, anon, authenticated;

create or replace function treff_private.quiz_available(player uuid) returns boolean
language sql volatile set search_path = '' as $$
  select exists (
    select 1 from treff_private.quiz_sessions s
    join public.treff_members m on m.id = s.member_id and m.active
    where s.member_id = player and s.available_until > clock_timestamp()
  );
$$;

create or replace function treff_private.refresh_quiz_duels(player uuid) returns void
language plpgsql set search_path = '' as $$
declare checked_at timestamptz;
begin
  -- Serialize presence and duel transitions for the small Anglertreff group.
  perform pg_advisory_xact_lock(hashtextextended('sterni-quiz-lifecycle', 0));
  checked_at := clock_timestamp();
  update treff_private.quiz_duels q
  set ended_at = checked_at, end_reason = unavailable.reason, ended_by = unavailable.member_id
  from (
    select active.id, loss.member_id, coalesce(loss.reason, 'expired') as reason
    from treff_private.quiz_duels active
    left join treff_private.live_quiz l on l.id = active.id
    left join lateral (
      select p.member_id, case when s.left_at is not null then 'left' else 'disconnected' end as reason
      from (values (active.challenger), (active.opponent)) p(member_id)
      left join public.treff_members m on m.id = p.member_id and m.active
      left join lateral (
        select latest.left_at, latest.available_until from treff_private.quiz_sessions latest
        where latest.member_id = p.member_id
        order by latest.available_until desc, latest.id
        limit 1
      ) s on true
      where m.id is null or s.available_until is null or s.available_until <= checked_at
      order by s.available_until nulls first, p.member_id
      limit 1
    ) loss on true
    where (active.challenger = player or active.opponent = player)
      and active.declined_at is null and active.ended_at is null
      and (active.accepted_at is null or (l.round <= 5 and l.left_by is null))
      and (loss.member_id is not null
        or (active.accepted_at is null and active.created_at <= checked_at - interval '2 minutes'))
  ) unavailable
  where q.id = unavailable.id;

  update treff_private.live_quiz l set left_by = q.ended_by
  from treff_private.quiz_duels q
  where l.id = q.id and q.ended_by is not null
    and (q.challenger = player or q.opponent = player)
    and l.left_by is null and l.round <= 5;
end;
$$;

create or replace function public.sterni_quiz_leave(session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  left_time timestamptz;
begin
  if session_id is null or not exists (select 1 from public.treff_members where id = me and active)
    then return; end if;
  perform treff_private.refresh_quiz_duels(me);
  left_time := clock_timestamp();
  -- A closed tab cannot be revived by a heartbeat already in flight.
  insert into treff_private.quiz_sessions(member_id, id, seen_at, left_at, available_until)
  values (me, session_id, left_time, left_time, left_time)
  on conflict (member_id, id) do update
    set left_at = excluded.left_at,
        available_until = least(quiz_sessions.available_until, excluded.left_at + interval '5 seconds')
    where quiz_sessions.left_at is null;
end;
$$;

revoke all on function treff_private.quiz_available(uuid) from public, anon, authenticated;
revoke all on function treff_private.refresh_quiz_duels(uuid) from public, anon, authenticated;
revoke all on function public.sterni_quiz_leave(uuid) from public, anon;
grant execute on function public.sterni_quiz_leave(uuid) to authenticated;

create or replace function public.sterni_quiz_snapshot(session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_name text;
begin
  select m.display_name into my_name from public.treff_members m where m.id = me and m.active;
  if not found then raise exception 'Aktive Mitgliedschaft erforderlich.' using errcode = '42501'; end if;

  if session_id is null then raise exception 'Ungültige Quiz-Sitzung.'; end if;
  perform treff_private.refresh_quiz_duels(me);
  delete from treff_private.quiz_sessions where seen_at < clock_timestamp() - interval '1 hour';
  insert into treff_private.quiz_sessions (member_id, id, seen_at, available_until)
  values (me, session_id, clock_timestamp(), clock_timestamp() + interval '35 seconds')
  on conflict (member_id, id) do update
    set seen_at = excluded.seen_at, available_until = excluded.available_until
    where quiz_sessions.left_at is null
      and quiz_sessions.seen_at < excluded.seen_at - interval '5 seconds';

  return jsonb_build_object(
    'me', jsonb_build_object('id', me, 'name', my_name),
    'online', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.display_name) order by m.display_name, m.id)
      from public.treff_members m
      where m.active and treff_private.quiz_available(m.id)
    ), '[]'::jsonb),
    'duels', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.created_at desc) from (
        select q.id, q.category, q.seed, q.created_at, q.accepted_at, q.declined_at,
          l.id is not null as live, coalesce(l.round = 6 or l.left_by is not null, false) as live_finished,
          q.opponent = me as incoming,
          coalesce(q.ended_at, case when l.left_by is not null and l.round <= 5 then l.created_at end) as ended_at,
          coalesce(q.end_reason, case when l.left_by is not null and l.round <= 5 then 'left_duel' end) as end_reason,
          coalesce(q.ended_by, l.left_by) = me as ended_by_me,
          a.display_name as challenger_name,
          b.display_name as challenged_name,
          case when q.challenger = me then b.display_name else a.display_name end as opponent_name,
          case when q.challenger = me then q.challenger_score else q.opponent_score end as my_score,
          case when q.challenger = me then q.opponent_score else q.challenger_score end as opponent_score
          ,case
            when q.declined_at is not null then 'abgebrochen'
            when q.ended_at is not null or (l.left_by is not null and l.round <= 5) then 'abgebrochen'
            when q.challenger_score is not null and q.opponent_score is not null then 'abgeschlossen'
            when q.accepted_at is not null and l.id is not null then 'laufend'
            else 'eingeladen'
          end as status
        from treff_private.quiz_duels q
        left join treff_private.live_quiz l on l.id = q.id
        join public.treff_members a on a.id = q.challenger
        join public.treff_members b on b.id = q.opponent
        where (q.challenger = me or q.opponent = me)
        order by (q.declined_at is not null or q.ended_at is not null
          or coalesce(l.round = 6 or l.left_by is not null, false)), q.created_at desc
        limit 100
      ) d
    ), '[]'::jsonb),
    'leaderboard', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.wins desc, r.points desc, r.played desc, r.name, r.id)
      from (
        select m.id, m.display_name as name, count(*)::integer as played,
          count(*) filter (where s.own > s.other)::integer as wins,
          count(*) filter (where s.own < s.other)::integer as losses,
          count(*) filter (where s.own = s.other)::integer as draws,
          coalesce(sum(s.own), 0)::integer as points
        from treff_private.quiz_duels q
        cross join lateral (values
          (q.challenger, q.challenger_score, q.opponent_score),
          (q.opponent, q.opponent_score, q.challenger_score)
        ) s(member_id, own, other)
        join public.treff_members m on m.id = s.member_id and m.active
        where s.own is not null and s.other is not null
        group by m.id, m.display_name
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.sterni_quiz_decline(duel_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  perform treff_private.refresh_quiz_duels(me);
  update treff_private.quiz_duels q
  set declined_at = coalesce(q.declined_at, now())
  where q.id = duel_id and q.opponent = me and q.accepted_at is null and q.ended_at is null
    and q.opponent_score is null
    and q.created_at >= now() - interval '7 days'
    and exists (select 1 from public.treff_members where id = me and active);
  if not found then raise exception 'Diese Einladung ist nicht verfügbar.' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sterni_quiz_accept(duel_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  invitation treff_private.quiz_duels%rowtype;
  created boolean;
begin
  perform treff_private.refresh_quiz_duels(me);
  select q.* into invitation
  from treff_private.quiz_duels q
  where q.id = duel_id and q.opponent = me and q.declined_at is null and q.ended_at is null
    and q.created_at >= now() - interval '7 days'
    and q.challenger_score is null and q.opponent_score is null
    and exists (select 1 from public.treff_members where id = me and active)
    and exists (select 1 from public.treff_members where id = q.challenger and active)
  for update;
  if not found then raise exception 'Diese Einladung ist nicht verfügbar.' using errcode = '42501'; end if;

  if not exists (
    select 1 from treff_private.live_quiz
    where id = duel_id and host = invitation.challenger and guest = me
  ) then
    loop
      insert into treff_private.live_quiz(id, host, guest, questions, guest_seen)
      values (duel_id, invitation.challenger, me, treff_private.live_quiz_questions(), now())
      on conflict (code) do nothing
      returning true into created;
      exit when created;
    end loop;
  end if;

  update treff_private.quiz_duels set accepted_at = coalesce(accepted_at, now()) where id = duel_id;
end;
$$;

create or replace function public.sterni_quiz_create(duel_id uuid, target uuid, topic text, question_seed integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  existing uuid;
begin
  if not exists (select 1 from public.treff_members where id = me and active) then
    raise exception 'Aktive Mitgliedschaft erforderlich.' using errcode = '42501';
  end if;
  if duel_id is null or target is null or target = me or question_seed is null or question_seed < 0
     or topic is null or topic !~ '^[a-z]{2,24}$' then raise exception 'Ungültige Herausforderung.'; end if;

  perform treff_private.refresh_quiz_duels(me);
  perform treff_private.refresh_quiz_duels(target);
  select q.id into existing from treff_private.quiz_duels q
    where q.id = duel_id and q.challenger = me and q.opponent = target;
  if found then return existing; end if;

  if not treff_private.quiz_available(me) then
    raise exception 'Deine Quiz-Verbindung ist unterbrochen.';
  end if;
  if not treff_private.quiz_available(target) then
    raise exception 'Dieses Mitglied ist gerade offline.';
  end if;
  if exists (
    select 1 from treff_private.quiz_duels q
    left join treff_private.live_quiz l on l.id = q.id
    where (q.challenger in (me, target) or q.opponent in (me, target))
      and q.declined_at is null and q.ended_at is null
      and (q.accepted_at is null or (l.left_by is null and l.round <= 5))
      and q.created_at >= now() - interval '7 days'
  ) then raise exception 'Einer von euch hat bereits ein offenes Duell.'; end if;
  if (select count(*) from treff_private.quiz_duels q where q.challenger = me and q.created_at >= now() - interval '1 minute') >= 3
  then raise exception 'Bitte warte kurz vor deiner nächsten Herausforderung.'; end if;

  insert into treff_private.quiz_duels(id, challenger, opponent, category, seed)
  values (duel_id, me, target, topic, question_seed);
  return duel_id;
end;
$$;

revoke all on function public.sterni_quiz_snapshot(uuid) from public, anon;
revoke all on function public.sterni_quiz_decline(uuid) from public, anon;
revoke all on function public.sterni_quiz_accept(uuid) from public, anon;
grant execute on function public.sterni_quiz_snapshot(uuid) to authenticated;
grant execute on function public.sterni_quiz_decline(uuid) to authenticated;
grant execute on function public.sterni_quiz_accept(uuid) to authenticated;

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

  if exists (select 1 from treff_private.quiz_duels q
    where q.id = target_id and me in (q.challenger, q.opponent)) then
    perform treff_private.refresh_quiz_duels(me);
  end if;

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
      -- Geteilte Einladungslinks besitzen noch keinen Duell-Datensatz. Beim
      -- Beitritt wird er angelegt, damit auch diese Runde in Historie und
      -- Rangliste landet; direkte Herausforderungen treffen auf den bereits
      -- vorhandenen Datensatz und bleiben unverändert.
      insert into treff_private.quiz_duels(id, challenger, opponent, category, seed, accepted_at)
      values (game.id, game.host, me, 'all', 0, now())
      on conflict (id) do nothing;
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
            values (gen_random_uuid(), game.host, game.guest,
              treff_private.live_quiz_questions(game.questions), now())
            returning id into game.rematch_id;
            insert into treff_private.quiz_duels(id, challenger, opponent, category, seed, accepted_at)
            values (game.rematch_id, game.host, game.guest, 'all', 0, now())
            on conflict (id) do nothing;
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

  -- Sobald beide alle fünf Fragen abgeschlossen haben, wird genau einmal das
  -- verbindliche Ergebnis gespeichert. COALESCE macht erneute Statusabfragen
  -- und doppelte Klicks idempotent.
  if game.round = 6 and game.left_by is null then
    update treff_private.quiz_duels q set
      accepted_at = coalesce(q.accepted_at, now()),
      challenger_score = coalesce(q.challenger_score,
        (select count(*) filter (where game.host_answers[i] = (game.questions -> (i - 1) ->> 'correct')::integer) * 10
         from generate_series(1, 5) as index(i))),
      opponent_score = coalesce(q.opponent_score,
        (select count(*) filter (where game.guest_answers[i] = (game.questions -> (i - 1) ->> 'correct')::integer) * 10
         from generate_series(1, 5) as index(i)))
    where q.id = game.id and q.challenger = game.host and q.opponent = game.guest;
  end if;

  return jsonb_build_object(
    'id', game.id, 'code', game.code, 'me', own_name, 'opponent', other_name, 'round', game.round,
    'question', current_question - 'correct', 'answer', own_answers[game.round], 'correct', correct,
    'myScore', own_score, 'opponentScore', other_score,
    'ready', case when is_host then game.host_ready else game.guest_ready end,
    'left', case when game.left_by = me then 'self' when game.left_by is not null then 'opponent' end,
    'endReason', (select q.end_reason from treff_private.quiz_duels q where q.id = game.id),
    'offline', coalesce(opponent_seen < now() - interval '25 seconds', false),
    'rematch', game.rematch_id
  );
end;
$$;

revoke all on function public.sterni_live_quiz(text, uuid, text, integer, integer) from public, anon;
grant execute on function public.sterni_live_quiz(text, uuid, text, integer, integer) to authenticated;

commit;
