import { getSupabase } from '@/lib/supabase';
import { toClient, toClientOverview, type Client, type ClientOverview } from '@/shared/types';

export interface ClientInput {
  name: string;
  logoUrl: string | null;
  sector: string | null;
}

/** Clients visibles par l'utilisateur (RLS). `includeArchived` inclut les archivés. */
export async function listClients(includeArchived = false): Promise<Client[]> {
  let q = getSupabase().from('clients').select('*').is('deleted_at', null).order('name');
  if (!includeArchived) q = q.eq('is_archived', false);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(toClient);
}

/** Liste enrichie d'indicateurs (avancement onboarding, dernière activité…). */
export async function listClientOverview(includeArchived = false): Promise<ClientOverview[]> {
  let q = getSupabase().from('client_overview').select('*').order('name');
  if (!includeArchived) q = q.eq('is_archived', false);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(toClientOverview);
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await getSupabase()
    .from('clients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data ? toClient(data) : null;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data, error } = await getSupabase()
    .from('clients')
    .insert({ name: input.name, logo_url: input.logoUrl, sector: input.sector })
    .select('*')
    .single();
  if (error) throw error;
  return toClient(data);
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await getSupabase()
    .from('clients')
    .update({ name: input.name, logo_url: input.logoUrl, sector: input.sector })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toClient(data);
}

export async function setClientArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('clients')
    .update({ is_archived: archived, archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}
