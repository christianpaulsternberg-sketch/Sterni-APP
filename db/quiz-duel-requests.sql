begin;

alter table treff_private.quiz_duels
  add column if not exists declined_at timestamptz;

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
        select q.id, q.category, q.seed, q.created_at, q.accepted_at, q.declined_at,
          q.opponent = me as incoming,
          case when q.challenger = me then b.display_name else a.display_name end as opponent_name,
          case when q.challenger = me then q.challenger_score else q.opponent_score end as my_score,
          case when q.challenger = me then q.opponent_score else q.challenger_score end as opponent_score
        from treff_private.quiz_duels q
        join public.treff_members a on a.id = q.challenger and a.active
        join public.treff_members b on b.id = q.opponent and b.active
        where (q.challenger = me or q.opponent = me) and q.created_at >= now() - interval '7 days'
        order by q.created_at desc
        limit 30
      ) d
    ), '[]'::jsonb),
    'leaderboard', '[]'::jsonb
  );
end;
$$;

create or replace function public.sterni_quiz_decline(duel_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  update treff_private.quiz_duels q
  set declined_at = coalesce(q.declined_at, now())
  where q.id = duel_id and q.opponent = me and q.accepted_at is null
    and q.declined_at is null and q.opponent_score is null
    and q.created_at >= now() - interval '7 days'
    and exists (select 1 from public.treff_members where id = me and active);
  if not found then raise exception 'Diese Einladung ist nicht verfügbar.' using errcode = '42501'; end if;
end;
$$;

create or replace function public.sterni_quiz_accept(duel_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  update treff_private.quiz_duels q
  set accepted_at = coalesce(q.accepted_at, now())
  where q.id = duel_id and q.opponent = me and q.declined_at is null
    and q.created_at >= now() - interval '7 days'
    and exists (select 1 from public.treff_members where id = me and active)
    and exists (select 1 from public.treff_members where id = q.challenger and active);
  if not found then raise exception 'Diese Einladung ist nicht verfügbar.' using errcode = '42501'; end if;
end;
$$;

revoke all on function public.sterni_quiz_snapshot() from public, anon;
revoke all on function public.sterni_quiz_decline(uuid) from public, anon;
revoke all on function public.sterni_quiz_accept(uuid) from public, anon;
grant execute on function public.sterni_quiz_snapshot() to authenticated;
grant execute on function public.sterni_quiz_decline(uuid) to authenticated;
grant execute on function public.sterni_quiz_accept(uuid) to authenticated;

commit;
