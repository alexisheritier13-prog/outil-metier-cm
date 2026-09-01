import { getSupabase } from '@/lib/supabase';
import { toClientPillar, type ClientPillar } from '@/shared/types';

export async function listClientPillars(clientId: string): Promise<ClientPillar[]> {
  const { data, error } = await getSupabase()
    .from('client_pillars')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order');
  if (error) throw error;
  return data.map(toClientPillar);
}

export interface PillarInput {
  id?: string;
  label: string;
  targetPct: number;
}

/** Remplace la liste des rubriques d'un client (supprime celles retirées). */
export async function saveClientPillars(
  clientId: string,
  pillars: PillarInput[],
): Promise<ClientPillar[]> {
  const sb = getSupabase();
  const kept = pillars.filter((p) => p.label.trim());

  const existing = await sb.from('client_pillars').select('id').eq('client_id', clientId);
  if (existing.error) throw existing.error;
  const keepIds = new Set(kept.filter((p) => p.id).map((p) => p.id));
  const toDelete = (existing.data ?? []).map((r) => r.id).filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    const del = await sb.from('client_pillars').delete().in('id', toDelete);
    if (del.error) throw del.error;
  }

  const rows = kept.map((p, i) => ({
    id: p.id ?? crypto.randomUUID(),
    client_id: clientId,
    label: p.label.trim(),
    target_pct: Math.max(0, Math.min(100, Math.round(p.targetPct))),
    sort_order: i,
  }));
  if (rows.length > 0) {
    const up = await sb.from('client_pillars').upsert(rows, { onConflict: 'id' });
    if (up.error) throw up.error;
  }

  return listClientPillars(clientId);
}
