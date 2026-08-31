import { getSupabase } from '@/lib/supabase';
import { EMPTY_CONTRACT, toClientContract, type ClientContract } from '@/shared/types';

/** Grandes lignes de la prestation, ou un contrat vide si jamais renseigné. */
export async function getClientContract(clientId: string): Promise<ClientContract> {
  const { data, error } = await getSupabase()
    .from('client_contracts')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data ? toClientContract(data) : EMPTY_CONTRACT(clientId);
}

export type ClientContractInput = Pick<
  ClientContract,
  'scope' | 'cadence' | 'channels' | 'startDate' | 'notes'
>;

export async function saveClientContract(
  clientId: string,
  input: ClientContractInput,
): Promise<ClientContract> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('client_contracts')
    .upsert(
      {
        client_id: clientId,
        scope: input.scope,
        cadence: input.cadence,
        channels: input.channels,
        start_date: input.startDate || null,
        notes: input.notes,
        updated_by: userRes.user?.id ?? null,
      },
      { onConflict: 'client_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return toClientContract(data);
}
