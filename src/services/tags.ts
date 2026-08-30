import { getSupabase } from '@/lib/supabase';
import { toTag, type Tag } from '@/shared/types';

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await getSupabase().from('tags').select('*').order('name');
  if (error) throw error;
  return data.map(toTag);
}

/** Crée un tag (ou renvoie l'existant de même nom, insensible à la casse). */
export async function createTag(name: string): Promise<Tag> {
  const trimmed = name.trim();
  const existing = await getSupabase().from('tags').select('*').ilike('name', trimmed).maybeSingle();
  if (existing.data) return toTag(existing.data);
  const { data, error } = await getSupabase().from('tags').insert({ name: trimmed }).select('*').single();
  if (error) throw error;
  return toTag(data);
}

export async function getPostTagIds(postId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('post_tags')
    .select('tag_id')
    .eq('post_id', postId);
  if (error) throw error;
  return data.map((r) => r.tag_id);
}

export async function setPostTags(postId: string, tagIds: string[]): Promise<void> {
  const supabase = getSupabase();
  const del = await supabase.from('post_tags').delete().eq('post_id', postId);
  if (del.error) throw del.error;
  if (tagIds.length === 0) return;
  const ins = await supabase
    .from('post_tags')
    .insert(tagIds.map((tag_id) => ({ post_id: postId, tag_id })));
  if (ins.error) throw ins.error;
}
