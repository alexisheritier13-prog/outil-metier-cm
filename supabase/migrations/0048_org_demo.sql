-- 0048 — jeu de démonstration par organisation.
-- Chaque nouvelle agence reçoit un client « Studio Lumen (démo) » pré-rempli
-- (rubriques, campagne, posts à tous les stades) pour explorer l'outil sans
-- partir d'une page blanche. Un bouton permet de tout supprimer d'un coup.

alter table public.clients add column if not exists is_demo boolean not null default false;
comment on column public.clients.is_demo is
  'Jeu de démonstration : client semé à la création de l''organisation, supprimable via delete_org_demo().';

-- Marque les clients de démo déjà en base (prod : « Studio Lumen (démo) »).
update public.clients set is_demo = true
where is_demo = false and (name ilike '%(démo)%' or name ilike '%(demo)%');

-- ─────────────────────  seed_org_demo(org, author)  ─────────────────────
create or replace function public.seed_org_demo(p_org uuid, p_author uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_client   uuid;
  v_campaign uuid;
  v_produit  uuid;
  v_coulisse uuid;
  v_inspi    uuid;
begin
  if p_org is null or p_author is null then return; end if;
  -- déjà un jeu de démo pour cette organisation → ne rien faire
  if exists (select 1 from public.clients where organization_id = p_org and is_demo) then
    return;
  end if;

  insert into public.clients (organization_id, name, sector, is_demo)
  values (p_org, 'Studio Lumen (démo)', 'Décoration', true)
  returning id into v_client;

  insert into public.client_pillars (client_id, label, target_pct, sort_order) values
    (v_client, 'Produit',     40, 0),
    (v_client, 'Coulisses',   35, 1),
    (v_client, 'Inspiration', 25, 2);
  select id into v_produit  from public.client_pillars where client_id = v_client and label = 'Produit';
  select id into v_coulisse from public.client_pillars where client_id = v_client and label = 'Coulisses';
  select id into v_inspi    from public.client_pillars where client_id = v_client and label = 'Inspiration';

  insert into public.campaigns (client_id, name, starts_on, ends_on, description)
  values (
    v_client, 'Lancement de printemps',
    (now() - interval '7 days')::date, (now() + interval '21 days')::date,
    'Fil rouge du trimestre : nouvelle collection et prises de parole associées.'
  )
  returning id into v_campaign;

  insert into public.posts
    (client_id, network, scheduled_at, caption, status, author_id, campaign_id, pillar_id)
  values
    (v_client, 'instagram', now() - interval '6 days', E'Nouvelle collection : la lampe « Halo » en laiton brossé. Disponible en boutique et en ligne.', 'published', p_author, v_campaign, v_produit),
    (v_client, 'linkedin',  now() - interval '3 days', E'Dans l''atelier cette semaine : montage des étagères modulaires en chêne massif. Le détail qui change tout, c''est l''assemblage sans vis apparente.', 'published', p_author, null, v_coulisse),
    (v_client, 'instagram', now() + interval '1 day',  E'Avant / après : un salon repensé autour d''un canapé lin et de teintes terracotta. Lequel préférez-vous ?', 'scheduled', p_author, v_campaign, v_produit),
    (v_client, 'facebook',  now() + interval '3 days',  E'3 façons d''éclairer une pièce sans plafonnier. On vous montre notre méthode.', 'approved', p_author, null, v_inspi),
    (v_client, 'instagram', now() + interval '5 days',  E'Portrait : rencontre avec l''ébéniste qui façonne nos pièces sur mesure.', 'client_review', p_author, null, v_coulisse),
    (v_client, 'linkedin',  now() + interval '8 days',  E'Étude de cas : réaménagement complet d''un espace d''accueil de 40 m². Budget, délais, choix des matériaux.', 'internal_review', p_author, null, null),
    (v_client, 'instagram', now() + interval '12 days', E'Idée déco : le coin lecture près de la fenêtre. Fauteuil enveloppant, liseuse orientable, plaid en grosse maille.', 'draft', p_author, v_campaign, v_inspi);
end $$;

grant execute on function public.seed_org_demo(uuid, uuid) to authenticated;

-- ─────────────────────  delete_org_demo()  ─────────────────────
-- Supprime le(s) client(s) de démo de l'organisation de l'appelant (Directeur).
create or replace function public.delete_org_demo()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.auth_org();
  v_n   integer;
begin
  if v_org is null then
    raise exception 'aucune organisation' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and organization_id = v_org and role = 'admin'
  ) then
    raise exception 'réservé au Directeur' using errcode = '42501';
  end if;

  -- posts.client_id est on delete restrict → on retire les posts d'abord.
  delete from public.posts
  where client_id in (select id from public.clients where organization_id = v_org and is_demo);

  with d as (
    delete from public.clients
    where organization_id = v_org and is_demo
    returning 1
  )
  select count(*) into v_n from d;

  return v_n;
end $$;

grant execute on function public.delete_org_demo() to authenticated;

-- ─────────────────────  accept_org_invitation → sème la démo  ─────────────────────
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

  -- jeu de démonstration (ne bloque pas l'inscription si ça échoue)
  begin
    perform public.seed_org_demo(v_org, v_uid);
  exception when others then
    null;
  end;

  return jsonb_build_object('organizationId', v_org, 'organizationName', v_name);
end $$;

grant execute on function public.accept_org_invitation(uuid, text, text) to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 48, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
