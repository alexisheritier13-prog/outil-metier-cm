-- 0042_multi_tenant — isolation par organisation (multi-agences / CM solo).
--
-- Jusqu'ici l'app est mono-agence : `has_client_access` renvoie vrai pour tout
-- lead/admin, quel que soit le client. Pour la beta multi-tenant on ajoute :
--
--   1. `organizations` + `platform_admins` (super-admin plateforme = nous).
--   2. `profiles.organization_id` + helpers `auth_org()` / `is_platform_admin()`.
--   3. `organization_id` sur toutes les tables métier, rempli automatiquement
--      par des triggers BEFORE INSERT qui le dérivent du parent
--      (post -> client -> organisation) — AUCUN corps de RPC/trigger existant
--      ne change.
--   4. Une policy RLS **RESTRICTIVE** `organization_id = auth_org()` par table :
--      elle s'ajoute (AND) aux policies permissives existantes sans les toucher.
--   5. `org_settings` (clé/valeur par organisation) : `account`, `workflow`,
--      `onboarding_template` deviennent par-organisation. `alert_thresholds`
--      reste global (app_settings) pour la beta.
--   6. Backfill : les données existantes (démo) rejoignent une organisation
--      « Studio Lumen ».
--
-- L'inscription sur invitation + la RPC de création d'organisation = migration 0043.
-- Idempotent : ré-exécutable sans risque.

-- ════════════════════════════════════════════════════════════════════
--  1. organizations + platform_admins
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text not null default 'beta',
  is_active boolean not null default true,
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.organizations is 'Agence / structure cliente de Cadence (locataire multi-tenant).';

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
comment on table public.platform_admins is 'Comptes super-admin plateforme (support, provisioning). Hors RLS applicative.';

alter table public.organizations enable row level security;
alter table public.platform_admins enable row level security;
-- platform_admins : aucune policy → réservé au service_role et aux fonctions SECURITY DEFINER.

-- ════════════════════════════════════════════════════════════════════
--  2. profiles.organization_id + helpers
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles
  add column if not exists organization_id uuid references public.organizations (id) on delete set null;
create index if not exists profiles_org_idx on public.profiles (organization_id);

-- Organisation de l'utilisateur courant (null si non authentifié / sans org).
create or replace function public.auth_org()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

grant execute on function public.auth_org(), public.is_platform_admin() to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
--  3. org_settings (clé/valeur par organisation)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.org_settings (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  primary key (organization_id, key)
);
comment on table public.org_settings is 'Paramètres par organisation (account, workflow, onboarding_template…).';

drop trigger if exists org_settings_set_updated_at on public.org_settings;
create trigger org_settings_set_updated_at before update on public.org_settings
  for each row execute function public.set_updated_at();

alter table public.org_settings enable row level security;

drop policy if exists org_settings_read on public.org_settings;
create policy org_settings_read on public.org_settings
  for select to authenticated
  using (public.auth_is_active() and organization_id = public.auth_org());

drop policy if exists org_settings_admin_write on public.org_settings;
create policy org_settings_admin_write on public.org_settings
  for all to authenticated
  using (public.auth_role() = 'admin' and organization_id = public.auth_org())
  with check (public.auth_role() = 'admin' and organization_id = public.auth_org());

-- ════════════════════════════════════════════════════════════════════
--  4. organization_id sur les tables métier
-- ════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'clients','posts','social_accounts','client_contacts','editorial_guidelines',
    'onboarding_items','campaigns','client_pillars','client_contracts','client_credentials',
    'client_requests','client_request_comments','post_history','post_comments','post_media',
    'post_tags','post_approval_tokens','ideas','idea_tags','post_templates','tags',
    'notifications','alerts','key_dates'
  ] loop
    execute format(
      'alter table public.%I add column if not exists organization_id uuid references public.organizations (id) on delete cascade',
      t);
    -- défaut = organisation de l'appelant ; les triggers ci-dessous corrigent
    -- depuis le parent (post -> client -> org) pour les tables enfant.
    execute format('alter table public.%I alter column organization_id set default public.auth_org()', t);
    execute format('create index if not exists %I on public.%I (organization_id)', t || '_org_idx', t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  5. Triggers BEFORE INSERT : remplir organization_id depuis le parent
-- ════════════════════════════════════════════════════════════════════
-- Tables enfant : l'organisation est TOUJOURS dérivée du parent (le défaut
-- auth_org() ne sert qu'à rendre la colonne optionnelle côté client / aux
-- lignes sans parent).
create or replace function public.tenant_fill_from_client()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is not null then
    select organization_id into new.organization_id from public.clients where id = new.client_id;
  end if;
  return new;
end $$;

create or replace function public.tenant_fill_from_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.post_id is not null then
    select organization_id into new.organization_id from public.posts where id = new.post_id;
  end if;
  return new;
end $$;

create or replace function public.tenant_fill_from_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.request_id is not null then
    select organization_id into new.organization_id from public.client_requests where id = new.request_id;
  end if;
  return new;
end $$;

create or replace function public.tenant_fill_from_idea()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.idea_id is not null then
    select organization_id into new.organization_id from public.ideas where id = new.idea_id;
  end if;
  return new;
end $$;

create or replace function public.tenant_fill_from_recipient()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    select organization_id into new.organization_id from public.profiles where id = new.user_id;
  end if;
  return new;
end $$;

-- clients / tags : organisation = celle de l'appelant.
create or replace function public.tenant_fill_from_caller()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    new.organization_id := public.auth_org();
  end if;
  return new;
end $$;

-- ideas / post_templates : org du client si rattaché, sinon celle de l'appelant (défaut).
create or replace function public.tenant_fill_client_or_caller()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is not null then
    select organization_id into new.organization_id from public.clients where id = new.client_id;
  end if;
  return new;
end $$;

-- alerts : org du client si présent, sinon du destinataire, sinon appelant (défaut).
create or replace function public.tenant_fill_alert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is not null then
    select organization_id into new.organization_id from public.clients where id = new.client_id;
  elsif new.target_user_id is not null then
    select organization_id into new.organization_id from public.profiles where id = new.target_user_id;
  end if;
  return new;
end $$;

-- key_dates : un marronnier créé par un tenant appartient à son organisation
-- (toutes portées). Les marronniers pré-installés (migration 0030, sans session)
-- gardent organization_id = null → visibles de toutes les organisations.
create or replace function public.tenant_fill_keydate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.scope = 'client' and new.client_id is not null then
    select organization_id into new.organization_id from public.clients where id = new.client_id;
  else
    new.organization_id := public.auth_org();
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in
      select t as tbl, 'tenant_fill_from_client' as fn from unnest(array[
        'posts','social_accounts','client_contacts','editorial_guidelines','onboarding_items',
        'campaigns','client_pillars','client_contracts','client_credentials','client_requests'
      ]) t
    union all
      select t, 'tenant_fill_from_post' from unnest(array[
        'post_history','post_comments','post_media','post_tags','post_approval_tokens'
      ]) t
    union all select 'client_request_comments', 'tenant_fill_from_request'
    union all select 'idea_tags', 'tenant_fill_from_idea'
    union all select 'notifications', 'tenant_fill_from_recipient'
    union all select t, 'tenant_fill_from_caller' from unnest(array['clients','tags']) t
    union all select t, 'tenant_fill_client_or_caller' from unnest(array['ideas','post_templates']) t
    union all select 'alerts', 'tenant_fill_alert'
    union all select 'key_dates', 'tenant_fill_keydate'
  loop
    execute format('drop trigger if exists tenant_fill_org on public.%I', r.tbl);
    execute format(
      'create trigger tenant_fill_org before insert on public.%I for each row execute function public.%I()',
      r.tbl, r.fn);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  6. Backfill : organisation « Studio Lumen » pour les données existantes
-- ════════════════════════════════════════════════════════════════════
do $$
declare v_org uuid;
begin
  if exists (select 1 from public.profiles) and not exists (select 1 from public.organizations) then
    insert into public.organizations (name, slug, plan)
    values ('Studio Lumen', 'studio-lumen', 'beta')
    returning id into v_org;

    update public.profiles set organization_id = v_org where organization_id is null;
    update public.clients  set organization_id = v_org where organization_id is null;

    update public.posts                   set organization_id = v_org where organization_id is null;
    update public.social_accounts         set organization_id = v_org where organization_id is null;
    update public.client_contacts         set organization_id = v_org where organization_id is null;
    update public.editorial_guidelines    set organization_id = v_org where organization_id is null;
    update public.onboarding_items        set organization_id = v_org where organization_id is null;
    update public.campaigns               set organization_id = v_org where organization_id is null;
    update public.client_pillars          set organization_id = v_org where organization_id is null;
    update public.client_contracts        set organization_id = v_org where organization_id is null;
    update public.client_credentials      set organization_id = v_org where organization_id is null;
    update public.client_requests         set organization_id = v_org where organization_id is null;
    update public.client_request_comments set organization_id = v_org where organization_id is null;
    update public.post_history            set organization_id = v_org where organization_id is null;
    update public.post_comments           set organization_id = v_org where organization_id is null;
    update public.post_media              set organization_id = v_org where organization_id is null;
    update public.post_tags               set organization_id = v_org where organization_id is null;
    update public.post_approval_tokens    set organization_id = v_org where organization_id is null;
    update public.ideas                   set organization_id = v_org where organization_id is null;
    update public.idea_tags               set organization_id = v_org where organization_id is null;
    update public.post_templates          set organization_id = v_org where organization_id is null;
    update public.tags                    set organization_id = v_org where organization_id is null;
    update public.notifications           set organization_id = v_org where organization_id is null;
    update public.alerts                  set organization_id = v_org where organization_id is null;
    update public.key_dates set organization_id = v_org where organization_id is null and scope = 'client';

    insert into public.org_settings (organization_id, key, value)
    select v_org, s.key, s.value
    from public.app_settings s
    where s.key in ('account', 'workflow', 'onboarding_template')
    on conflict (organization_id, key) do nothing;

    update public.organizations o
    set owner_id = (
      select p.id from public.profiles p
      where p.organization_id = v_org and p.role = 'admin' and p.is_active
      order by p.created_at limit 1
    )
    where o.id = v_org;
  end if;
end $$;

-- Contacts portail : leur profil hérite de l'organisation de leur client.
update public.profiles p
set organization_id = c.organization_id
from public.client_contacts cc
join public.clients c on c.id = cc.client_id
where cc.auth_user_id = p.id
  and p.organization_id is null
  and c.organization_id is not null;

-- ════════════════════════════════════════════════════════════════════
--  7. NOT NULL (colonnes désormais toutes remplies)
-- ════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'clients','posts','social_accounts','client_contacts','editorial_guidelines',
    'onboarding_items','campaigns','client_pillars','client_contracts','client_credentials',
    'client_requests','client_request_comments','post_history','post_comments','post_media',
    'post_tags','post_approval_tokens','ideas','idea_tags','post_templates','tags','notifications'
  ] loop
    execute format(
      'alter table public.%I alter column organization_id set not null', t);
  end loop;
end $$;
-- alerts / key_dates : organization_id reste nullable (lignes plateforme globales).

-- ════════════════════════════════════════════════════════════════════
--  8. Policies RLS RESTRICTIVE : organization_id = auth_org()
-- ════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'clients','posts','social_accounts','client_contacts','editorial_guidelines',
    'onboarding_items','campaigns','client_pillars','client_contracts','client_credentials',
    'client_requests','client_request_comments','post_history','post_comments','post_media',
    'post_tags','post_approval_tokens','ideas','idea_tags','post_templates','tags','notifications'
  ] loop
    execute format('drop policy if exists org_isolation on public.%I', t);
    execute format(
      'create policy org_isolation on public.%I as restrictive for all to authenticated '
      || 'using (organization_id = public.auth_org()) '
      || 'with check (organization_id = public.auth_org())', t);
  end loop;
end $$;

-- alerts / key_dates : autorisent aussi les lignes plateforme (organization_id null).
drop policy if exists org_isolation on public.alerts;
create policy org_isolation on public.alerts as restrictive for all to authenticated
  using (organization_id is null or organization_id = public.auth_org())
  with check (organization_id is null or organization_id = public.auth_org());

drop policy if exists org_isolation on public.key_dates;
create policy org_isolation on public.key_dates as restrictive for all to authenticated
  using (organization_id is null or organization_id = public.auth_org())
  with check (organization_id = public.auth_org());  -- pas de création de marronnier plateforme

-- user_clients : les deux extrémités (profil + client) doivent être dans l'org de l'appelant.
drop policy if exists org_isolation on public.user_clients;
create policy org_isolation on public.user_clients as restrictive for all to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = user_clients.profile_id and p.organization_id = public.auth_org())
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = user_clients.profile_id and p.organization_id = public.auth_org())
    and exists (select 1 from public.clients c
               where c.id = user_clients.client_id and c.organization_id = public.auth_org())
  );

-- profiles : on ne voit que les profils de sa propre organisation (en plus des
-- règles existantes self / admin). Le support plateforme passe par le service_role.
drop policy if exists org_isolation on public.profiles;
create policy org_isolation on public.profiles as restrictive for all to authenticated
  using (
    organization_id = public.auth_org()
    or id = auth.uid()                       -- son propre profil (org encore nulle à l'inscription)
  )
  with check (
    organization_id = public.auth_org()
    or id = auth.uid()
  );

-- ════════════════════════════════════════════════════════════════════
--  9. organizations : RLS applicative
-- ════════════════════════════════════════════════════════════════════
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.auth_org());

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (id = public.auth_org() and public.auth_role() = 'admin')
  with check (id = public.auth_org() and public.auth_role() = 'admin');

-- ════════════════════════════════════════════════════════════════════
-- 10. tags : unicité par organisation
-- ════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_constraint
             where conrelid = 'public.tags'::regclass and conname = 'tags_name_key') then
    alter table public.tags drop constraint tags_name_key;
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.tags'::regclass and conname = 'tags_org_name_key') then
    alter table public.tags add constraint tags_org_name_key unique (organization_id, name);
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════
-- 11. Fonctions existantes : périmètre organisation
-- ════════════════════════════════════════════════════════════════════

-- has_client_access : le client doit appartenir à l'organisation de l'appelant.
create or replace function public.has_client_access(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.auth_is_active()
    and exists (
      select 1 from public.clients c
      where c.id = cid and c.organization_id = public.auth_org()
    )
    and (
      public.auth_role() in ('lead', 'admin')
      or exists (
        select 1 from public.user_clients uc
        where uc.profile_id = auth.uid() and uc.client_id = cid
      )
    )
$$;

-- workflow_skips_internal : lit org_settings de l'organisation de l'appelant.
create or replace function public.workflow_skips_internal()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value ->> 'skip_internal_review')::boolean
     from public.org_settings where key = 'workflow' and organization_id = public.auth_org()),
    false
  )
$$;

-- seed_onboarding_for_client : modèle par organisation (+ repli si absent).
create or replace function public.seed_onboarding_for_client()
returns trigger language plpgsql security definer set search_path = public as $$
declare tpl jsonb; item text; i int := 0;
begin
  select value into tpl from public.org_settings
  where key = 'onboarding_template' and organization_id = new.organization_id;

  if tpl is null then
    tpl := jsonb_build_array(
      'Récupérer les accès aux comptes sociaux',
      'Valider la charte éditoriale',
      'Définir la fréquence de publication',
      'Lister les contacts de validation',
      'Caler la première réunion de brief',
      'Créer le premier mois de contenu',
      'Faire valider le premier lot de posts'
    );
  end if;

  for item in select jsonb_array_elements_text(tpl) loop
    insert into public.onboarding_items (client_id, label, position) values (new.id, item, i);
    i := i + 1;
  end loop;
  return new;
end $$;

-- key_dates_for_client : ne renvoie que les marronniers plateforme + ceux de
-- l'organisation du client.
create or replace function public.key_dates_for_client(p_client_id uuid)
returns setof public.key_dates language sql stable security definer set search_path = public as $$
  select k.*
  from public.key_dates k
  left join public.clients c on c.id = p_client_id
  where (k.organization_id is null or k.organization_id = c.organization_id)
    and (
      k.scope = 'global'
      or (k.scope = 'sector' and k.sector is not distinct from c.sector)
      or (k.scope = 'client' and k.client_id = p_client_id)
    )
$$;

-- auto_publish_due : le drapeau auto_publish est lu par organisation.
create or replace function public.auto_publish_due()
returns public.job_runs language plpgsql security definer set search_path = public as $$
declare v_run public.job_runs; v_count int := 0;
begin
  insert into public.job_runs (job_name) values ('auto_publish') returning * into v_run;

  update public.posts p
    set status = 'published'
  where p.status = 'scheduled'
    and p.deleted_at is null
    and p.scheduled_at <= now()
    and exists (
      select 1 from public.org_settings s
      where s.organization_id = p.organization_id
        and s.key = 'account'
        and coalesce((s.value ->> 'auto_publish')::boolean, false)
    );
  get diagnostics v_count = row_count;

  update public.job_runs
    set finished_at = now(), ok = true,
        stats = jsonb_build_object('published', v_count)
    where id = v_run.id returning * into v_run;
  return v_run;
end $$;

-- ════════════════════════════════════════════════════════════════════
insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 42, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
