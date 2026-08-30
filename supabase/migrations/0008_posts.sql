-- 0008_posts — modèle de post + pipeline de statuts (colonnes complètes, front-load)
--
-- Les transitions de statut contrôlées (fonction can_transition + RPC) arrivent en 3.2.
-- campaign_id / les tags (post_tags) arrivent en 3.6 — campaign_id est nullable sans FK ici.

do $$ begin
  create type public.post_status_t as enum
    ('draft', 'internal_review', 'client_review', 'approved', 'scheduled', 'published');
exception when duplicate_object then null;
end $$;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  network public.network_t not null,
  scheduled_at timestamptz not null,
  caption text not null default '',
  canva_url text,
  canva_thumbnail_url text,
  canva_thumbnail_source text check (canva_thumbnail_source in ('auto', 'manual')),
  canva_fetched_at timestamptz,
  status public.post_status_t not null default 'draft',
  author_id uuid not null references public.profiles (id),
  campaign_id uuid,
  origin_type text check (origin_type in ('idea', 'key_date', 'client_request', 'duplicate')),
  origin_id uuid,
  performance_note text,
  performance_visible_to_client boolean not null default false,
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (to_tsvector('french', coalesce(caption, ''))) stored
);

create index if not exists posts_client_sched_idx
  on public.posts (client_id, scheduled_at) where deleted_at is null;
create index if not exists posts_status_idx
  on public.posts (status) where deleted_at is null;
create index if not exists posts_author_idx on public.posts (author_id) where deleted_at is null;
create index if not exists posts_search_idx on public.posts using gin (search_tsv);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- Renseigne status_changed_* quand le statut bouge.
create or replace function public.posts_track_status_change()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists posts_track_status on public.posts;
create trigger posts_track_status before update on public.posts
  for each row execute function public.posts_track_status_change();

alter table public.posts enable row level security;

-- Lecture interne : clients autorisés, hors corbeille.
drop policy if exists posts_select_internal on public.posts;
create policy posts_select_internal on public.posts
  for select to authenticated
  using (deleted_at is null and public.has_client_access(client_id));

-- Création : lead/admin sur tout client actif ; cm sur ses clients assignés.
drop policy if exists posts_insert_internal on public.posts;
create policy posts_insert_internal on public.posts
  for insert to authenticated
  with check (
    public.has_client_access(client_id)
    and (
      public.auth_role() in ('lead', 'admin')
      or exists (
        select 1 from public.user_clients uc
        where uc.profile_id = auth.uid() and uc.client_id = posts.client_id
      )
    )
  );

-- Mise à jour : accès interne au client. (Les règles fines de corbeille = Story 3.7,
-- les transitions de statut contrôlées = Story 3.2 via RPC.)
drop policy if exists posts_update_internal on public.posts;
create policy posts_update_internal on public.posts
  for update to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

-- Pas de policy DELETE : la suppression est un soft-delete (update deleted_at).

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 8, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
