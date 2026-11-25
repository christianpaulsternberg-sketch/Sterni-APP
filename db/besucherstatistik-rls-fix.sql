-- ====================================================================
-- Besucherstatistik RLS-Fix: Getrennte INSERT-Policies für anon & authenticated
-- Einmalig im Supabase SQL Editor ausführen.
-- ====================================================================
begin;

drop policy if exists visits_insert_policy on public.app_visits;
drop policy if exists visits_insert_anon on public.app_visits;
drop policy if exists visits_insert_auth on public.app_visits;

-- Anonyme Besucher dürfen ausschließlich anonyme Aufrufe speichern (ohne Zugriff auf treff_analytics_consent)
create policy visits_insert_anon on public.app_visits
  for insert to anon
  with check (user_id is null and display_name is null);

-- Angemeldete Mitglieder dürfen anonym oder bei vorliegender Einwilligung namentlich speichern
create policy visits_insert_auth on public.app_visits
  for insert to authenticated
  with check (
    (user_id is null and display_name is null)
    or
    (
      user_id = (select auth.uid()) and exists (
        select 1 from public.treff_analytics_consent c
        where c.user_id = (select auth.uid()) and c.consented = true
      )
    )
  );

commit;
