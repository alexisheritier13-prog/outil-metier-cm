import { getSupabase } from '@/lib/supabase';

/** Seuils du moteur d'alertes (Story 8.3). Stockés dans `app_settings.alert_thresholds`. */

export interface AlertThresholds {
  validation_overdue_days: number;
  deadline_window_days: number;
  calendar_min_posts: number;
  calendar_window_days: number;
  keydate_window_days: number;
  client_inactive_window_days: number;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  validation_overdue_days: 3,
  deadline_window_days: 3,
  calendar_min_posts: 3,
  calendar_window_days: 14,
  keydate_window_days: 21,
  client_inactive_window_days: 14,
};

export const THRESHOLD_FIELDS: {
  key: keyof AlertThresholds;
  label: string;
  hint: string;
  min: number;
  max: number;
}[] = [
  { key: 'validation_overdue_days', label: 'Validation en retard (jours)', hint: 'Alerte si un post attend une validation depuis plus de N jours.', min: 1, max: 30 },
  { key: 'deadline_window_days', label: 'Deadline proche (jours)', hint: 'Alerte si la date de publication est dans moins de N jours et le post pas validé.', min: 1, max: 30 },
  { key: 'calendar_min_posts', label: 'Posts minimum sur la fenêtre', hint: 'Alerte « trou de calendrier » sous ce nombre de posts planifiés.', min: 1, max: 30 },
  { key: 'calendar_window_days', label: 'Fenêtre du trou de calendrier (jours)', hint: 'Période à venir sur laquelle on compte les posts planifiés.', min: 3, max: 90 },
  { key: 'keydate_window_days', label: 'Fenêtre marronnier (jours)', hint: 'Alerte si un marronnier arrive dans moins de N jours sans post prévu.', min: 3, max: 90 },
  { key: 'client_inactive_window_days', label: 'Client inactif (jours)', hint: 'Alerte (Lead/Admin) si un client n’a aucun post prévu sur N jours.', min: 3, max: 60 },
];

export async function getAlertThresholds(): Promise<AlertThresholds> {
  const { data, error } = await getSupabase()
    .from('app_settings')
    .select('value')
    .eq('key', 'alert_thresholds')
    .maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_THRESHOLDS, ...((data?.value as Partial<AlertThresholds>) ?? {}) };
}

export async function saveAlertThresholds(values: AlertThresholds): Promise<void> {
  const { error } = await getSupabase()
    .from('app_settings')
    .upsert(
      { key: 'alert_thresholds', value: { ...values } as Record<string, number> },
      { onConflict: 'key' },
    );
  if (error) throw error;
}
