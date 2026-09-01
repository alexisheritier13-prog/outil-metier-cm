-- 0043_org_invitations — inscription sur invitation (beta multi-tenant).
--
-- Modèle beta : pas d'inscription libre. Nous (super-admin plateforme) émettons
-- une invitation par agence. En l'acceptant, l'invité crée son organisation et
-- devient son premier Directeur.
--
--   • `org_invitations` : e-mail + nom d'agence proposé + jeton.
--   • `accept_org_invitation(token, full_name, org_name)` : crée l'organisation,
--     ses réglages par défaut, et rattache le profil de l'appelant (rôle admin,
--     actif). SECURITY DEFINER, appelée par l'invité une fois connecté.
--   • `create_org_invitation(...)` : réservée aux platform_admins (l'Edge Function
--     `admin-users` l'appelle après avoir créé le compte auth + le lien d'accès).
--   • Les invitations d'équipe (CM, chef de projet) passent, elles, par
--     `admin-users` / `invite_contact` qui stampent déjà `organization_id`.

-- ─────────────────────────  Table  ─────────────────────────
create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  email citext not null,
  org_name text not null,
  full_name text not null default '',
  invited_by uuid references auth.users (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '21 days'),
  accepted_at timestamptz
);
comment on table public.org_invitations is 'Invitation à créer une organisation (émise par un platform_admin).';

create index if not exists org_invitations_email_idx on public.org_invitations (email);

alter table public.org_invitations enable row level security;
-- Aucune policy : création via SECURITY DEFINER (platform admin), acceptation via RPC.

-- ─────────────────────────  Création (platform admin)  ─────────────────────────
create or replace function public.create_org_invitation(
  p_email text,
  p_org_name text,
  p_full_name text default ''
) returns public.org_invitations
language plpgsql security definer set search_path = public as $$
declare v_inv public.org_invitations;
begin
  if not public.is_platform_admin() then
    raise exception 'réservé à un administrateur plateforme' using errcode = '42501';
  end if;
  if coalesce(btrim(p_email), '') = '' or coalesce(btrim(p_org_name), '') = '' then
    raise exception 'e-mail et nom d''agence obligatoires';
  end if;

  insert into public.org_invitations (email, org_name, full_name, invited_by)
  values (lower(btrim(p_email)), btrim(p_org_name), coalesce(btrim(p_full_name), ''), auth.uid())
  returning * into v_inv;
  return v_inv;
end $$;

grant execute on function public.create_org_invitation(text, text, text) to authenticated;

-- ─────────────────────────  Acceptation (l'invité connecté)  ─────────────────────────
create or replace function public.accept_org_invitation(
  p_token uuid,
  p_full_name text default null,
  p_org_name text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_inv   public.org_invitations;
  v_uid   uuid := auth.uid();
  v_email text := lower(coalesce(nullif(auth.jwt() ->> 'email', ''), ''));
  v_org   uuid;
  v_name  text;
begin
  if v_uid is null then
    raise exception 'connexion requise' using errcode = '42501';
  end if;

  select * into v_inv from public.org_invitations
  where token = p_token and accepted_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'invitation invalide ou expirée';
  end if;
  if v_email <> '' and lower(v_inv.email) <> v_email then
    raise exception 'cette invitation ne correspond pas à votre e-mail' using errcode = '42501';
  end if;
  if (select organization_id from public.profiles where id = v_uid) is not null then
    raise exception 'ce compte est déjà rattaché à une organisation' using errcode = '42501';
  end if;

  v_name := coalesce(nullif(btrim(p_org_name), ''), v_inv.org_name);

  insert into public.organizations (name, plan, owner_id)
  values (v_name, 'beta', v_uid)
  returning id into v_org;

  -- réglages par défaut de l'organisation
  insert into public.org_settings (organization_id, key, value) values
    (v_org, 'account', jsonb_build_object(
      'agency_name', v_name, 'logo_url', null, 'onboarded', false,
      'auto_publish', false, 'active_networks', null,
      'default_skip_client_review', false)),
    (v_org, 'workflow', jsonb_build_object('skip_internal_review', false)),
    (v_org, 'onboarding_template', jsonb_build_array(
      'Récupérer les accès aux comptes sociaux',
      'Valider la charte éditoriale',
      'Définir la fréquence de publication',
      'Lister les contacts de validation',
      'Caler la première réunion de brief',
      'Créer le premier mois de contenu',
      'Faire valider le premier lot de posts'))
  on conflict (organization_id, key) do nothing;

  update public.profiles set
    organization_id = v_org,
    role = 'admin',
    is_active = true,
    full_name = coalesce(nullif(btrim(p_full_name), ''), nullif(full_name, ''), v_inv.full_name)
  where id = v_uid;

  update public.org_invitations
  set accepted_at = now(), organization_id = v_org
  where id = v_inv.id;

  return jsonb_build_object('organizationId', v_org, 'organizationName', v_name);
end $$;

grant execute on function public.accept_org_invitation(uuid, text, text) to authenticated;

-- Lecture publique minimale d'une invitation par jeton (pour pré-remplir l'écran /rejoindre).
create or replace function public.org_invitation_by_token(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when i.id is null then null else jsonb_build_object(
    'email', i.email,
    'orgName', i.org_name,
    'fullName', i.full_name,
    'expired', i.expires_at <= now(),
    'accepted', i.accepted_at is not null
  ) end
  from (select 1) _
  left join public.org_invitations i on i.token = p_token
$$;

grant execute on function public.org_invitation_by_token(uuid) to anon, authenticated;

-- ─────────────────────────  Super-admin plateforme  ─────────────────────────
insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'alexis.heritier13@gmail.com'
on conflict do nothing;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 43, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
