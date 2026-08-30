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
  campaignId?: string | null;
  /** Noms de tags (créés à la volée si besoin). */
  tags?: string[];
}

async function applyTags(postId: string, names: string[] | undefined): Promise<void> {
  if (names === undefined) return;
  const { createTag, setPostTags } = await import('@/services/tags');
  const ids = await Promise.all(names.filter((n) => n.trim()).map((n) => createTag(n).then((t) => t.id)));
  await setPostTags(postId, [...new Set(ids)]);
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
      campaign_id: input.campaignId ?? null,
      author_id: input.authorId ?? userRes.user?.id ?? '',
    })
    .select('*')
    .single();
  if (error) throw error;
  await applyTags(data.id, input.tags);
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
      campaign_id: input.campaignId ?? null,
      ...(input.authorId ? { author_id: input.authorId } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  await applyTags(id, input.tags);
  return toPost(data);
}

/** Duplique un post (légende, réseau, client, campagne, tags) — statut brouillon, date décalée. */
export async function duplicatePost(id: string, shiftDays = 7): Promise<Post> {
  const { data, error } = await getSupabase().rpc('post_duplicate', {
    p_post_id: id,
    p_shift_days: shiftDays,
  });
  if (error) throw error;
  return toPost(data as never);
}

/** Re-planifie un post (drag & drop calendrier) — ne touche qu'à `scheduled_at`. */
export async function reschedulePost(id: string, scheduledAt: string): Promise<void> {
  const { error } = await getSupabase()
    .from('posts')
    .update({ scheduled_at: scheduledAt })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw error;
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

/**
 * Mise en corbeille via le RPC (règles FR45 : un CM ne supprime que ses brouillons ;
 * un post validé ou plus → Lead/Admin).
 */
export async function trashPost(id: string): Promise<void> {
  const { error } = await getSupabase().rpc('post_trash', { p_post_id: id });
  if (error) {
    if (/brouillons|autoris/i.test(error.message)) {
      throw new Error(
        'Un CM ne peut mettre à la corbeille que ses propres brouillons. Demandez à un Lead.',
      );
    }
    throw error;
  }
}

export async function restorePost(id: string): Promise<void> {
  const { error } = await getSupabase().rpc('post_restore', { p_post_id: id });
  if (error) throw error;
}

export async function listTrashedPosts(): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return data.map(toPost);
}

export async function purgePostNow(id: string): Promise<void> {
  const { error } = await getSupabase().rpc('trash_purge_now', { p_entity: 'post', p_id: id });
  if (error) throw error;
}
