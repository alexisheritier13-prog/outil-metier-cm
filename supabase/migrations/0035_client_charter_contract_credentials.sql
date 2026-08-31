-- 0035 — fiche client enrichie :
--   1. charte graphique (couleurs + typographies) sur `editorial_guidelines`
--   2. `client_contracts` : les grandes lignes de la prestation (1 par client)
--   3. `client_credentials` : codes de connexion des comptes du client (interne)
--
-- Tout est réservé à l'accès interne au client (`has_client_access`). Rien n'est
-- exposé au portail client.

-- ── 1. Charte graphique ──────────────────────────────────────────────────────
alter table public.editorial_guidelines
  add column if not exists brand_colors jsonb not null default '[]'::jsonb,
  add column if not exists typography text not null default '';
comment on column public.editorial_guidelines.brand_colors is
  'Liste [{ "hex": "#1B4D3E", "label": "Vert principal" }] — charte graphique.';
comment on column public.editorial_guidelines.typography is
  'Typographies de la marque (titres, corps, règles) — texte libre.';

-- ── 2. Contrat / prestation ─────────────────────────────────────────────────
create table if not exists public.client_contracts (
  client_id uuid primary key references public.clients (id) on delete cascade,
  scope text not null default '',        -- ce qu'on livre (posts, stories, reels, CM…)
  cadence text not null default '',      -- rythme de publication
  channels text not null default '',     -- réseaux couverts
  start_date date,
  notes text not null default '',        -- durée, reconduction, conditions
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
comment on table public.client_contracts is 'Grandes lignes de la prestation pour un client (informatif).';

drop trigger if exists client_contracts_set_updated_at on public.client_contracts;
create trigger client_contracts_set_updated_at before update on public.client_contracts
  for each row execute function public.set_updated_at();

alter table public.client_contracts enable row level security;

drop policy if exists client_contracts_all on public.client_contracts;
create policy client_contracts_all on public.client_contracts
  for all to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

-- ── 3. Codes de connexion ───────────────────────────────────────────────────
create table if not exists public.client_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  label text not null default '',        -- « Instagram », « Site WordPress », « Canva »…
  login text not null default '',        -- identifiant / e-mail
  secret text not null default '',       -- mot de passe / clé
  url text not null default '',          -- URL de connexion éventuelle
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
comment on table public.client_credentials is
  'Codes de connexion des comptes d''un client. Accès interne uniquement, jamais exposé au portail.';
create index if not exists client_credentials_client_idx on public.client_credentials (client_id);

drop trigger if exists client_credentials_set_updated_at on public.client_credentials;
create trigger client_credentials_set_updated_at before update on public.client_credentials
  for each row execute function public.set_updated_at();

alter table public.client_credentials enable row level security;

drop policy if exists client_credentials_all on public.client_credentials;
create policy client_credentials_all on public.client_credentials
  for all to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 35, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
