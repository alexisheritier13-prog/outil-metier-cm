import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClient,
  getClient,
  listClientOverview,
  listClients,
  setClientArchived,
  updateClient,
  type ClientInput,
} from '@/services/clients';

const listKey = (includeArchived: boolean) => ['clients', { includeArchived }] as const;
const overviewKey = (includeArchived: boolean) =>
  ['clients', 'overview', { includeArchived }] as const;
const detailKey = (id: string) => ['client', id] as const;

export function useClients(includeArchived: boolean) {
  return useQuery({
    queryKey: listKey(includeArchived),
    queryFn: () => listClients(includeArchived),
  });
}

export function useClientOverview(includeArchived: boolean) {
  return useQuery({
    queryKey: overviewKey(includeArchived),
    queryFn: () => listClientOverview(includeArchived),
  });
}

export function useClient(id: string) {
  return useQuery({ queryKey: detailKey(id), queryFn: () => getClient(id), enabled: Boolean(id) });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientInput) => createClient(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientInput) => updateClient(id, input),
    onSuccess: (client) => {
      qc.setQueryData(detailKey(id), client);
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useSetClientArchived(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (archived: boolean) => setClientArchived(id, archived),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey(id) });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
