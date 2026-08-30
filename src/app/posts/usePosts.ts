import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePostStatus,
  createPost,
  getPost,
  listPosts,
  trashPost,
  updatePost,
  type PostFilters,
  type PostInput,
} from '@/services/posts';
import type { PostStatus } from '@/shared/constants/postStatus';

export const postsKey = (filters: PostFilters) => ['posts', filters] as const;

export function usePosts(filters: PostFilters = {}) {
  return useQuery({ queryKey: postsKey(filters), queryFn: () => listPosts(filters) });
}

export function usePost(id: string | null) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PostInput) => createPost(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useUpdatePost(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PostInput) => updatePost(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
  });
}

export function useChangePostStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to, comment }: { id: string; to: PostStatus; comment?: string }) =>
      changePostStatus(id, to, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useTrashPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => trashPost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}
