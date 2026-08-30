-- 0010_soft_delete_select_policy — corrige l'incompatibilité soft-delete / RLS
--
-- Problème : quand une policy SELECT contient `deleted_at IS NULL`, l'UPDATE qui pose
-- `deleted_at` échoue (« new row violates row-level security policy »), car PostgreSQL
-- applique la visibilité SELECT à la ligne mise à jour.
--
-- Solution : la RLS ne porte que sur l'isolation (client_id). Le filtrage `deleted_at`
-- (corbeille) est fait par les requêtes applicatives, et les règles de rôle pour
-- restaurer/purger seront dans des RPC dédiées (Story 3.7).

drop policy if exists posts_select_internal on public.posts;
create policy posts_select_internal on public.posts
  for select to authenticated
  using (public.has_client_access(client_id));

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (public.has_client_access(id));

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 10, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
