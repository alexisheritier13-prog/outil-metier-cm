-- 0050 — exclut le jeu de démonstration des métriques de l'Admin plateforme.
-- Chaque agence reçoit un client « Studio Lumen (démo) » + 7 posts à la
-- création (0048) : sans ce filtre, une agence jamais touchée paraissait
-- « active » (7 posts, activité récente = l'instant du seed).

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
        'clients', (
          select count(*) from public.clients c
          where c.organization_id = o.id and c.deleted_at is null and not c.is_demo
        ),
        'posts', (
          select count(*) from public.posts po
          join public.clients c2 on c2.id = po.client_id
          where c2.organization_id = o.id and po.deleted_at is null and not c2.is_demo
        ),
        'lastActivityAt', coalesce(
          (select max(po.updated_at) from public.posts po
           join public.clients c2 on c2.id = po.client_id
           where c2.organization_id = o.id and not c2.is_demo),
          o.created_at
        )
      ) order by o.created_at desc)
     from public.organizations o),
    '[]'::jsonb)
  end
$$;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 50, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
