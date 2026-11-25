-- ====================================================================
-- Besucherstatistik und Datenschutz für die Sterni-App
-- Ausführen im Supabase SQL Editor.
-- ====================================================================
begin;

-- 1. Hilfsfunktion für Administrator-Prüfung im privaten Schema
create or replace function treff_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.treff_admins
    where id = (select auth.uid())
  ) and treff_private.is_member();
$$;
revoke all on function treff_private.is_admin() from public;
grant execute on function treff_private.is_admin() to authenticated;

-- 2. Freiwillige Einwilligung zur personenbezogenen Nutzungsstatistik
create table if not exists public.treff_analytics_consent (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consented boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.treff_analytics_consent enable row level security;
revoke all on public.treff_analytics_consent from public, anon;
grant select, insert, update on public.treff_analytics_consent to authenticated;

-- Mitglieder dürfen nur ihre eigene Einwilligung lesen oder Administratoren alle
drop policy if exists consent_select on public.treff_analytics_consent;
create policy consent_select on public.treff_analytics_consent
  for select to authenticated
  using (user_id = (select auth.uid()) or treff_private.is_admin());

-- Mitglieder dürfen nur ihre eigene Einwilligung anlegen
drop policy if exists consent_insert on public.treff_analytics_consent;
create policy consent_insert on public.treff_analytics_consent
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Mitglieder dürfen nur ihre eigene Einwilligung aktualisieren
drop policy if exists consent_update on public.treff_analytics_consent;
create policy consent_update on public.treff_analytics_consent
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3. Tabelle für Aufrufe und Besucherstatistik (app_visits)
create table if not exists public.app_visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  session_id text not null,
  page_area text not null,
  user_id uuid references auth.users(id) on delete set null,
  display_name text
);

-- Indizes für schnelle Abfragen und Filterung
create index if not exists idx_app_visits_visited_at on public.app_visits (visited_at desc);
create index if not exists idx_app_visits_page_area on public.app_visits (page_area);
create index if not exists idx_app_visits_user_id on public.app_visits (user_id);
create index if not exists idx_app_visits_session on public.app_visits (session_id);

alter table public.app_visits enable row level security;

-- INSERT: Getrennte Policies für anon (nur anonym, ohne Zugriff auf consent-Tabelle) und authenticated
drop policy if exists visits_insert_policy on public.app_visits;
drop policy if exists visits_insert_anon on public.app_visits;
drop policy if exists visits_insert_auth on public.app_visits;

create policy visits_insert_anon on public.app_visits
  for insert to anon
  with check (user_id is null and display_name is null);

create policy visits_insert_auth on public.app_visits
  for insert to authenticated
  with check (
    -- Entweder vollständig anonym (keine Nutzerdaten)
    (user_id is null and display_name is null)
    or
    -- Oder authentifiziert und mit nachgewiesener Einwilligung
    (
      user_id = (select auth.uid()) and exists (
        select 1 from public.treff_analytics_consent c
        where c.user_id = (select auth.uid()) and c.consented = true
      )
    )
  );

-- SELECT: Ausschließlich Administratoren dürfen die Statistik abrufen!
drop policy if exists visits_select_admin on public.app_visits;
create policy visits_select_admin on public.app_visits
  for select to authenticated
  using (treff_private.is_admin());

-- DELETE: Ausschließlich Administratoren dürfen Statistikdaten löschen
drop policy if exists visits_delete_admin on public.app_visits;
create policy visits_delete_admin on public.app_visits
  for delete to authenticated
  using (treff_private.is_admin());

-- Keine manuellen Updates auf Statistikdaten; explizite Rollenrechte setzen
revoke all on public.app_visits from public;
revoke select, update, delete on public.app_visits from anon;
revoke update on public.app_visits from authenticated;
grant insert on public.app_visits to anon, authenticated;
grant select, delete on public.app_visits to authenticated;
grant usage, select on sequence public.app_visits_id_seq to anon, authenticated;

-- 4. Bereinigungsfunktion zur Einhaltung von Speicher- und Löschfristen (Standard: 90 Tage)
create or replace function public.cleanup_old_app_visits(days_to_keep int default 90)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  deleted_count int;
begin
  if not treff_private.is_admin() then
    raise exception 'Zugriff verweigert: Nur Administratoren dürfen die Besucherstatistik bereinigen.';
  end if;

  delete from public.app_visits
  where visited_at < (now() - make_interval(days => greatest(days_to_keep, 7)));
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_old_app_visits(int) from public, anon;
grant execute on function public.cleanup_old_app_visits(int) to authenticated;

commit;
