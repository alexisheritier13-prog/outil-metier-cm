import { getSupabase } from '@/lib/supabase';
import { toClientActivityEntry, type ClientActivityEntry } from '@/shared/types';

/**
 * Journal d'activité d'un client (Story 5.5) — vue `client_activity`, RLS via
 * `post_history` (`has_client_access`). Le filtrage par type d'action / période se fait
 * côté composant.
 */
export async function listClientActivity(
  clientId: string,
  opts: { from?: string | null; to?: string | null } = {},
): Promise<ClientActivityEntry[]> {
  let q = getSupabase()
    .from('client_activity')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (opts.from) q = q.gte('created_at', opts.from);
  if (opts.to) q = q.lte('created_at', opts.to);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(toClientActivityEntry);
}
