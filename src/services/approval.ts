import { getSupabase } from '@/lib/supabase';
import type { Network } from '@/shared/constants/networks';
import type { PostMediaKind } from '@/shared/types';

export interface ApprovalPost {
  postId: string;
  status: string;
  network: Network;
  scheduledAt: string;
  caption: string;
  clientName: string;
  clientLogoUrl: string | null;
  used: boolean;
  media: { storagePath: string; kind: PostMediaKind }[];
  comments: { body: string; createdAt: string; system: boolean }[];
}

/** Détail d'un post via son jeton de validation (page publique). `null` = lien inconnu. */
export async function fetchApprovalPost(token: string): Promise<ApprovalPost | null> {
  const { data, error } = await getSupabase().rpc('post_by_approval_token', { p_token: token });
  if (error) throw error;
  return (data as ApprovalPost | null) ?? null;
}

export async function approveViaToken(token: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('approve_via_token', { p_token: token });
  if (error) throw error;
  return data as string;
}

export async function rejectViaToken(token: string, comment: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('reject_via_token', {
    p_token: token,
    p_comment: comment,
  });
  if (error) throw error;
  return data as string;
}

/** Jeton de validation d'un post (côté agence, pour copier le lien). */
export async function getApprovalToken(postId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('post_approval_tokens')
    .select('token')
    .eq('post_id', postId)
    .maybeSingle();
  if (error) throw error;
  return data?.token ?? null;
}

export function approvalUrl(token: string): string {
  return `${window.location.origin}/valider/${token}`;
}
