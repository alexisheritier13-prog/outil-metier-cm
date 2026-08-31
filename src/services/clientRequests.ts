import { getSupabase } from '@/lib/supabase';
import {
  toClientRequest,
  toClientRequestComment,
  toPost,
  type ClientRequest,
  type ClientRequestComment,
  type ClientRequestStatus,
  type Post,
} from '@/shared/types';
import type { Network } from '@/shared/constants/networks';

/**
 * Demandes de contenu client → agence (Story 6.5). La RLS (`client_requests_select` +
 * `can_see_client_request`) filtre : un contact ne voit que celles de son client, un
 * interne celles de ses clients (lead/admin : tout).
 */

export interface ClientRequestFilters {
  clientId?: string;
  statuses?: ClientRequestStatus[];
}

export async function listClientRequests(
  filters: ClientRequestFilters = {},
): Promise<ClientRequest[]> {
  let q = getSupabase()
    .from('client_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (filters.clientId) q = q.eq('client_id', filters.clientId);
  if (filters.statuses?.length) q = q.in('status', filters.statuses);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(toClientRequest);
}

export async function countOpenClientRequests(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('client_requests')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'traitee');
  if (error) throw error;
  return count ?? 0;
}

export interface ClientRequestInput {
  clientId: string;
  title: string;
  description: string;
  wantedNetwork: Network | null;
  wantedDate: string | null;
}

export async function createClientRequest(input: ClientRequestInput): Promise<ClientRequest> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('client_requests')
    .insert({
      client_id: input.clientId,
      created_by: userRes.user?.id ?? '',
      title: input.title.trim(),
      description: input.description.trim(),
      wanted_network: input.wantedNetwork,
      wanted_date: input.wantedDate,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toClientRequest(data);
}

export async function updateClientRequest(
  id: string,
  input: Partial<Omit<ClientRequestInput, 'clientId'>>,
): Promise<ClientRequest> {
  const patch: {
    title?: string;
    description?: string;
    wanted_network?: Network | null;
    wanted_date?: string | null;
  } = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.wantedNetwork !== undefined) patch.wanted_network = input.wantedNetwork;
  if (input.wantedDate !== undefined) patch.wanted_date = input.wantedDate;
  const { data, error } = await getSupabase()
    .from('client_requests')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toClientRequest(data);
}

/** Changement de statut — réservé aux internes (garde SQL). */
export async function setClientRequestStatus(
  id: string,
  status: ClientRequestStatus,
): Promise<void> {
  const { error } = await getSupabase()
    .from('client_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function listClientRequestComments(
  requestId: string,
): Promise<ClientRequestComment[]> {
  const { data, error } = await getSupabase()
    .from('client_request_comments')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at');
  if (error) throw error;
  return data.map(toClientRequestComment);
}

export async function addClientRequestComment(
  requestId: string,
  body: string,
): Promise<ClientRequestComment> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('client_request_comments')
    .insert({ request_id: requestId, author_id: userRes.user?.id ?? '', body: body.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return toClientRequestComment(data);
}

/** Post(s) issus d'une demande (via `posts.origin_id`). Visible selon la RLS de posts. */
export async function listPostsFromRequest(requestId: string): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .eq('origin_type', 'client_request')
    .eq('origin_id', requestId)
    .is('deleted_at', null);
  if (error) throw error;
  return data.map(toPost);
}

/** Transforme une demande en post brouillon (interne). Lie `posts.origin_id`. */
export async function requestToPost(
  requestId: string,
  opts: { scheduledAt?: string; network?: Network } = {},
): Promise<Post> {
  const { data, error } = await getSupabase().rpc('request_to_post', {
    p_request_id: requestId,
    p_scheduled_at: opts.scheduledAt ?? undefined,
    p_network: opts.network ?? undefined,
  });
  if (error) throw error;
  return toPost(data as never);
}
