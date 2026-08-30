-- 0002_profiles_roles — identité, rôles et périmètre client
--
-- Crée : enum role_t, profiles, clients (minimal), user_clients,
-- les fonctions d'autorisation (auth_role, auth_is_active, has_client_access),
-- le trigger de création de profil, et les policies RLS d'isolation.

-- ─────────────────────────────  Enum  ─────────────────────────────
do $$ begin
  create type public.role_t as enum ('cm', 'lead', 'admin', 'client');
exception when duplicate_object then null;
end $$;

-- ─────────────────────────────  Tables  ───────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.role_t not null default 'cm',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Profil applicatif lié à auth.users (rôle, activation).';

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  sector text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.clients is 'Compte client de l''agence (enrichi en Epic 2).';

create table if not exists public.user_clients (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  primary key (profile_id, client_id)
);
comment on table public.user_clients is 'Assignation d''un utilisateur interne à un client.';

create index if not exists user_clients_client_idx on public.user_clients (client_id);

-- ────────────────────────  updated_at trigger  ───────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- ───────────────────  Création auto du profil  ───────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'cm',
    false
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────  Fonctions d'autorisation  ───────────────────
-- Rôle de l'utilisateur courant (null si non authentifié / sans profil).
create or replace function public.auth_role()
returns public.role_t language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- L'utilisateur courant est-il actif ?
create or replace function public.auth_is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false)
$$;

-- Accès interne à un client : lead/admin (tous) ou cm assigné. Toujours faux si inactif.
create or replace function public.has_client_access(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.auth_is_active() and (
    public.auth_role() in ('lead', 'admin')
    or exists (
      select 1 from public.user_clients uc
      where uc.profile_id = auth.uid() and uc.client_id = cid
    )
  )
$$;

grant execute on function public.auth_role(), public.auth_is_active(), public.has_client_access(uuid)
  to anon, authenticated;

-- ─────────────────────────────  RLS  ─────────────────────────────
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.user_clients enable row level security;

-- profiles : chacun lit son profil ; l'admin lit tout.
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.auth_role() = 'admin');

-- profiles : chacun peut mettre à jour son nom (pas son rôle ni son activation).
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and is_active = (select is_active from public.profiles where id = auth.uid())
  );

-- profiles : l'admin gère tout (création via trigger ; ici update/delete).
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- clients : lecture selon périmètre ; jamais les clients supprimés (corbeille = vue dédiée).
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (deleted_at is null and public.has_client_access(id));

-- clients : écriture réservée lead/admin (CRUD complet détaillé en Epic 2).
drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients
  for all to authenticated
  using (public.auth_is_active() and public.auth_role() in ('lead', 'admin'))
  with check (public.auth_is_active() and public.auth_role() in ('lead', 'admin'));

-- user_clients : l'utilisateur voit ses assignations ; l'admin voit et gère tout.
drop policy if exists user_clients_select on public.user_clients;
create policy user_clients_select on public.user_clients
  for select to authenticated
  using (profile_id = auth.uid() or public.auth_role() in ('lead', 'admin'));

drop policy if exists user_clients_admin_write on public.user_clients;
create policy user_clients_admin_write on public.user_clients
  for all to authenticated
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ────────────────────────  schema_version  ───────────────────────
insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 2, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
