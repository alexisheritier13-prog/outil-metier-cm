import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvePost, rejectPost } from '@/services/clientReview';
import {
  addPortalComment,
  countPortalPending,
  listPortalComments,
  listPortalPosts,
  type PortalPostFilters,
} from '@/services/portal';

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['portal'] });
};

export function usePortalPosts(clientId: string, filters: PortalPostFilters = {}) {
  return useQuery({
    queryKey: ['portal', 'posts', clientId, filters],
    queryFn: () => listPortalPosts(clientId, filters),
  });
}

export function usePortalPendingCount(clientId: string | null) {
  return useQuery({
    queryKey: ['portal', 'pending-count', clientId],
    queryFn: () => countPortalPending(clientId as string),
    enabled: Boolean(clientId),
  });
}

export function usePortalComments(postId: string | null) {
  return useQuery({
    queryKey: ['portal', 'comments', postId],
    queryFn: () => listPortalComments(postId as string),
    enabled: Boolean(postId),
  });
}

export function useApprovePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => approvePost(postId),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRejectPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, comment }: { postId: string; comment: string }) =>
      rejectPost(postId, comment),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useAddPortalComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addPortalComment(postId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'comments', postId] }),
  });
}
