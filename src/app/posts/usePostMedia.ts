import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deletePostMedia,
  listClientMedia,
  listPostMedia,
  probeFile,
  reorderPostMedia,
  reuseMediaToPost,
  uploadPostMedia,
} from '@/services/postMedia';
import type { PostMedia } from '@/shared/types';

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

/** Visuels déjà utilisés sur les posts du client (bibliothèque). */
export function useClientMedia(clientId: string, enabled = true) {
  return useQuery({
    queryKey: ['client-media', clientId],
    queryFn: () => listClientMedia(clientId),
    enabled: enabled && Boolean(clientId),
    staleTime: 60_000,
  });
}

export function useReuseMedia(clientId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ source, position }: { source: PostMedia; position: number }) =>
      reuseMediaToPost(source, clientId, postId, position),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postMediaKey(postId) });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
