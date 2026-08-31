-- 0032 — médias attachés aux posts (photos / vidéos, carrousel ordonné).
--
-- Remplace l'aperçu Canva par un vrai upload de fichiers. `canva_url` reste comme
-- lien de travail interne (jamais montré au client). Les colonnes d'aperçu Canva
-- (miniature auto/manuelle) disparaissent.
--
-- Stockage : bucket `post-media` **public** — les visuels sont de toute façon
-- destinés à être publiés. Chemin : `{client_id}/{post_id}/{uuid}.{ext}`, non
-- énumérable. La table `post_media` (RLS) contrôle qui *découvre* les chemins ;
-- l'écriture dans le bucket est réservée aux rôles internes ayant accès au client.

-- ── nettoyage Canva ────────────────────────────────────────────────
alter table public.posts
  drop column if exists canva_thumbnail_url,
  drop column if exists canva_thumbnail_source,
  drop column if exists canva_fetched_at;

comment on column public.posts.canva_url is 'Lien de travail Canva — interne, jamais exposé au contact client.';

-- ── table post_media ──────────────────────────────────────────────
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null unique,
  kind text not null check (kind in ('image', 'video')),
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  width int,
  height int,
  duration_seconds numeric,
  position int not null default 0,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists post_media_post_idx on public.post_media (post_id, position);

alter table public.post_media enable row level security;

-- Lecture : accès interne au client OU contact du client (mêmes règles que les posts).
drop policy if exists post_media_select on public.post_media;
create policy post_media_select on public.post_media
  for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.deleted_at is null
        and (
          public.has_client_access(p.client_id)
          or (
            p.status in ('client_review', 'approved', 'scheduled', 'published')
            and p.client_id in (select public.contact_client_ids())
          )
        )
    )
  );

-- Écriture : rôle interne ayant accès au client du post.
drop policy if exists post_media_write on public.post_media;
create policy post_media_write on public.post_media
  for all to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id and public.has_client_access(p.client_id)
    )
  )
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id and public.has_client_access(p.client_id)
    )
  );

-- Note : Supabase interdit le DELETE direct sur `storage.objects`, y compris
-- depuis un trigger SECURITY DEFINER (« Use the Storage API instead »). Le
-- nettoyage de l'objet uploadé se fait donc **côté service** (`deletePostMedia`
-- appelle la Storage API avant de supprimer la ligne). Sur un cascade
-- (purge d'un post), l'objet peut rester orphelin dans le bucket — coût
-- négligeable, à balayer plus tard si besoin.
drop trigger if exists post_media_after_delete on public.post_media;
drop function if exists public.post_media_drop_object();

-- Réordonnancement atomique (drag & drop dans l'éditeur).
create or replace function public.post_media_reorder(p_post_id uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_client uuid;
begin
  select client_id into v_client from public.posts where id = p_post_id;
  if v_client is null or not public.has_client_access(v_client) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  update public.post_media m
  set position = ord.idx
  from (select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as idx) ord
  where m.id = ord.id and m.post_id = p_post_id;
end $$;
grant execute on function public.post_media_reorder(uuid, uuid[]) to authenticated;

-- ── bucket de stockage ────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media', 'post-media', true, 104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Écriture dans le bucket : rôle interne ayant accès au client (1er segment du chemin).
drop policy if exists "post-media insert" on storage.objects;
create policy "post-media insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and public.has_client_access(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "post-media update" on storage.objects;
create policy "post-media update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-media'
    and public.has_client_access(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "post-media delete" on storage.objects;
create policy "post-media delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and public.has_client_access(((storage.foldername(name))[1])::uuid)
  );

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 32, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
