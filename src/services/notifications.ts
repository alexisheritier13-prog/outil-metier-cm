import { getSupabase } from '@/lib/supabase';
import { toNotification, type AppNotification } from '@/shared/types';

/**
 * Notifications in-app. La table et l'émission (via RPC SECURITY DEFINER) sont posées
 * en Story 5.1 ; la page dédiée, le badge de navigation et les seuils = Epic 8.
 * Ici : lecture de ses propres notifications et marquage « lu ».
 */

export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(toNotification);
}

export async function unreadNotificationCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}
