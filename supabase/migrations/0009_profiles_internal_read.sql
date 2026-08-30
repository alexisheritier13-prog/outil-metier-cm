-- 0009_profiles_internal_read — les rôles internes peuvent lire les profils internes
--
-- Nécessaire dès l'Epic 3 : afficher/choisir le rédacteur d'un post, la file « À valider »
-- avec l'auteur, etc. Un `cm` ne voyait jusqu'ici que son propre profil.

drop policy if exists profiles_select_internal on public.profiles;
create policy profiles_select_internal on public.profiles
  for select to authenticated
  using (
    public.auth_is_active()
    and public.auth_role() in ('cm', 'lead', 'admin')
    and role in ('cm', 'lead', 'admin')
  );

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 9, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
