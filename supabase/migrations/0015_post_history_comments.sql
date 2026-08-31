-- 0015 — historique champ par champ (trigger) + fil de commentaires du post.

-- ─────────────────  Historique : trigger sur les modifications de champs  ─────────────────
create or replace function public.posts_log_field_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  f text;
  fields text[] := array['caption','scheduled_at','network','canva_url','canva_url',
                         'campaign_id','author_id','performance_note'];
begin
  -- statut / deleted_at : déjà journalisés par les RPC dédiés.
  foreach f in array array['caption','scheduled_at','network','canva_url','campaign_id',
                           'author_id','performance_note'] loop
    if to_jsonb(new) ->> f is distinct from to_jsonb(old) ->> f then
      insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
      values (new.id, auth.uid(), 'update', f, to_jsonb(old) ->> f, to_jsonb(new) ->> f);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists posts_log_changes on public.posts;
create trigger posts_log_changes after update on public.posts
  for each row execute function public.posts_log_field_changes();

-- Journalise aussi la création.
create or replace function public.posts_log_create()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.post_history (post_id, actor_id, action)
  values (new.id, auth.uid(), 'create');
  return new;
end $$;

drop trigger if exists posts_log_create_trg on public.posts;
create trigger posts_log_create_trg after insert on public.posts
  for each row execute function public.posts_log_create();

-- ─────────────────────────  Commentaires du post  ─────────────────────────
do $$ begin
  create type public.comment_visibility_t as enum ('internal', 'client');
exception when duplicate_object then null;
end $$;

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  visibility public.comment_visibility_t not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

drop trigger if exists post_comments_set_updated_at on public.post_comments;
create trigger post_comments_set_updated_at before update on public.post_comments
  for each row execute function public.set_updated_at();

alter table public.post_comments enable row level security;

-- Lecture interne : accès au client du post, tous les commentaires non supprimés.
drop policy if exists post_comments_select_internal on public.post_comments;
create policy post_comments_select_internal on public.post_comments
  for select to authenticated
  using (
    deleted_at is null
    and public.auth_role() in ('cm','lead','admin')
    and exists (select 1 from public.posts p
                where p.id = post_comments.post_id and public.has_client_access(p.client_id))
  );

-- Lecture client : seulement les commentaires 'client' de SES posts.
drop policy if exists post_comments_select_client on public.post_comments;
create policy post_comments_select_client on public.post_comments
  for select to authenticated
  using (
    deleted_at is null
    and visibility = 'client'
    and exists (select 1 from public.posts p
                where p.id = post_comments.post_id and p.client_id in (select public.contact_client_ids()))
  );

-- Écriture interne : accès au client ; l'auteur est forcément soi.
drop policy if exists post_comments_insert_internal on public.post_comments;
create policy post_comments_insert_internal on public.post_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.auth_role() in ('cm','lead','admin')
    and exists (select 1 from public.posts p
                where p.id = post_comments.post_id and public.has_client_access(p.client_id))
  );

-- Écriture client : commentaire 'client' sur un de ses posts.
drop policy if exists post_comments_insert_client on public.post_comments;
create policy post_comments_insert_client on public.post_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and visibility = 'client'
    and exists (select 1 from public.posts p
                where p.id = post_comments.post_id and p.client_id in (select public.contact_client_ids()))
  );

-- Édition / suppression : son propre commentaire, ou lead/admin.
drop policy if exists post_comments_update on public.post_comments;
create policy post_comments_update on public.post_comments
  for update to authenticated
  using (author_id = auth.uid() or public.auth_role() in ('lead','admin'))
  with check (author_id = auth.uid() or public.auth_role() in ('lead','admin'));

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 15, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
