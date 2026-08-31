-- 0020 — journal d'activité par client (Story 5.5) + câblage des indicateurs
-- pending_internal / pending_client / last_activity_at de client_overview
-- (placeholders depuis la Story 2.6, la table posts existe maintenant).

-- ─────────────────────────  client_activity  ─────────────────────────
-- Agrège les entrées post_history des posts d'un client. `security_invoker = on` :
-- la RLS de post_history (has_client_access) filtre déjà — un `cm` ne voit que ses
-- clients, un `lead`/`admin` voit tout.
create or replace view public.client_activity
  with (security_invoker = on) as
  select
    p.client_id,
    h.id            as history_id,
    h.post_id,
    p.caption       as post_caption,
    p.network,
    p.scheduled_at,
    h.action,
    h.field,
    h.old_value,
    h.new_value,
    h.actor_id,
    coalesce(
      nullif(btrim(pr.full_name), ''),
      nullif(btrim(cc.full_name), ''),
      nullif(pr.email, ''),
      cc.email
    )               as actor_name,
    h.created_at
  from public.post_history h
  join public.posts p on p.id = h.post_id
  left join public.profiles pr on pr.id = h.actor_id
  left join public.client_contacts cc
    on cc.auth_user_id = h.actor_id and cc.client_id = p.client_id;

comment on view public.client_activity is
  'Journal d''activité des posts d''un client (Story 5.5). Filtrer par client_id.';

-- ─────────────────  client_overview : indicateurs réels  ─────────────────
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
    coalesce(op.done, 0)::int  as onboarding_done,
    coalesce(op.total, 0)::int as onboarding_total,
    coalesce(pc.pending_internal, 0)::int as pending_internal,
    coalesce(pc.pending_client, 0)::int   as pending_client,
    coalesce(pc.last_activity_at, c.updated_at) as last_activity_at
  from public.clients c
  left join public.client_onboarding_progress op on op.client_id = c.id
  left join lateral (
    select
      count(*) filter (where status = 'internal_review') as pending_internal,
      count(*) filter (where status = 'client_review')   as pending_client,
      max(updated_at) as last_activity_at
    from public.posts
    where client_id = c.id and deleted_at is null
  ) pc on true
  where c.deleted_at is null;

comment on view public.client_overview is
  'Liste clients + indicateurs (pending_* et last_activity_at calculés depuis posts).';

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 20, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
