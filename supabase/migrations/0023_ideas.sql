-- 0023 — banque d'idées (Story 7.1).
--
-- Idées de post non datées. Suppression définitive (FR44 : pas de corbeille).
-- Une idée sans client_id est visible de tous les internes ; avec client_id elle suit
-- l'accès client.

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  client_id uuid references public.clients (id) on delete set null,
  origin_request_id uuid references public.client_requests (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ideas_client_idx on public.ideas (client_id);
create index if not exists ideas_created_idx on public.ideas (created_at desc);

drop trigger if exists ideas_set_updated_at on public.ideas;
create trigger ideas_set_updated_at before update on public.ideas
  for each row execute function public.set_updated_at();

create table if not exists public.idea_tags (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (idea_id, tag_id)
);
create index if not exists idea_tags_tag_idx on public.idea_tags (tag_id);

-- Visibilité d'une idée : sans client → tout interne actif ; avec client → accès client.
create or replace function public.can_see_idea(p_client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_client_id is null
      then public.auth_is_active() and public.auth_role() in ('cm','lead','admin')
    else public.has_client_access(p_client_id)
  end
$$;
grant execute on function public.can_see_idea(uuid) to authenticated;

alter table public.ideas enable row level security;
alter table public.idea_tags enable row level security;

drop policy if exists ideas_select on public.ideas;
create policy ideas_select on public.ideas
  for select to authenticated using (public.can_see_idea(client_id));

drop policy if exists ideas_insert on public.ideas;
create policy ideas_insert on public.ideas
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_see_idea(client_id));

drop policy if exists ideas_update on public.ideas;
create policy ideas_update on public.ideas
  for update to authenticated
  using (created_by = auth.uid() or public.auth_role() in ('lead','admin'))
  with check (public.can_see_idea(client_id));

drop policy if exists ideas_delete on public.ideas;
create policy ideas_delete on public.ideas
  for delete to authenticated
  using (created_by = auth.uid() or public.auth_role() in ('lead','admin'));

drop policy if exists idea_tags_select on public.idea_tags;
create policy idea_tags_select on public.idea_tags
  for select to authenticated
  using (exists (select 1 from public.ideas i
                 where i.id = idea_tags.idea_id and public.can_see_idea(i.client_id)));

drop policy if exists idea_tags_write on public.idea_tags;
create policy idea_tags_write on public.idea_tags
  for all to authenticated
  using (exists (select 1 from public.ideas i
                 where i.id = idea_tags.idea_id and public.can_see_idea(i.client_id)))
  with check (exists (select 1 from public.ideas i
                      where i.id = idea_tags.idea_id and public.can_see_idea(i.client_id)));

-- ─────────────────  RPC : transformer une idée en post brouillon  ─────────────────
create or replace function public.idea_to_post(
  p_idea_id uuid,
  p_client_id uuid default null,
  p_network public.network_t default null,
  p_scheduled_at timestamptz default null
) returns public.posts language plpgsql security definer set search_path = public as $$
declare
  v_idea public.ideas;
  v_client uuid;
  v_post public.posts;
begin
  if public.auth_role() not in ('cm','lead','admin') then
    raise exception 'réservé aux rôles internes' using errcode = '42501';
  end if;

  select * into v_idea from public.ideas where id = p_idea_id;
  if not found then raise exception 'idée introuvable'; end if;
  if not public.can_see_idea(v_idea.client_id) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;

  v_client := coalesce(p_client_id, v_idea.client_id);
  if v_client is null then
    raise exception 'un client est requis pour créer le post';
  end if;
  if not public.has_client_access(v_client) then
    raise exception 'accès refusé au client' using errcode = '42501';
  end if;

  insert into public.posts (client_id, network, scheduled_at, caption, author_id,
                            origin_type, origin_id)
  values (
    v_client,
    coalesce(p_network, 'instagram'),
    coalesce(p_scheduled_at, now() + interval '7 days'),
    v_idea.title || case when v_idea.description <> '' then E'\n\n' || v_idea.description else '' end,
    auth.uid(),
    'idea',
    v_idea.id
  )
  returning * into v_post;

  -- reprend les tags de l'idée
  insert into public.post_tags (post_id, tag_id)
    select v_post.id, tag_id from public.idea_tags where idea_id = v_idea.id;

  return v_post;
end $$;

grant execute on function public.idea_to_post(uuid, uuid, public.network_t, timestamptz)
  to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 23, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
