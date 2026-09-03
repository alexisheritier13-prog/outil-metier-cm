import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIdea,
  deleteIdea,
  ideaToPost,
  listIdeas,
  updateIdea,
  type IdeaFilters,
  type IdeaInput,
} from '@/services/ideas';
import type { Network } from '@/shared/constants/networks';

const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ['ideas'] });

export function useIdeas(filters: IdeaFilters = {}) {
  return useQuery({ queryKey: ['ideas', 'list', filters], queryFn: () => listIdeas(filters) });
}

export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: IdeaInput) => createIdea(i), onSuccess: () => invalidate(qc) });
}

export function useUpdateIdea(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: IdeaInput) => updateIdea(id, i),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteIdea() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteIdea(id), onSuccess: () => invalidate(qc) });
}

export function useIdeaToPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, network }: { id: string; clientId?: string; network?: Network }) =>
      ideaToPost(id, { clientId, network }),
    onSuccess: () => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
