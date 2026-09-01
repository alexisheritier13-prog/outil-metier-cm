-- 0045 — invitations « lien seul » : le testeur ouvre le lien, choisit lui-même
-- e-mail + mot de passe, et crée son agence. Le jeton est l'unique clé (usage unique).
--
--   • `create_org_invitation(org_name, email?, full_name?)` : e-mail devient
--     OPTIONNEL. Renvoie la ligne (dont le jeton).
--   • `accept_org_invitation` : ne vérifie l'e-mail que si l'invitation en portait un.
--   • `platform_list_organizations()` / `platform_list_invitations()` : pour l'écran
--     « Admin plateforme » (réservé aux platform_admins).

-- ─────────────────────────  create_org_invitation (e-mail optionnel)  ─────────────────────────
drop function if exists public.create_org_invitation(text, text, text);

create or replace function public.create_org_invitation(
  p_org_name text,
  p_email text default null,
  p_full_name text default ''
) returns public.org_invitations
language plpgsql security definer set search_path = public as $$
declare v_inv public.org_invitations;
begin
  if not public.is_platform_admin() then
    raise exception 'réservé à un administrateur plateforme' using errcode = '42501';
  end if;
  if coalesce(btrim(p_org_name), '') = '' then
    raise exception 'nom d''agence obligatoire';
  end if;

  insert into public.org_invitations (email, org_name, full_name, invited_by)
  values (
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    btrim(p_org_name),
    coalesce(btrim(p_full_name), ''),
    auth.uid()
  )
  returning * into v_inv;
  return v_inv;
end $$;

grant execute on function public.create_org_invitation(text, text, text) to authenticated;

-- `org_invitations.email` peut désormais être null.
alter table public.org_invitations alter column email drop not null;

-- ─────────────────────────  accept_org_invitation (contrôle e-mail conditionnel)  ─────────────────────────
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

  -- e-mail : contrôlé seulement si l'invitation en portait un (invitation nominative)
  if v_inv.email is not null and v_email <> '' and lower(v_inv.email) <> v_email then
    raise exception 'cette invitation ne correspond pas à votre e-mail' using errcode = '42501';
  end if;

  if (select organization_id from public.profiles where id = v_uid) is not null then
    raise exception 'ce compte est déjà rattaché à une organisation' using errcode = '42501';
  end if;

  v_name := coalesce(nullif(btrim(p_org_name), ''), v_inv.org_name);

  insert into public.organizations (name, plan, owner_id)
  values (v_name, 'beta', v_uid)
  returning id into v_org;

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

-- ─────────────────────────  Écran « Admin plateforme »  ─────────────────────────
create or replace function public.platform_list_organizations()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_platform_admin() then coalesce(
    (select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'plan', o.plan,
        'createdAt', o.created_at,
        'members', (select count(*) from public.profiles p where p.organization_id = o.id),
        'clients', (select count(*) from public.clients c where c.organization_id = o.id and c.deleted_at is null)
      ) order by o.created_at desc)
     from public.organizations o),
    '[]'::jsonb)
  end
$$;

create or replace function public.platform_list_invitations()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_platform_admin() then coalesce(
    (select jsonb_agg(jsonb_build_object(
        'token', i.token,
        'orgName', i.org_name,
        'email', i.email,
        'createdAt', i.created_at,
        'expiresAt', i.expires_at,
        'expired', i.expires_at <= now(),
        'accepted', i.accepted_at is not null
      ) order by i.created_at desc)
     from public.org_invitations i),
    '[]'::jsonb)
  end
$$;

grant execute on function public.platform_list_organizations(), public.platform_list_invitations()
  to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 45, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
