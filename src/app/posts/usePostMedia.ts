import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deletePostMedia,
  listPostMedia,
  probeFile,
  reorderPostMedia,
  uploadPostMedia,
} from '@/services/postMedia';

export const postMediaKey = (postId: string | null | undefined) =>
  ['post-media', postId] as const;

export function usePostMedia(postId: string | null | undefined) {
  return useQuery({
    queryKey: postMediaKey(postId),
    queryFn: () => listPostMedia(postId as string),
    enabled: Boolean(postId),
  });
}

export function useUploadPostMedia(clientId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, position }: { file: File; position: number }) => {
      const probed = await probeFile(file);
      return uploadPostMedia(clientId, postId, probed, position);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postMediaKey(postId) });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useDeletePostMedia(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePostMedia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postMediaKey(postId) });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useReorderPostMedia(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderPostMedia(postId, orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: postMediaKey(postId) }),
  });
}
