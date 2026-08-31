-- 0025 — calendrier des marronniers (Story 7.3).
--
-- Temps forts : globaux, par secteur d'activité, ou spécifiques à un client.
-- `recurring_annually` : la date se répète chaque année (seuls mois+jour comptent).

do $$ begin
  create type public.key_date_scope_t as enum ('global', 'sector', 'client');
exception when duplicate_object then null;
end $$;

create table if not exists public.key_dates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  recurring_annually boolean not null default true,
  scope public.key_date_scope_t not null,
  sector text,
  client_id uuid references public.clients (id) on delete cascade,
  description text not null default '',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint key_dates_scope_chk check (
    (scope = 'global' and sector is null and client_id is null) or
    (scope = 'sector' and sector is not null and client_id is null) or
    (scope = 'client' and client_id is not null)
  )
);
create index if not exists key_dates_client_idx on public.key_dates (client_id);
create index if not exists key_dates_scope_idx on public.key_dates (scope);

drop trigger if exists key_dates_set_updated_at on public.key_dates;
create trigger key_dates_set_updated_at before update on public.key_dates
  for each row execute function public.set_updated_at();

alter table public.key_dates enable row level security;

-- Lecture : global + sector visibles de tout interne actif ; client suit l'accès.
drop policy if exists key_dates_select on public.key_dates;
create policy key_dates_select on public.key_dates
  for select to authenticated
  using (
    case scope
      when 'client' then public.has_client_access(client_id)
      else public.auth_is_active() and public.auth_role() in ('cm','lead','admin')
    end
  );

-- Écriture : global / sector réservés lead+admin ; client → accès client.
drop policy if exists key_dates_write on public.key_dates;
create policy key_dates_write on public.key_dates
  for all to authenticated
  using (
    case scope
      when 'client' then public.has_client_access(client_id)
      else public.auth_role() in ('lead','admin')
    end
  )
  with check (
    created_by = auth.uid()
    and case scope
      when 'client' then public.has_client_access(client_id)
      else public.auth_role() in ('lead','admin')
    end
  );

-- Marronniers applicables à un client : globaux + ceux de son secteur + les siens.
create or replace function public.key_dates_for_client(p_client_id uuid)
returns setof public.key_dates language sql stable security definer set search_path = public as $$
  select k.*
  from public.key_dates k
  left join public.clients c on c.id = p_client_id
  where k.scope = 'global'
     or (k.scope = 'sector' and k.sector is not distinct from c.sector)
     or (k.scope = 'client' and k.client_id = p_client_id)
$$;
grant execute on function public.key_dates_for_client(uuid) to authenticated;

-- ─────────────  RPC : planifier un marronnier (post brouillon pré-daté)  ─────────────
create or replace function public.key_date_to_post(
  p_key_date_id uuid,
  p_client_id uuid,
  p_year int default null,
  p_network public.network_t default null
) returns public.posts language plpgsql security definer set search_path = public as $$
declare
  v_kd public.key_dates;
  v_date date;
  v_post public.posts;
begin
  if public.auth_role() not in ('cm','lead','admin') then
    raise exception 'réservé aux rôles internes' using errcode = '42501';
  end if;
  if not public.has_client_access(p_client_id) then
    raise exception 'accès refusé au client' using errcode = '42501';
  end if;

  select * into v_kd from public.key_dates where id = p_key_date_id;
  if not found then raise exception 'marronnier introuvable'; end if;

  v_date := case
    when v_kd.recurring_annually and p_year is not null
      then make_date(p_year, extract(month from v_kd.event_date)::int, extract(day from v_kd.event_date)::int)
    else v_kd.event_date
  end;

  insert into public.posts (client_id, network, scheduled_at, caption, author_id,
                            origin_type, origin_id)
  values (
    p_client_id,
    coalesce(p_network, 'instagram'),
    (v_date + time '10:00') at time zone 'Europe/Paris',
    v_kd.name || case when v_kd.description <> '' then E'\n\n' || v_kd.description else '' end,
    auth.uid(),
    'key_date',
    v_kd.id
  )
  returning * into v_post;

  return v_post;
end $$;

grant execute on function public.key_date_to_post(uuid, uuid, int, public.network_t)
  to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 25, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
