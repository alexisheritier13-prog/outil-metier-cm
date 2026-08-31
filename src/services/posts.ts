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
  /** Ne garder que les posts qui portent une note de performance (Story 9.4). */
  hasPerformanceNote?: boolean;
}

export async function listPosts(filters: PostFilters = {}): Promise<Post[]> {
  let q = getSupabase().from('posts').select('*').is('deleted_at', null);
  if (filters.clientIds?.length) q = q.in('client_id', filters.clientIds);
  if (filters.statuses?.length) q = q.in('status', filters.statuses);
  if (filters.networks?.length) q = q.in('network', filters.networks);
  if (filters.from) q = q.gte('scheduled_at', filters.from);
  if (filters.to) q = q.lte('scheduled_at', filters.to);
  if (filters.hasPerformanceNote) q = q.not('performance_note', 'is', null);
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
  /** Lien de travail Canva (interne). Les visuels sont gérés via `post_media`. */
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

/**
 * Réassigne un post à un autre CM interne (`author_id`). RLS : accès interne au
 * client requis ; l'UI réserve l'action aux Lead/Admin. Ne touche à rien d'autre —
 * le trigger `posts_log_field_changes` journalise le changement (Story 4.4).
 */
export async function reassignPost(id: string, authorId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('posts')
    .update({ author_id: authorId })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw error;
}

/**
 * Note de performance d'un post publié (Story 9.4). `note` vide → `null` et la
 * visibilité client est forcée à `false` (rien à montrer). Le trigger
 * `posts_log_field_changes` journalise note ET visibilité (migr 0015 + 0029).
 */
export async function updatePostPerformance(
  id: string,
  note: string | null,
  visibleToClient: boolean,
): Promise<Post> {
  const clean = note && note.trim() ? note.trim() : null;
  const { data, error } = await getSupabase()
    .from('posts')
    .update({
      performance_note: clean,
      performance_visible_to_client: clean ? visibleToClient : false,
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) throw error;
  return toPost(data);
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
        'Un CM ne met à la corbeille que ses propres brouillons. Demandez à un chef de projet.',
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

/**
 * File « À valider » (Story 5.4). `internal` = posts en validation interne,
 * `client` = posts en attente du client. RLS applique déjà l'isolation par rôle.
 * Triés par ancienneté dans le statut (le plus vieux d'abord).
 */
export async function listReviewQueue(
  kind: 'internal' | 'client',
  clientIds?: string[],
): Promise<Post[]> {
  const status: PostStatus = kind === 'internal' ? 'internal_review' : 'client_review';
  let q = getSupabase()
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .eq('status', status);
  if (clientIds?.length) q = q.in('client_id', clientIds);
  const { data, error } = await q.order('status_changed_at', { ascending: true });
  if (error) throw error;
  return data.map(toPost);
}

/** Nombre de posts en attente de validation (interne + client) visibles par l'utilisateur. */
export async function countReviewQueue(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .in('status', ['internal_review', 'client_review']);
  if (error) throw error;
  return count ?? 0;
}

/** Relance in-app des contacts du client sur un post « à valider client » (Story 5.4). */
export async function remindClientReview(postId: string): Promise<void> {
  const { error } = await getSupabase().rpc('remind_client_review', { p_post_id: postId });
  if (error) throw error;
}
