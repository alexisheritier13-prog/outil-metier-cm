-- 0004_client_contacts — contacts de validation côté client + fonction d'isolation portail

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  full_name text not null default '',
  email citext not null,
  auth_user_id uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (client_id, email)
);
comment on table public.client_contacts is 'Personne côté client habilitée à valider ; peut avoir un compte de connexion.';

create index if not exists client_contacts_client_idx on public.client_contacts (client_id);
create index if not exists client_contacts_auth_user_idx on public.client_contacts (auth_user_id);

-- Les client_id auxquels le contact connecté (role 'client') a accès. Utilisé par toutes
-- les policies de l'espace client (Epic 6) et par la lecture de sa propre fiche contact.
create or replace function public.contact_client_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select cc.client_id
  from public.client_contacts cc
  where cc.auth_user_id = auth.uid() and cc.is_active = true
$$;

grant execute on function public.contact_client_ids() to authenticated;

alter table public.client_contacts enable row level security;

-- Lecture : accès interne au client, OU le contact lit sa propre ligne.
drop policy if exists client_contacts_select on public.client_contacts;
create policy client_contacts_select on public.client_contacts
  for select to authenticated
  using (
    public.has_client_access(client_id)
    or auth_user_id = auth.uid()
  );

-- Écriture : réservée lead / admin.
drop policy if exists client_contacts_write on public.client_contacts;
create policy client_contacts_write on public.client_contacts
  for all to authenticated
  using (public.auth_is_active() and public.auth_role() in ('lead', 'admin'))
  with check (public.auth_is_active() and public.auth_role() in ('lead', 'admin'));

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 4, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
