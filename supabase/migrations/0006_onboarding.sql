-- 0006_onboarding — checklist d'onboarding par client + paramètres applicatifs

-- ─────────────────────  Paramètres applicatifs (clé/valeur)  ─────────────────────
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
comment on table public.app_settings is 'Paramètres globaux (modèle d''onboarding, seuils d''alertes…).';

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (key, value) values
  ('onboarding_template', jsonb_build_array(
    'Récupérer les accès aux comptes sociaux',
    'Valider la charte éditoriale',
    'Définir la fréquence de publication',
    'Lister les contacts de validation',
    'Caler la première réunion de brief',
    'Créer le premier mois de contenu',
    'Faire valider le premier lot de posts'
  ))
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to authenticated using (public.auth_is_active());

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings
  for all to authenticated
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ─────────────────────  Items d'onboarding  ─────────────────────
create table if not exists public.onboarding_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  label text not null,
  position int not null default 0,
  is_done boolean not null default false,
  done_at timestamptz,
  done_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists onboarding_items_client_idx on public.onboarding_items (client_id, position);

alter table public.onboarding_items enable row level security;

drop policy if exists onboarding_items_select on public.onboarding_items;
create policy onboarding_items_select on public.onboarding_items
  for select to authenticated
  using (public.has_client_access(client_id));

drop policy if exists onboarding_items_write on public.onboarding_items;
create policy onboarding_items_write on public.onboarding_items
  for all to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

-- ─────────────────────  Création auto à la création d'un client  ─────────────────────
create or replace function public.seed_onboarding_for_client()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tpl jsonb;
  item text;
  i int := 0;
begin
  select value into tpl from public.app_settings where key = 'onboarding_template';
  if tpl is null then return new; end if;
  for item in select jsonb_array_elements_text(tpl) loop
    insert into public.onboarding_items (client_id, label, position)
    values (new.id, item, i);
    i := i + 1;
  end loop;
  return new;
end $$;

drop trigger if exists on_client_created_seed_onboarding on public.clients;
create trigger on_client_created_seed_onboarding after insert on public.clients
  for each row execute function public.seed_onboarding_for_client();

-- ─────────────────────  Vue d'avancement (réutilisée en Story 2.6)  ─────────────────────
create or replace view public.client_onboarding_progress
  with (security_invoker = on) as
  select
    client_id,
    count(*) filter (where is_done) as done,
    count(*) as total
  from public.onboarding_items
  group by client_id;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 6, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
