-- 0027 — valeurs par défaut des seuils d'alertes (Story 8.3).
--
-- Les seuils vivent dans app_settings clé `alert_thresholds` (lecture : tout interne
-- actif, écriture : Admin — policies de 0006). `generate_alerts()` les lit déjà via
-- `_thr(key, default)` ; on matérialise la ligne pour que l'écran de réglage parte des
-- valeurs courantes.

insert into public.app_settings (key, value)
values (
  'alert_thresholds',
  jsonb_build_object(
    'validation_overdue_days', 3,
    'deadline_window_days', 3,
    'calendar_min_posts', 3,
    'calendar_window_days', 14,
    'keydate_window_days', 21,
    'client_inactive_window_days', 14
  )
)
on conflict (key) do nothing;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 27, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
