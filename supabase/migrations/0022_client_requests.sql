-- 0022 — espace brief client → agence (Story 6.5).
--
-- Le contact dépose des demandes de contenu ; l'agence les traite, commente, et peut
-- transformer une demande en post (origin_type='client_request' existe déjà sur posts).
-- « Transformer en idée » = Epic 7 (banque d'idées pas encore là).

do $$ begin
  create type public.client_request_status_t as enum ('nouvelle', 'prise_en_compte', 'traitee');
exception when duplicate_object then null;
end $$;

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title text not null,
  description text not null default '',
  wanted_network public.network_t,
  wanted_date date,
  status public.client_request_status_t not null default 'nouvelle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_requests_client_idx
  on public.client_requests (client_id, created_at desc);
create index if not exists client_requests_status_idx on public.client_requests (status);

drop trigger if exists client_requests_set_updated_at on public.client_requests;
create trigger client_requests_set_updated_at before update on public.client_requests
  for each row execute function public.set_updated_at();

create table if not exists public.client_request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.client_requests (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists client_request_comments_req_idx
  on public.client_request_comments (request_id, created_at);

-- ───────────────────────────────  RLS  ───────────────────────────────
alter table public.client_requests enable row level security;
alter table public.client_request_comments enable row level security;

-- Qui « voit » une demande : interne avec accès au client, OU contact du client.
create or replace function public.can_see_client_request(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_client_access(cid) or cid in (select public.contact_client_ids())
$$;
grant execute on function public.can_see_client_request(uuid) to authenticated;

drop policy if exists client_requests_select on public.client_requests;
create policy client_requests_select on public.client_requests
  for select to authenticated using (public.can_see_client_request(client_id));

-- Création : par un contact du client (il est forcément l'auteur).
drop policy if exists client_requests_insert_contact on public.client_requests;
create policy client_requests_insert_contact on public.client_requests
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and client_id in (select public.contact_client_ids())
  );

-- Modification : le contact auteur tant que « nouvelle », OU un interne avec accès.
drop policy if exists client_requests_update on public.client_requests;
create policy client_requests_update on public.client_requests
  for update to authenticated
  using (
    (created_by = auth.uid() and status = 'nouvelle')
    or public.has_client_access(client_id)
  )
  with check (
    (created_by = auth.uid())
    or public.has_client_access(client_id)
  );

-- Garde : un contact ne change jamais le statut (réservé à l'agence).
create or replace function public.client_requests_guard()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and public.auth_role() = 'client' then
    raise exception 'le statut d''une demande est géré par l''agence' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists client_requests_guard_trg on public.client_requests;
create trigger client_requests_guard_trg before update on public.client_requests
  for each row execute function public.client_requests_guard();

-- Commentaires : visibles/insérables par tous ceux qui voient la demande.
drop policy if exists client_request_comments_select on public.client_request_comments;
create policy client_request_comments_select on public.client_request_comments
  for select to authenticated
  using (exists (
    select 1 from public.client_requests r
    where r.id = client_request_comments.request_id
      and public.can_see_client_request(r.client_id)
  ));

drop policy if exists client_request_comments_insert on public.client_request_comments;
create policy client_request_comments_insert on public.client_request_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.client_requests r
      where r.id = client_request_comments.request_id
        and public.can_see_client_request(r.client_id)
    )
  );

-- ─────────────────  RPC : transformer une demande en post  ─────────────────
create or replace function public.request_to_post(
  p_request_id uuid,
  p_scheduled_at timestamptz default null,
  p_network public.network_t default null
) returns public.posts language plpgsql security definer set search_path = public as $$
declare
  v_req public.client_requests;
  v_post public.posts;
  v_net public.network_t;
begin
  if public.auth_role() not in ('cm','lead','admin') then
    raise exception 'réservé aux rôles internes' using errcode = '42501';
  end if;

  select * into v_req from public.client_requests where id = p_request_id;
  if not found then raise exception 'demande introuvable'; end if;
  if not public.has_client_access(v_req.client_id) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;

  v_net := coalesce(p_network, v_req.wanted_network, 'instagram');

  insert into public.posts (client_id, network, scheduled_at, caption, author_id,
                            origin_type, origin_id)
  values (
    v_req.client_id,
    v_net,
    coalesce(p_scheduled_at, (v_req.wanted_date + time '10:00') at time zone 'Europe/Paris',
             now() + interval '7 days'),
    v_req.title || case when v_req.description <> '' then E'\n\n' || v_req.description else '' end,
    auth.uid(),
    'client_request',
    v_req.id
  )
  returning * into v_post;

  update public.client_requests set status = 'prise_en_compte'
    where id = p_request_id and status = 'nouvelle';

  return v_post;
end $$;

grant execute on function public.request_to_post(uuid, timestamptz, public.network_t) to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 22, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
