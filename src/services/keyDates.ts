import { getSupabase } from '@/lib/supabase';
import { toKeyDate, type KeyDate, type KeyDateScope, type Post, toPost } from '@/shared/types';
import type { Network } from '@/shared/constants/networks';

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
