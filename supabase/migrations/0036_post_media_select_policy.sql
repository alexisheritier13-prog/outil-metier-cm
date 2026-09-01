-- 0036 — policy SELECT sur les objets du bucket `post-media`.
--
-- Le bucket est public (lecture HTTP anonyme OK), mais l'API Storage `.copy()`
-- vérifie une policy SELECT sur `storage.objects` pour la source. Sans elle,
-- « réutiliser un visuel de la bibliothèque » échoue avec « Object not found ».
-- Lecture large assumée : le bucket est déjà public.

drop policy if exists "post-media select" on storage.objects;
create policy "post-media select" on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'post-media');

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 36, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
