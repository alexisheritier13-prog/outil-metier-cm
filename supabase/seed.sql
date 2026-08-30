-- seed.sql — données de référence appliquées par `supabase db reset`.
-- (Réseaux + specs, modèle d'onboarding par défaut, seuils d'alertes : ajoutés au fil des stories.)

insert into public.app_meta (key, value)
values ('seeded', jsonb_build_object('at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
