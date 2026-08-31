import { getSupabase } from '@/lib/supabase';
import {
  toClient,
  toPost,
  toPostComment,
  type Client,
  type Post,
  type PostComment,
} from '@/shared/types';
import { CLIENT_VISIBLE_STATUSES, type PostStatus } from '@/shared/constants/postStatus';
import type { Network } from '@/shared/constants/networks';

/**
 * Espace client (`/portail`). Toutes ces requêtes sont contraintes par la RLS au(x)
 * `client_id` du contact connecté (`clients_select_contact`, `posts_select_client`,
 * `post_comments_select_client`). Le service ne rajoute pas de garde : la base est la garde.
 */

/** La (ou les) fiche(s) client rattachée(s) au contact connecté. */
export async function listMyClients(): Promise<Client[]> {
  const { data, error } = await getSupabase().from('clients').select('*').order('name');
  if (error) throw error;
  return data.map(toClient);
}

export interface PortalPostFilters {
  statuses?: PostStatus[];
  networks?: Network[];
  from?: string | null;
  to?: string | null;
  q?: string;
}

/** Posts d'un client visibles par le contact (statuts `client_review` → `published`). */
export async function listPortalPosts(
  clientId: string,
  filters: PortalPostFilters = {},
): Promise<Post[]> {
  const statuses = filters.statuses?.length
    ? filters.statuses
    : (CLIENT_VISIBLE_STATUSES as readonly PostStatus[]);
  let q = getSupabase()
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .eq('client_id', clientId)
    .in('status', statuses);
  if (filters.networks?.length) q = q.in('network', filters.networks);
  if (filters.from) q = q.gte('scheduled_at', filters.from);
  if (filters.to) q = q.lte('scheduled_at', filters.to);
  if (filters.q?.trim()) {
    q = q.textSearch('search_tsv', filters.q.trim(), { type: 'websearch', config: 'french' });
  }
  const { data, error } = await q.order('scheduled_at');
  if (error) throw error;
  return data.map((row) => redactClientPost(toPost(row)));
}

/**
 * La note de performance n'est exposée au client que si elle est explicitement marquée
 * visible — la RLS renvoie la colonne, on la masque ici (garde applicative).
 */
export function redactClientPost(post: Post): Post {
  // Le lien de travail Canva ne sort jamais côté client ; la note de perf non plus
  // si elle n'est pas explicitement partagée.
  const base = { ...post, canvaUrl: null };
  return post.performanceVisibleToClient ? base : { ...base, performanceNote: null };
}

/** Nombre de posts en attente de la réponse du contact (statut `client_review`). */
export async function countPortalPending(clientId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('client_id', clientId)
    .eq('status', 'client_review');
  if (error) throw error;
  return count ?? 0;
}

export async function getPortalPost(id: string): Promise<Post | null> {
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data ? redactClientPost(toPost(data)) : null;
}

/** Commentaires visibles par le client (la RLS ne renvoie que `visibility = 'client'`). */
export async function listPortalComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await getSupabase()
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at');
  if (error) throw error;
  return data.map(toPostComment);
}

/** Le contact ajoute un commentaire (toujours en visibilité `client`). */
export async function addPortalComment(postId: string, body: string): Promise<PostComment> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('post_comments')
    .insert({
      post_id: postId,
      body: body.trim(),
      visibility: 'client',
      author_id: userRes.user?.id ?? '',
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPostComment(data);
}
