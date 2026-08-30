import { getSupabase } from '@/lib/supabase';
import { toPost, type Post } from '@/shared/types';
import type { Network } from '@/shared/constants/networks';
import type { PostStatus } from '@/shared/constants/postStatus';

export interface PostFilters {
  clientIds?: string[];
  statuses?: PostStatus[];
  networks?: Network[];
  from?: string | null;
  to?: string | null;
  q?: string;
}

export async function listPosts(filters: PostFilters = {}): Promise<Post[]> {
  let q = getSupabase().from('posts').select('*').is('deleted_at', null);
  if (filters.clientIds?.length) q = q.in('client_id', filters.clientIds);
  if (filters.statuses?.length) q = q.in('status', filters.statuses);
  if (filters.networks?.length) q = q.in('network', filters.networks);
  if (filters.from) q = q.gte('scheduled_at', filters.from);
  if (filters.to) q = q.lte('scheduled_at', filters.to);
  if (filters.q?.trim()) {
    q = q.textSearch('search_tsv', filters.q.trim(), { type: 'websearch', config: 'french' });
  }
  const { data, error } = await q.order('scheduled_at');
  if (error) throw error;
  return data.map(toPost);
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data ? toPost(data) : null;
}

export interface PostInput {
  clientId: string;
  network: Network;
  /** ISO UTC. */
  scheduledAt: string;
  caption: string;
  canvaUrl: string | null;
  authorId?: string;
}

export async function createPost(input: PostInput): Promise<Post> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('posts')
    .insert({
      client_id: input.clientId,
      network: input.network,
      scheduled_at: input.scheduledAt,
      caption: input.caption,
      canva_url: input.canvaUrl,
      author_id: input.authorId ?? userRes.user?.id ?? '',
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPost(data);
}

export async function updatePost(id: string, input: PostInput): Promise<Post> {
  const { data, error } = await getSupabase()
    .from('posts')
    .update({
      client_id: input.clientId,
      network: input.network,
      scheduled_at: input.scheduledAt,
      caption: input.caption,
      canva_url: input.canvaUrl,
      ...(input.authorId ? { author_id: input.authorId } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toPost(data);
}

/** Change le statut d'un post via le RPC (contrôle rôle + can_transition côté serveur). */
export async function changePostStatus(
  postId: string,
  to: PostStatus,
  comment?: string,
): Promise<Post> {
  const { data, error } = await getSupabase().rpc('post_change_status', {
    p_post_id: postId,
    p_to: to,
    p_comment: comment ?? undefined,
  });
  if (error) throw new Error(mapStatusError(error));
  return toPost(data as never);
}

function mapStatusError(error: { message?: string; code?: string }): string {
  const m = error.message ?? '';
  if (/commentaire est obligatoire/i.test(m)) return 'Un commentaire est obligatoire pour cette action.';
  if (/non autorisée|réservée|accès refusé/i.test(m)) return "Cette transition n'est pas autorisée.";
  if (/introuvable/i.test(m)) return 'Post introuvable.';
  return "Le changement de statut a échoué.";
}

/** Mise en corbeille (soft delete). Les règles de droits fines arrivent en Story 3.7. */
export async function trashPost(id: string): Promise<void> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { error } = await getSupabase()
    .from('posts')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userRes.user?.id ?? null })
    .eq('id', id);
  if (error) throw error;
}
