import { getSupabase } from '@/lib/supabase';
import { toPostHistoryEntry, type PostHistoryEntry } from '@/shared/types';

export async function listPostHistory(postId: string): Promise<PostHistoryEntry[]> {
  const { data, error } = await getSupabase()
    .from('post_history')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toPostHistoryEntry);
}
