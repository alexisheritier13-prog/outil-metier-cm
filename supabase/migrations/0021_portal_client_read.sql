-- 0021 — espace client : un contact lit la (ou les) fiche(s) de son/ses client(s).
--
-- Jusqu'ici `clients_select` était réservé aux rôles internes (has_client_access).
-- Les posts sont déjà visibles au contact depuis `client_review` (migration 0016) ;
-- il lui manque juste l'accès en lecture à sa fiche client (nom, logo) — même archivée
-- (le compte client reste actif, cf. Story 6.4).

drop policy if exists clients_select_contact on public.clients;
create policy clients_select_contact on public.clients
  for select to authenticated
  using (
    deleted_at is null
    and id in (select public.contact_client_ids())
  );

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 21, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
