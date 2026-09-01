-- 0040 — validation d'un post depuis un lien (sans connexion au portail).
--
-- Un jeton par post, régénéré à chaque entrée en `client_review`. Le lien
-- `/valider/<token>` ouvre une page publique : approuver / demander une modif.
-- Les RPC sont SECURITY DEFINER (le jeton EST le secret).

create table if not exists public.post_approval_tokens (
  post_id uuid primary key references public.posts (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.post_approval_tokens enable row level security;

drop policy if exists post_approval_tokens_select on public.post_approval_tokens;
create policy post_approval_tokens_select on public.post_approval_tokens
  for select to authenticated
  using (
    exists (select 1 from public.posts p
            where p.id = post_id and public.has_client_access(p.client_id))
  );
-- Pas d'insert / update direct : trigger + RPC SECURITY DEFINER.

-- Jeton (re)créé à l'entrée en validation client.
create or replace function public.posts_ensure_approval_token() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'client_review' and coalesce(old.status::text, '') <> 'client_review' then
    insert into public.post_approval_tokens (post_id) values (new.id)
    on conflict (post_id) do update
      set token = gen_random_uuid(), used_at = null, created_at = now();
  end if;
  return new;
end $$;

drop trigger if exists posts_ensure_approval_token on public.posts;
create trigger posts_ensure_approval_token after update of status on public.posts
  for each row execute function public.posts_ensure_approval_token();

-- Rétro-actif : jetons pour les posts déjà en validation client.
insert into public.post_approval_tokens (post_id)
select id from public.posts where status = 'client_review' and deleted_at is null
on conflict (post_id) do nothing;

-- ─────────────────  Lecture publique via jeton  ─────────────────
create or replace function public.post_by_approval_token(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'postId', p.id,
    'status', p.status,
    'network', p.network,
    'scheduledAt', p.scheduled_at,
    'caption', p.caption,
    'clientName', c.name,
    'clientLogoUrl', c.logo_url,
    'used', (t.used_at is not null),
    'media', coalesce((
      select jsonb_agg(jsonb_build_object('storagePath', m.storage_path, 'kind', m.kind) order by m.position)
      from public.post_media m where m.post_id = p.id
    ), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'body', pc.body, 'createdAt', pc.created_at, 'system', pc.kind = 'system')
             order by pc.created_at)
      from public.post_comments pc where pc.post_id = p.id and pc.visibility = 'client'
    ), '[]'::jsonb)
  )
  from public.post_approval_tokens t
  join public.posts p on p.id = t.post_id and p.deleted_at is null
  join public.clients c on c.id = p.client_id
  where t.token = p_token;
$$;

grant execute on function public.post_by_approval_token(uuid) to anon, authenticated;

-- ─────────────────  Actions via jeton  ─────────────────
create or replace function public.approve_via_token(p_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_post public.posts; v_tok public.post_approval_tokens;
begin
  select * into v_tok from public.post_approval_tokens where token = p_token;
  if not found or v_tok.used_at is not null then return 'invalid'; end if;
  select * into v_post from public.posts where id = v_tok.post_id and deleted_at is null;
  if not found or v_post.status <> 'client_review' then return 'invalid'; end if;

  update public.posts set status = 'approved' where id = v_post.id;
  insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
  values (v_post.id, null, 'status_change', 'status', 'client_review', 'approved');
  insert into public.post_comments (post_id, author_id, body, visibility, kind)
  values (v_post.id, v_post.author_id, 'Approuvé via le lien de validation', 'client', 'system');
  perform public.notify(
    v_post.author_id, 'post_client_approved',
    'Le post a été approuvé via le lien', v_post.id, v_post.client_id, null
  );
  update public.post_approval_tokens set used_at = now() where token = p_token;
  return 'ok';
end $$;

create or replace function public.reject_via_token(p_token uuid, p_comment text)
returns text language plpgsql security definer set search_path = public as $$
declare v_post public.posts; v_tok public.post_approval_tokens;
begin
  if coalesce(btrim(p_comment), '') = '' then return 'comment_required'; end if;
  select * into v_tok from public.post_approval_tokens where token = p_token;
  if not found or v_tok.used_at is not null then return 'invalid'; end if;
  select * into v_post from public.posts where id = v_tok.post_id and deleted_at is null;
  if not found or v_post.status <> 'client_review' then return 'invalid'; end if;

  update public.posts set status = 'draft' where id = v_post.id;
  insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
  values (v_post.id, null, 'status_change', 'status', 'client_review', 'draft');
  insert into public.post_comments (post_id, author_id, body, visibility, kind)
  values (v_post.id, v_post.author_id, btrim(p_comment), 'client', 'system');
  perform public.notify(
    v_post.author_id, 'post_client_rejected',
    'Une modification a été demandée via le lien', v_post.id, v_post.client_id, null
  );
  update public.post_approval_tokens set used_at = now() where token = p_token;
  return 'ok';
end $$;

grant execute on function public.approve_via_token(uuid) to anon, authenticated;
grant execute on function public.reject_via_token(uuid, text) to anon, authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 40, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
