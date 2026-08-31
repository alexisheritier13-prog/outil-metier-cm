import { getSupabase } from '@/lib/supabase';
import { toAlert, type Alert, type AlertSeverity, type AlertStatus, type AlertType } from '@/shared/types';

/**
 * Alertes in-app (Stories 8.1 + 8.2). La RLS filtre par périmètre / rôle. La génération
 * (`generate_alerts`) tourne côté serveur (pg_cron, Story 8.4) ; le Lead/Admin peut la
 * déclencher via `trigger_generate_alerts`.
 */

export interface AlertFilters {
  types?: AlertType[];
  clientId?: string;
  severities?: AlertSeverity[];
  includeResolved?: boolean;
}

export async function listAlerts(filters: AlertFilters = {}): Promise<Alert[]> {
  let q = getSupabase().from('alerts').select('*').order('created_at', { ascending: false });
  if (!filters.includeResolved) q = q.neq('status', 'dismissed');
  if (filters.types?.length) q = q.in('type', filters.types);
  if (filters.clientId) q = q.eq('client_id', filters.clientId);
  if (filters.severities?.length) q = q.in('severity', filters.severities);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(toAlert);
}

export async function countNewAlerts(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');
  if (error) throw error;
  return count ?? 0;
}

export async function setAlertStatus(id: string, status: AlertStatus): Promise<void> {
  const { error } = await getSupabase().from('alerts').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Lance le moteur de génération maintenant (Lead / Admin). */
export async function runGenerateAlerts(): Promise<{ created: number; dismissed: number }> {
  const { data, error } = await getSupabase().rpc('trigger_generate_alerts');
  if (error) throw error;
  const stats = (data as { stats?: { created?: number; dismissed?: number } } | null)?.stats ?? {};
  return { created: stats.created ?? 0, dismissed: stats.dismissed ?? 0 };
}
