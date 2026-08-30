-- 0007_client_overview — vue d'ensemble des clients avec indicateurs (Story 2.6)
--
-- Les colonnes pending_internal / pending_client / last_activity_at sont des
-- placeholders (0 / updated_at) tant que la table `posts` n'existe pas (Epic 3).
-- Cette vue sera étendue à ce moment-là, sans changer son contrat côté front.

create or replace view public.client_overview
  with (security_invoker = on) as
  select
    c.id,
    c.name,
    c.logo_url,
    c.sector,
    c.is_archived,
    c.created_at,
    c.updated_at,
    coalesce(p.done, 0)::int as onboarding_done,
    coalesce(p.total, 0)::int as onboarding_total,
    0::int as pending_internal,
    0::int as pending_client,
    c.updated_at as last_activity_at
  from public.clients c
  left join public.client_onboarding_progress p on p.client_id = c.id
  where c.deleted_at is null;

comment on view public.client_overview is
  'Liste clients + indicateurs. pending_* et last_activity_at seront calculés depuis posts à l''Epic 3.';

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 7, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
