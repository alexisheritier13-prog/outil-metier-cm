-- 0047 — bucket `brand-assets` : logos clients / logo agence / photos de profil.
-- Ces images sont fournies par **upload** (plus de champ URL à coller). Les
-- colonnes qui les référencent (`clients.logo_url`, `profiles.avatar_url`,
-- `app_settings.account.agency_logo_url`) continuent de stocker une URL — ici
-- l'URL publique de l'objet uploadé. Aucun changement de schéma sur ces colonnes.
--
-- Bucket public (les logos et avatars sont destinés à être affichés partout, y
-- compris dans l'espace client). Chemins :
--   clients/<uuid>.<ext>   · logo d'un client
--   orgs/<uuid>.<ext>      · logo d'agence
--   avatars/<uuid>.<ext>   · photo de profil
-- Le 1er segment sert seulement à ranger ; la sécurité repose sur : bucket
-- réservé aux images, écriture réservée aux comptes authentifiés, remplacement /
-- suppression réservés au propriétaire de l'objet.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets', 'brand-assets', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture : bucket public (utile aussi pour d'éventuelles opérations client).
drop policy if exists "brand-assets select" on storage.objects;
create policy "brand-assets select" on storage.objects
  for select to public
  using (bucket_id = 'brand-assets');

-- Écriture : tout compte authentifié (agence). Les logos/avatars ne sont pas
-- sensibles ; l'isolation multi-tenant ne s'applique pas à une image publique.
drop policy if exists "brand-assets insert" on storage.objects;
create policy "brand-assets insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets');

-- Remplacement / suppression : uniquement l'auteur de l'objet.
drop policy if exists "brand-assets update" on storage.objects;
create policy "brand-assets update" on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-assets' and owner = auth.uid());

drop policy if exists "brand-assets delete" on storage.objects;
create policy "brand-assets delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and owner = auth.uid());

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 47, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
