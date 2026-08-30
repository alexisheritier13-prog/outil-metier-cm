import { getSupabase } from '@/lib/supabase';
import {
  toNetworkRef,
  toSocialAccount,
  type NetworkRef,
  type SocialAccount,
} from '@/shared/types';
import type { Network } from '@/shared/constants/networks';

/** Réseaux de référence (+ specs indicatives), triés. */
export async function listNetworks(): Promise<NetworkRef[]> {
  const { data, error } = await getSupabase().from('networks').select('*').order('position');
  if (error) throw error;
  return data.map(toNetworkRef);
}

export async function listSocialAccounts(clientId: string): Promise<SocialAccount[]> {
  const { data, error } = await getSupabase()
    .from('social_accounts')
    .select('*')
    .eq('client_id', clientId)
    .order('network');
  if (error) throw error;
  return data.map(toSocialAccount);
}

export async function addSocialAccount(
  clientId: string,
  network: Network,
  handle: string,
): Promise<SocialAccount> {
  const { data, error } = await getSupabase()
    .from('social_accounts')
    .insert({ client_id: clientId, network, handle: handle.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return toSocialAccount(data);
}

export async function updateSocialAccount(
  id: string,
  patch: { network?: Network; handle?: string },
): Promise<void> {
  const { error } = await getSupabase()
    .from('social_accounts')
    .update({ ...patch, handle: patch.handle?.trim() })
    .eq('id', id);
  if (error) throw error;
}

export async function removeSocialAccount(id: string): Promise<void> {
  const { error } = await getSupabase().from('social_accounts').delete().eq('id', id);
  if (error) throw error;
}
