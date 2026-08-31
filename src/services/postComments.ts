import { getSupabase } from '@/lib/supabase';
import { toPostComment, type CommentVisibility, type PostComment } from '@/shared/types';

export async function listPostComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await getSupabase()
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at');
  if (error) throw error;
  return data.map(toPostComment);
}

export async function addPostComment(
  postId: string,
  body: string,
  visibility: CommentVisibility,
): Promise<PostComment> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('post_comments')
    .insert({ post_id: postId, body: body.trim(), visibility, author_id: userRes.user?.id ?? '' })
    .select('*')
    .single();
  if (error) throw error;
  return toPostComment(data);
}

export async function updatePostComment(id: string, body: string): Promise<void> {
  const { error } = await getSupabase()
    .from('post_comments')
    .update({ body: body.trim() })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePostComment(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('post_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
