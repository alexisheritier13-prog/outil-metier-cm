-- 0049 — outils d'administration plateforme : contact du Directeur, activité,
-- révocation d'invitation, réinitialisation d'une agence. Fait à la main la
-- semaine dernière pour une agence coincée (compte hijacké par le bug
-- invite_contact, corrigé en 0048/migr front) ; ça mérite un bouton.

-- ─────────────────────  platform_list_organizations (enrichie)  ─────────────────────
create or replace function public.platform_list_organizations()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_platform_admin() then coalesce(
    (select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'plan', o.plan,
        'createdAt', o.created_at,
        'ownerName', (select p.full_name from public.profiles p where p.id = o.owner_id),
        'ownerEmail', (select p.email from public.profiles p where p.id = o.owner_id),
        'members', (select count(*) from public.profiles p where p.organization_id = o.id),
        'clients', (select count(*) from public.clients c where c.organization_id = o.id and c.deleted_at is null),
        'posts', (
          select count(*) from public.posts po
          join public.clients c2 on c2.id = po.client_id
          where c2.organization_id = o.id and po.deleted_at is null
        ),
        'lastActivityAt', coalesce(
          (select max(po.updated_at) from public.posts po
           join public.clients c2 on c2.id = po.client_id
           where c2.organization_id = o.id),
          o.created_at
        )
      ) order by o.created_at desc)
     from public.organizations o),
    '[]'::jsonb)
  end
$$;

-- ─────────────────────  platform_revoke_invitation  ─────────────────────
-- Retire un lien d'invitation pas encore accepté (typo dans l'e-mail, plus
-- besoin, etc.). N'agit jamais sur une invitation déjà acceptée.
create or replace function public.platform_revoke_invitation(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'réservé à l''administrateur plateforme' using errcode = '42501';
  end if;
  delete from public.org_invitations where token = p_token and accepted_at is null;
end $$;

grant execute on function public.platform_revoke_invitation(uuid) to authenticated;

-- ─────────────────────  platform_reset_organization  ─────────────────────
-- Supprime tout le contenu d'une agence (clients, posts, campagnes…) et
-- détache ses membres, qui repassent à l'état « jamais rien fait » (comme un
-- compte tout juste créé, prêt à être ré-invité). Les comptes de connexion ne
-- sont pas supprimés.
create or replace function public.platform_reset_organization(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'réservé à l''administrateur plateforme' using errcode = '42501';
  end if;
  if p_org is null then return; end if;

  -- posts.client_id est on delete restrict → on retire les posts avant les clients.
  delete from public.posts
  where client_id in (select id from public.clients where organization_id = p_org);

  update public.profiles
  set organization_id = null, role = 'cm', is_active = false
  where organization_id = p_org;

  delete from public.organizations where id = p_org;
end $$;

grant execute on function public.platform_reset_organization(uuid) to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 49, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
