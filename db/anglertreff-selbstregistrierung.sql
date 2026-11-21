-- Anglertreff: Selbstregistrierung, Datenschutz und serverseitige Verwaltung.
-- Einmal im Supabase SQL Editor ausführen; bestehende Mitglieder und Beiträge bleiben erhalten.
begin;

alter table public.treff_members add column if not exists active boolean not null default true;

create or replace function treff_private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (
   select 1 from public.treff_members
   where id = (select auth.uid()) and active
 );
$$;
revoke all on function treff_private.is_member() from public;
grant execute on function treff_private.is_member() to authenticated;

-- Das Profil entsteht ausschließlich im Trigger. Mitglieder können weder ihre
-- Rolle noch den Aktivstatus über die öffentliche API ändern.
create or replace function public.treff_create_member_from_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  chosen_name text;
begin
  chosen_name := left(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), 60);
  if chosen_name = '' then
    chosen_name := split_part(coalesce(new.email, 'Angelfreund'), '@', 1);
  end if;
  insert into public.treff_members(id, display_name, active)
  values (new.id, chosen_name, true)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.treff_create_member_from_auth() from public, anon, authenticated;
drop trigger if exists treff_create_member_from_auth on auth.users;
create trigger treff_create_member_from_auth
  after insert on auth.users for each row execute procedure public.treff_create_member_from_auth();

-- Es bleiben nur die absichtlich minimalen Profilangaben sichtbar; E-Mail,
-- Registrierungsdatum und Rollen liefert ausschließlich die Edge Function an Admins.
drop policy if exists members_read on public.treff_members;
create policy members_read on public.treff_members for select to authenticated
 using (treff_private.is_member());
revoke insert, update, delete on public.treff_members from anon, authenticated;

-- Keine Selbstbeförderung: Die vorhandene Admin-Tabelle bleibt für normale
-- Mitglieder unsichtbar; die Edge Function prüft sie zusätzlich mit service_role.
alter table public.treff_admins enable row level security;
drop policy if exists admin_self_read on public.treff_admins;
create policy admin_self_read on public.treff_admins for select to authenticated
 using (id = (select auth.uid()) and treff_private.is_member());

commit;

-- Supabase Dashboard → Authentication → URL Configuration:
-- Site URL: https://christianpaulsternberg-sketch.github.io/Sterni-APP/
-- Redirect URL: https://christianpaulsternberg-sketch.github.io/Sterni-APP/anglertreff.html
-- Außerdem in Authentication → Providers → Email „Confirm email“ aktiv lassen.
