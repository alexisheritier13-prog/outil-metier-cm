import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addClientRequestComment,
  countOpenClientRequests,
  createClientRequest,
  listClientRequestComments,
  listClientRequests,
  listPostsFromRequest,
  requestToPost,
  setClientRequestStatus,
  updateClientRequest,
  type ClientRequestFilters,
  type ClientRequestInput,
} from '@/services/clientRequests';
import type { ClientRequestStatus } from '@/shared/types';

const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ['client-requests'] });

export function useClientRequests(filters: ClientRequestFilters = {}) {
  return useQuery({
    queryKey: ['client-requests', 'list', filters],
    queryFn: () => listClientRequests(filters),
  });
}

export function useOpenRequestCount(enabled = true) {
  return useQuery({
    queryKey: ['client-requests', 'open-count'],
    queryFn: countOpenClientRequests,
    enabled,
  });
}

export function usePostsFromRequest(requestId: string | null) {
  return useQuery({
    queryKey: ['client-requests', 'linked-posts', requestId],
    queryFn: () => listPostsFromRequest(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useRequestComments(requestId: string | null) {
  return useQuery({
    queryKey: ['client-requests', 'comments', requestId],
    queryFn: () => listClientRequestComments(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientRequestInput) => createClientRequest(input),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<ClientRequestInput, 'clientId'>> }) =>
      updateClientRequest(id, patch),
    onSuccess: () => invalidate(qc),
  });
}

export function useSetRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClientRequestStatus }) =>
      setClientRequestStatus(id, status),
    onSuccess: () => invalidate(qc),
  });
}

export function useAddRequestComment(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addClientRequestComment(requestId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['client-requests', 'comments', requestId] }),
  });
}

export function useRequestToPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requestToPost(id),
    onSuccess: () => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
