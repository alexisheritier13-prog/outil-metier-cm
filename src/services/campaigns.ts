import { getSupabase } from '@/lib/supabase';
import { toCampaign, toCampaignOverview, type Campaign } from '@/shared/types';

export async function listCampaignOverview(): Promise<Campaign[]> {
  const { data, error } = await getSupabase()
    .from('campaign_overview')
    .select('*')
    .order('starts_on', { ascending: false });
  if (error) throw error;
  return data.map(toCampaignOverview);
}

export async function listCampaignsForClient(clientId: string): Promise<Campaign[]> {
  const { data, error } = await getSupabase()
    .from('campaigns')
    .select('*')
    .eq('client_id', clientId)
    .order('starts_on', { ascending: false });
  if (error) throw error;
  return data.map(toCampaign);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const { data, error } = await getSupabase()
    .from('campaign_overview')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toCampaignOverview(data) : null;
}

export interface CampaignInput {
  clientId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  description: string;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const { data, error } = await getSupabase()
    .from('campaigns')
    .insert({
      client_id: input.clientId,
      name: input.name,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      description: input.description,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toCampaign(data);
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<void> {
  const { error } = await getSupabase()
    .from('campaigns')
    .update({
      client_id: input.clientId,
      name: input.name,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      description: input.description,
    })
    .eq('id', id);
  if (error) throw error;
}
