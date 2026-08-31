import { getSupabase } from '@/lib/supabase';
import { toPost, type Post, type PostOriginType } from '@/shared/types';

/**
 * Traçabilité de l'origine d'un post (Story 7.4). `posts.origin_type` / `origin_id` sont
 * renseignés par les RPC de transformation (idée, marronnier, demande, duplication).
 * Aucune FK sur `origin_id` : si l'origine est supprimée, le post subsiste et le lien
 * devient « origine supprimée ».
 */

export const ORIGIN_TYPE_LABELS: Record<PostOriginType, string> = {
  idea: 'Idée',
  key_date: 'Marronnier',
  client_request: 'Demande client',
  duplicate: 'Duplication',
};

export interface OriginRef {
  type: PostOriginType;
  label: string | null; // null = origine supprimée
}

async function fetchOriginName(type: PostOriginType, id: string): Promise<string | null> {
  const sb = getSupabase();
  switch (type) {
    case 'idea': {
      const { data } = await sb.from('ideas').select('title').eq('id', id).maybeSingle();
      return data?.title ?? null;
    }
    case 'key_date': {
      const { data } = await sb.from('key_dates').select('name').eq('id', id).maybeSingle();
      return data?.name ?? null;
    }
    case 'client_request': {
      const { data } = await sb.from('client_requests').select('title').eq('id', id).maybeSingle();
      return data?.title ?? null;
    }
    case 'duplicate': {
      const { data } = await sb.from('posts').select('caption').eq('id', id).maybeSingle();
      return data?.caption ?? null;
    }
  }
}

export async function describeOrigin(
  type: PostOriginType | null,
  id: string | null,
): Promise<OriginRef | null> {
  if (!type || !id) return null;
  const raw = await fetchOriginName(type, id);
  return { type, label: raw ? (raw.split('\n')[0] ?? null) : null };
}

/** Posts générés par une origine donnée (visibles selon la RLS de posts). */
export async function listPostsByOrigin(type: PostOriginType, id: string): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .eq('origin_type', type)
    .eq('origin_id', id)
    .is('deleted_at', null)
    .order('scheduled_at');
  if (error) throw error;
  return data.map(toPost);
}
