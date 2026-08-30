-- 0012_tags_campaigns — tags libres, liaison post_tags, campagnes ; FK posts.campaign_id ;
-- RPC post_duplicate.

-- ─────────────────────  Tags (globaux)  ─────────────────────
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name citext unique not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now()
);
alter table public.tags enable row level security;

drop policy if exists tags_read on public.tags;
create policy tags_read on public.tags
  for select to authenticated using (public.auth_is_active());

drop policy if exists tags_write_internal on public.tags;
create policy tags_write_internal on public.tags
  for all to authenticated
  using (public.auth_is_active() and public.auth_role() in ('cm', 'lead', 'admin'))
  with check (public.auth_is_active() and public.auth_role() in ('cm', 'lead', 'admin'));

-- ─────────────────────  Campagnes  ─────────────────────
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  description text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists campaigns_client_idx on public.campaigns (client_id);

alter table public.campaigns enable row level security;

drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns
  for select to authenticated using (public.has_client_access(client_id));

drop policy if exists campaigns_write on public.campaigns;
create policy campaigns_write on public.campaigns
  for all to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

-- FK posts.campaign_id (la colonne existait depuis 0008, sans contrainte)
do $$ begin
  alter table public.posts
    add constraint posts_campaign_id_fkey
    foreign key (campaign_id) references public.campaigns (id) on delete set null;
exception when duplicate_object then null;
end $$;

-- ─────────────────────  post_tags  ─────────────────────
create table if not exists public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);
create index if not exists post_tags_tag_idx on public.post_tags (tag_id);

alter table public.post_tags enable row level security;

drop policy if exists post_tags_select on public.post_tags;
create policy post_tags_select on public.post_tags
  for select to authenticated
  using (
    exists (select 1 from public.posts p
            where p.id = post_tags.post_id and public.has_client_access(p.client_id))
  );

drop policy if exists post_tags_write on public.post_tags;
create policy post_tags_write on public.post_tags
  for all to authenticated
  using (
    exists (select 1 from public.posts p
            where p.id = post_tags.post_id and public.has_client_access(p.client_id))
  )
  with check (
    exists (select 1 from public.posts p
            where p.id = post_tags.post_id and public.has_client_access(p.client_id))
  );

-- ─────────────────────  Vue : campagnes + nb de posts  ─────────────────────
create or replace view public.campaign_overview
  with (security_invoker = on) as
  select
    c.*,
    (select count(*) from public.posts p
     where p.campaign_id = c.id and p.deleted_at is null)::int as post_count
  from public.campaigns c;

-- ─────────────────────  RPC post_duplicate  ─────────────────────
create or replace function public.post_duplicate(p_post_id uuid, p_shift_days int default 7)
returns public.posts language plpgsql security definer set search_path = public as $$
declare v_src public.posts; v_new public.posts;
begin
  select * into v_src from public.posts where id = p_post_id and deleted_at is null;
  if not found then raise exception 'post introuvable'; end if;
  if not public.has_client_access(v_src.client_id) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;

  insert into public.posts (
    client_id, network, scheduled_at, caption, canva_url, campaign_id,
    author_id, origin_type, origin_id
  ) values (
    v_src.client_id, v_src.network,
    v_src.scheduled_at + make_interval(days => p_shift_days),
    v_src.caption, v_src.canva_url, v_src.campaign_id,
    auth.uid(), 'duplicate', v_src.id
  ) returning * into v_new;

  insert into public.post_tags (post_id, tag_id)
    select v_new.id, tag_id from public.post_tags where post_id = v_src.id;

  insert into public.post_history (post_id, actor_id, action, new_value)
  values (v_new.id, auth.uid(), 'create', 'duplicate of ' || v_src.id::text);

  return v_new;
end $$;

grant execute on function public.post_duplicate(uuid, int) to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 12, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
