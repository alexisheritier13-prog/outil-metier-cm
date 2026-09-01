-- 0037 — rubriques de contenu par client + rattachement des posts.
--
-- Permet de suivre l'équilibre éditorial d'un mois (ex. 40 % produit,
-- 30 % coulisses, 30 % UGC). Accès interne au client (`has_client_access`).

create table if not exists public.client_pillars (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  label text not null,
  target_pct int not null default 0 check (target_pct between 0 and 100),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.client_pillars is 'Rubriques de contenu d''un client (part cible en %).';
create index if not exists client_pillars_client_idx on public.client_pillars (client_id);

alter table public.client_pillars enable row level security;
drop policy if exists client_pillars_all on public.client_pillars;
create policy client_pillars_all on public.client_pillars
  for all to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

alter table public.posts
  add column if not exists pillar_id uuid references public.client_pillars (id) on delete set null;
comment on column public.posts.pillar_id is 'Rubrique de contenu (client_pillars) — facultatif.';

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 37, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
