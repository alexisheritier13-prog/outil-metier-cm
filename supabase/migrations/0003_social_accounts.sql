-- 0003_social_accounts — réseaux de référence + comptes sociaux des clients

-- Enum des réseaux (aussi utilisé par posts / campaigns aux epics suivants).
do $$ begin
  create type public.network_t as enum
    ('instagram', 'linkedin', 'facebook', 'tiktok', 'x', 'youtube', 'pinterest', 'threads');
exception when duplicate_object then null;
end $$;

-- ─────────────────────  Table de référence des réseaux  ─────────────────────
create table if not exists public.networks (
  code public.network_t primary key,
  label text not null,
  -- specs indicatives (formats, ratios, longueur de légende conseillée…) — jamais bloquant
  specs text not null default '',
  position int not null default 0
);
comment on table public.networks is 'Réseaux sociaux gérés + specs indicatives (éditables par l''admin).';

insert into public.networks (code, label, specs, position) values
  ('instagram', 'Instagram', 'Post 1080×1080 (1:1) ou 1080×1350 (4:5). Reels 1080×1920 (9:16). Légende ≤ 2 200 caractères, ~125 avant la coupure.', 1),
  ('linkedin',  'LinkedIn',  'Image 1200×627 (1.91:1) ou 1080×1350. Texte ≤ 3 000 caractères, ~140 avant « voir plus ».', 2),
  ('facebook',  'Facebook',  'Image 1200×630 (1.91:1). Texte sans limite pratique, ~80 avant la coupure.', 3),
  ('tiktok',    'TikTok',    'Vidéo 1080×1920 (9:16). Légende ≤ 2 200 caractères.', 4),
  ('x',         'X (Twitter)', 'Image 1600×900 (16:9). Texte ≤ 280 caractères (ou 25 000 en premium).', 5),
  ('youtube',   'YouTube',   'Miniature 1280×720 (16:9). Titre ≤ 100 caractères, description ≤ 5 000.', 6),
  ('pinterest', 'Pinterest', 'Épingle 1000×1500 (2:3). Titre ≤ 100 caractères, description ≤ 500.', 7),
  ('threads',   'Threads',   'Image 1080×1080. Texte ≤ 500 caractères.', 8)
on conflict (code) do update set label = excluded.label, specs = excluded.specs, position = excluded.position;

alter table public.networks enable row level security;

drop policy if exists networks_read on public.networks;
create policy networks_read on public.networks
  for select to authenticated using (public.auth_is_active());

drop policy if exists networks_admin_write on public.networks;
create policy networks_admin_write on public.networks
  for all to authenticated
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ─────────────────────  Comptes sociaux des clients  ─────────────────────
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  network public.network_t not null,
  handle text not null,
  created_at timestamptz not null default now(),
  unique (client_id, network, handle)
);
comment on table public.social_accounts is 'Compte social rattaché à un client (réseau + identifiant).';

create index if not exists social_accounts_client_idx on public.social_accounts (client_id);

alter table public.social_accounts enable row level security;

-- Lecture : accès interne au client.
drop policy if exists social_accounts_select on public.social_accounts;
create policy social_accounts_select on public.social_accounts
  for select to authenticated
  using (public.has_client_access(client_id));

-- Écriture : accès interne au client (cm assigné, lead, admin).
drop policy if exists social_accounts_write on public.social_accounts;
create policy social_accounts_write on public.social_accounts
  for all to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

-- ─────────────────────  schema_version  ─────────────────────
insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 3, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
