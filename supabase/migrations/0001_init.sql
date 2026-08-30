-- 0001_init — socle : extensions + table de métadonnées applicative
--
-- Les extensions pg_cron / pg_net (ordonnancement des jobs) sont activées plus tard,
-- dans la migration de l'Epic 8, car elles ne sont pas disponibles sur toutes les
-- instances locales.

create extension if not exists pgcrypto with schema extensions;   -- gen_random_uuid()
create extension if not exists citext with schema extensions;     -- emails, noms de tags
create extension if not exists pg_trgm with schema extensions;    -- recherche floue

-- Métadonnées applicatives (clé/valeur). Sert aussi de cible triviale aux tests de connexion.
create table if not exists public.app_meta (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.app_meta is 'Métadonnées applicatives clé/valeur (schema version, flags…).';

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 1, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();

-- RLS : lecture publique (données non sensibles), écriture réservée au service_role.
alter table public.app_meta enable row level security;

drop policy if exists app_meta_read on public.app_meta;
create policy app_meta_read on public.app_meta
  for select
  to anon, authenticated
  using (true);

-- Pas de policy insert/update/delete pour anon/authenticated : seul service_role écrit
-- (il contourne la RLS).
