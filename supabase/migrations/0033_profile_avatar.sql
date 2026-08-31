-- 0033 — photo de profil (URL) sur les profils.
-- La policy `profiles_update_self` (0002) autorise déjà chacun à modifier sa propre
-- ligne hors rôle/activation : aucune nouvelle policy nécessaire pour l'avatar.

alter table public.profiles add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'URL publique d''une photo de profil (facultative).';
