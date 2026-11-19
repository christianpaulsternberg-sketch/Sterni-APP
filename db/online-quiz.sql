begin;

create table if not exists treff_private.quiz_presence (
  member_id uuid primary key references public.treff_members(id) on delete cascade,
  seen_at timestamptz not null
);

create table if not exists treff_private.quiz_duels (
  id uuid primary key,
  challenger uuid not null references public.treff_members(id) on delete cascade,
  opponent uuid not null references public.treff_members(id) on delete cascade,
  category text not null,
  seed integer not null check (seed >= 0),
  created_at timestamptz not null default now(),
  challenger_score integer check (challenger_score between 0 and 100 and challenger_score % 10 = 0),
  opponent_score integer check (opponent_score between 0 and 100 and opponent_score % 10 = 0),
  check (challenger <> opponent)
);

alter table treff_private.quiz_duels add column if not exists accepted_at timestamptz;
alter table treff_private.quiz_duels add column if not exists declined_at timestamptz;
update treff_private.quiz_duels
set accepted_at = created_at
where accepted_at is null and opponent_score is not null;

alter table treff_private.quiz_presence enable row level security;
alter table treff_private.quiz_duels enable row level security;
revoke all on treff_private.quiz_presence, treff_private.quiz_duels from public, anon, authenticated;
create index if not exists quiz_duels_challenger on treff_private.quiz_duels(challenger, created_at desc);
create index if not exists quiz_duels_opponent on treff_private.quiz_duels(opponent, created_at desc);

create or replace function public.sterni_quiz_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_name text;
begin
  select m.display_name into my_name from public.treff_members m where m.id = me and m.active;
  if not found then raise exception 'Aktive Mitgliedschaft erforderlich.' using errcode = '42501'; end if;

  insert into treff_private.quiz_presence(member_id, seen_at) values (me, now())
  on conflict (member_id) do update set seen_at = excluded.seen_at
  where quiz_presence.seen_at < excluded.seen_at - interval '15 seconds';

  return jsonb_build_object(
    'me', jsonb_build_object('id', me, 'name', my_name),
    'online', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.display_name) order by m.display_name, m.id)
      from treff_private.quiz_presence p join public.treff_members m on m.id = p.member_id
      where m.active and p.seen_at >= now() - interval '90 seconds'
    ), '[]'::jsonb),
    'duels', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.created_at desc) from (
        select q.id, q.category, q.seed, q.created_at,
          q.opponent = me as incoming, q.accepted_at, q.declined_at,
          case when q.challenger = me then q.opponent else q.challenger end as opponent_id,
          case when q.challenger = me then b.display_name else a.display_name end as opponent_name,
          case when q.challenger = me then q.challenger_score else q.opponent_score end as my_score,
          case when q.challenger = me then q.opponent_score else q.challenger_score end as opponent_score
        from treff_private.quiz_duels q
        join public.treff_members a on a.id = q.challenger and a.active
        join public.treff_members b on b.id = q.opponent and b.active
        where (q.challenger = me or q.opponent = me) and q.created_at >= now() - interval '7 days'
        order by (q.challenger_score is not null and q.opponent_score is not null), q.created_at desc
        limit 30
      ) d
    ), '[]'::jsonb),
    'leaderboard', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.wins desc, r.points desc, r.name, r.id)
      from (
        select m.id, m.display_name as name, count(*) as played,
          count(*) filter (where s.own > s.other) as wins,
          count(*) filter (where s.own < s.other) as losses,
          count(*) filter (where s.own = s.other) as draws,
          sum(s.own) as points
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

  perform pg_advisory_xact_lock(hashtextextended('sterni-quiz:' || me::text, 0));
  select q.id into existing from treff_private.quiz_duels q
    where q.id = duel_id and q.challenger = me and q.opponent = target;
  if found then return existing; end if;

  if not exists (
    select 1 from treff_private.quiz_presence p join public.treff_members m on m.id = p.member_id
    where p.member_id = target and m.active and p.seen_at >= now() - interval '90 seconds'
  ) then raise exception 'Dieses Mitglied ist gerade offline.'; end if;
  if exists (
    select 1 from treff_private.quiz_duels q
    where q.challenger = me and q.opponent = target and q.challenger_score is null
      and q.created_at >= now() - interval '7 days'
  ) then raise exception 'Für dieses Mitglied hast du bereits eine offene Runde.'; end if;
  if (select count(*) from treff_private.quiz_duels q where q.challenger = me and q.created_at >= now() - interval '1 minute') >= 3
  then raise exception 'Bitte warte kurz vor deiner nächsten Herausforderung.'; end if;

  insert into treff_private.quiz_duels(id, challenger, opponent, category, seed)
  values (duel_id, me, target, topic, question_seed);
  return duel_id;
end;
$$;

create or replace function public.sterni_quiz_accept(duel_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  update treff_private.quiz_duels q
  set accepted_at = coalesce(q.accepted_at, now())
  where q.id = duel_id and q.opponent = me
    and q.declined_at is null
    and q.created_at >= now() - interval '7 days'
    and exists (select 1 from public.treff_members where id = me and active)
    and exists (select 1 from public.treff_members where id = q.challenger and active);
  if not found then raise exception 'Diese Einladung ist nicht verfügbar.' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sterni_quiz_decline(duel_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  update treff_private.quiz_duels q
  set declined_at = coalesce(q.declined_at, now())
  where q.id = duel_id and q.opponent = me and q.accepted_at is null
    and q.declined_at is null and q.opponent_score is null and q.created_at >= now() - interval '7 days'
    and exists (select 1 from public.treff_members where id = me and active);
  if not found then raise exception 'Diese Einladung ist nicht verfügbar.' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sterni_quiz_submit(duel_id uuid, points integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  duel treff_private.quiz_duels%rowtype;
begin
  if not exists (select 1 from public.treff_members where id = me and active) then
    raise exception 'Aktive Mitgliedschaft erforderlich.' using errcode = '42501';
  end if;
  if points is null or points < 0 or points > 100 or points % 10 <> 0 then raise exception 'Ungültige Punktzahl.'; end if;

  update treff_private.quiz_duels q set
    accepted_at = case when q.opponent = me then coalesce(q.accepted_at, now()) else q.accepted_at end,
    challenger_score = case when q.challenger = me then coalesce(q.challenger_score, points) else q.challenger_score end,
    opponent_score = case when q.opponent = me then coalesce(q.opponent_score, points) else q.opponent_score end
  where q.id = duel_id and (q.challenger = me or q.opponent = me)
    and q.created_at >= now() - interval '7 days'
  returning q.* into duel;
  if not found then raise exception 'Dieses Duell ist nicht verfügbar.' using errcode = '42501'; end if;

  return jsonb_build_object(
    'my_score', case when duel.challenger = me then duel.challenger_score else duel.opponent_score end,
    'opponent_score', case when duel.challenger = me then duel.opponent_score else duel.challenger_score end
  );
end;
$$;

revoke all on function public.sterni_quiz_snapshot() from public, anon;
revoke all on function public.sterni_quiz_create(uuid, uuid, text, integer) from public, anon;
revoke all on function public.sterni_quiz_submit(uuid, integer) from public, anon;
grant execute on function public.sterni_quiz_snapshot() to authenticated;
grant execute on function public.sterni_quiz_create(uuid, uuid, text, integer) to authenticated;
grant execute on function public.sterni_quiz_submit(uuid, integer) to authenticated;
revoke all on function public.sterni_quiz_accept(uuid) from public, anon;
grant execute on function public.sterni_quiz_accept(uuid) to authenticated;
revoke all on function public.sterni_quiz_decline(uuid) from public, anon;
grant execute on function public.sterni_quiz_decline(uuid) to authenticated;
commit;
