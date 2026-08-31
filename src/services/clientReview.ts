import { getSupabase } from '@/lib/supabase';
import { toPost, type Post } from '@/shared/types';

/**
 * Approbation / refus d'un post par un contact client (Story 5.3, RPC `approve_post` /
 * `reject_post`). L'UI qui les appelle vit dans l'espace client (Epic 6, Story 6.3).
 */

export async function approvePost(postId: string): Promise<Post> {
  const { data, error } = await getSupabase().rpc('approve_post', { p_post_id: postId });
  if (error) throw new Error(mapError(error));
  return toPost(data as never);
}

export async function rejectPost(postId: string, comment: string): Promise<Post> {
  const { data, error } = await getSupabase().rpc('reject_post', {
    p_post_id: postId,
    p_comment: comment,
  });
  if (error) throw new Error(mapError(error));
  return toPost(data as never);
}

function mapError(error: { message?: string }): string {
  const m = error.message ?? '';
  if (/commentaire est obligatoire/i.test(m))
    return 'Merci de préciser ce qui doit être modifié.';
  if (/en attente de votre validation/i.test(m))
    return "Ce post n'est plus en attente de votre validation.";
  if (/accès refusé|réservé aux contacts/i.test(m)) return 'Action non autorisée.';
  if (/introuvable/i.test(m)) return 'Post introuvable.';
  return "L'action a échoué.";
}
