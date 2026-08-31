import { getSupabase } from '@/lib/supabase';
import { toClientCredential, type ClientCredential } from '@/shared/types';

/**
 * Codes de connexion des comptes d'un client. Accès interne uniquement (RLS
 * `has_client_access`) ; jamais exposé au portail client.
 */
export async function listClientCredentials(clientId: string): Promise<ClientCredential[]> {
  const { data, error } = await getSupabase()
    .from('client_credentials')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order')
    .order('created_at');
  if (error) throw error;
  return data.map(toClientCredential);
}

export type ClientCredentialInput = Pick<
  ClientCredential,
  'label' | 'login' | 'secret' | 'url' | 'notes'
>;

export async function addClientCredential(
  clientId: string,
  input: ClientCredentialInput,
): Promise<ClientCredential> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('client_credentials')
    .insert({ client_id: clientId, ...toRow(input), updated_by: userRes.user?.id ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return toClientCredential(data);
}

export async function updateClientCredential(
  id: string,
  input: ClientCredentialInput,
): Promise<ClientCredential> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('client_credentials')
    .update({ ...toRow(input), updated_by: userRes.user?.id ?? null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toClientCredential(data);
}

export async function deleteClientCredential(id: string): Promise<void> {
  const { error } = await getSupabase().from('client_credentials').delete().eq('id', id);
  if (error) throw error;
}

function toRow(input: ClientCredentialInput) {
  return {
    label: input.label.trim(),
    login: input.login.trim(),
    secret: input.secret,
    url: input.url.trim(),
    notes: input.notes.trim(),
  };
}
