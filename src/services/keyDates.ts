import { getSupabase } from '@/lib/supabase';
import { toKeyDate, type KeyDate, type KeyDateScope, type Post, toPost } from '@/shared/types';
import type { Network } from '@/shared/constants/networks';
import { keyDateOccurrences } from '@/app/posts/keyDateEvents';

/** Calendrier des marronniers (Story 7.3). RLS : global + sector visibles de tout
 *  interne actif ; client suit l'accès. */

export async function listKeyDates(): Promise<KeyDate[]> {
  const { data, error } = await getSupabase()
    .from('key_dates')
    .select('*')
    .order('event_date');
  if (error) throw error;
  return data.map(toKeyDate);
}

/**
 * Marronniers du mois courant (parmi ceux visibles de l'utilisateur) qui n'ont
 * encore aucun post rattaché (`posts.origin_type = 'key_date'`).
 */
export async function countUnattachedKeyDatesThisMonth(): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const all = await listKeyDates();
  const occurrences = keyDateOccurrences(all, [year]).filter((o) => {
    const [, m] = o.date.split('-');
    return Number(m) - 1 === month;
  });
  if (occurrences.length === 0) return 0;

  // Une occurrence récurrente a un id `<key_date.id>:<année>` ; on retrouve l'id réel.
  const baseId = (occurrenceId: string) => occurrenceId.split(':')[0] ?? occurrenceId;
  const baseIds = [...new Set(occurrences.map((o) => baseId(o.id)))];

  const { data, error } = await getSupabase()
    .from('posts')
    .select('origin_id')
    .eq('origin_type', 'key_date')
    .is('deleted_at', null)
    .in('origin_id', baseIds);
  if (error) throw error;

  const attached = new Set((data ?? []).map((r) => r.origin_id as string));
  return occurrences.filter((o) => !attached.has(baseId(o.id))).length;
}

/** Marronniers applicables à un client (globaux + son secteur + les siens). */
export async function listKeyDatesForClient(clientId: string): Promise<KeyDate[]> {
  const { data, error } = await getSupabase().rpc('key_dates_for_client', {
    p_client_id: clientId,
  });
  if (error) throw error;
  return (data as unknown[]).map((r) => toKeyDate(r as never));
}

export interface KeyDateInput {
  name: string;
  eventDate: string;
  recurringAnnually: boolean;
  scope: KeyDateScope;
  sector: string | null;
  clientId: string | null;
  description: string;
}

export async function createKeyDate(input: KeyDateInput): Promise<KeyDate> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('key_dates')
    .insert({
      name: input.name.trim(),
      event_date: input.eventDate,
      recurring_annually: input.recurringAnnually,
      scope: input.scope,
      sector: input.scope === 'sector' ? input.sector : null,
      client_id: input.scope === 'client' ? input.clientId : null,
      description: input.description.trim(),
      created_by: userRes.user?.id ?? '',
    })
    .select('*')
    .single();
  if (error) throw error;
  return toKeyDate(data);
}

export async function updateKeyDate(id: string, input: KeyDateInput): Promise<KeyDate> {
  const { data, error } = await getSupabase()
    .from('key_dates')
    .update({
      name: input.name.trim(),
      event_date: input.eventDate,
      recurring_annually: input.recurringAnnually,
      scope: input.scope,
      sector: input.scope === 'sector' ? input.sector : null,
      client_id: input.scope === 'client' ? input.clientId : null,
      description: input.description.trim(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toKeyDate(data);
}

export async function deleteKeyDate(id: string): Promise<void> {
  const { error } = await getSupabase().from('key_dates').delete().eq('id', id);
  if (error) throw error;
}

/** Crée un post brouillon pré-daté à partir d'un marronnier (RPC). */
export async function keyDateToPost(
  keyDateId: string,
  clientId: string,
  opts: { year?: number; network?: Network } = {},
): Promise<Post> {
  const { data, error } = await getSupabase().rpc('key_date_to_post', {
    p_key_date_id: keyDateId,
    p_client_id: clientId,
    p_year: opts.year ?? undefined,
    p_network: opts.network ?? undefined,
  });
  if (error) throw error;
  return toPost(data as never);
}
