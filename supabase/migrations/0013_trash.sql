-- 0013_trash — corbeille (soft delete via RPC, règles FR45), restauration, purge 60 j.
--
-- `clients.deleted_at/deleted_by` existent depuis 0002 ; `posts` depuis 0008.
-- Les policies SELECT (posts, clients) ne filtrent plus `deleted_at` (0010) : les éléments
-- en corbeille restent visibles via RLS ; le filtrage est applicatif.

-- ─────────────────────  Journal des jobs planifiés  ─────────────────────
create table if not exists public.job_runs (
  id bigint generated always as identity primary key,
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  stats jsonb not null default '{}',
  error text
);
alter table public.job_runs enable row level security;
drop policy if exists job_runs_admin_read on public.job_runs;
create policy job_runs_admin_read on public.job_runs
  for select to authenticated using (public.auth_role() = 'admin');

-- ─────────────────────  Mise en corbeille d'un post (FR45)  ─────────────────────
-- CM : seulement ses propres posts en statut 'draft'.
-- Lead/Admin : tout post d'un client accessible.
create or replace function public.post_trash(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_post public.posts; v_role public.role_t := public.auth_role();
begin
  select * into v_post from public.posts where id = p_post_id and deleted_at is null for update;
  if not found then raise exception 'post introuvable'; end if;
  if not public.has_client_access(v_post.client_id) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;

  if v_role = 'cm' then
    if v_post.author_id <> auth.uid() or v_post.status <> 'draft' then
      raise exception 'un CM ne peut mettre à la corbeille que ses propres brouillons'
        using errcode = '42501';
    end if;
  elsif v_role not in ('lead','admin') then
    raise exception 'action non autorisée' using errcode = '42501';
  end if;

  update public.posts set deleted_at = now(), deleted_by = auth.uid() where id = p_post_id;
  insert into public.post_history (post_id, actor_id, action) values (p_post_id, auth.uid(), 'trash');
end $$;

create or replace function public.post_restore(p_post_id uuid)
returns public.posts language plpgsql security definer set search_path = public as $$
declare v_post public.posts;
begin
  if public.auth_role() not in ('lead','admin') then
    raise exception 'restauration réservée aux Lead / Admin' using errcode = '42501';
  end if;
  select * into v_post from public.posts where id = p_post_id and deleted_at is not null for update;
  if not found then raise exception 'post introuvable en corbeille'; end if;
  if not public.has_client_access(v_post.client_id) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  update public.posts set deleted_at = null, deleted_by = null where id = p_post_id
    returning * into v_post;
  insert into public.post_history (post_id, actor_id, action) values (p_post_id, auth.uid(), 'restore');
  return v_post;
end $$;

-- ─────────────────────  Corbeille client (Lead/Admin)  ─────────────────────
create or replace function public.client_trash(p_client_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role() not in ('lead','admin') then
    raise exception 'action réservée aux Lead / Admin' using errcode = '42501';
  end if;
  update public.clients set deleted_at = now(), deleted_by = auth.uid()
    where id = p_client_id and deleted_at is null;
end $$;

create or replace function public.client_restore(p_client_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role() not in ('lead','admin') then
    raise exception 'action réservée aux Lead / Admin' using errcode = '42501';
  end if;
  update public.clients set deleted_at = null, deleted_by = null
    where id = p_client_id and deleted_at is not null;
end $$;

-- ─────────────────────  Purge (60 j) + purge immédiate (Admin)  ─────────────────────
create or replace function public.purge_trash()
returns public.job_runs language plpgsql security definer set search_path = public as $$
declare v_run public.job_runs; v_posts int; v_clients int; v_cut timestamptz := now() - interval '60 days';
begin
  insert into public.job_runs (job_name) values ('purge_trash') returning * into v_run;
  delete from public.posts where deleted_at is not null and deleted_at < v_cut;
  get diagnostics v_posts = row_count;
  delete from public.clients where deleted_at is not null and deleted_at < v_cut;
  get diagnostics v_clients = row_count;
  update public.job_runs
    set finished_at = now(), ok = true,
        stats = jsonb_build_object('posts', v_posts, 'clients', v_clients)
    where id = v_run.id returning * into v_run;
  return v_run;
end $$;

create or replace function public.trash_purge_now(p_entity text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role() <> 'admin' then
    raise exception 'purge immédiate réservée à l''Admin' using errcode = '42501';
  end if;
  if p_entity = 'post' then
    delete from public.posts where id = p_id and deleted_at is not null;
  elsif p_entity = 'client' then
    delete from public.clients where id = p_id and deleted_at is not null;
  else
    raise exception 'entité inconnue';
  end if;
end $$;

grant execute on function
  public.post_trash(uuid), public.post_restore(uuid),
  public.client_trash(uuid), public.client_restore(uuid),
  public.trash_purge_now(text, uuid)
  to authenticated;

-- Défense en profondeur : interdire de poser/retirer deleted_at par UPDATE direct
-- (doit passer par post_trash / post_restore, qui portent les règles FR45).
create or replace function public.posts_guard_status_update()
returns trigger language plpgsql as $$
begin
  if current_user <> 'postgres' then
    if new.status is distinct from old.status then
      raise exception 'changez le statut via post_change_status()' using errcode = '42501';
    end if;
    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'utilisez post_trash() / post_restore()' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 13, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
