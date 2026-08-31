import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addClientCredential,
  deleteClientCredential,
  listClientCredentials,
  updateClientCredential,
  type ClientCredentialInput,
} from '@/services/clientCredentials';

const key = (clientId: string) => ['client-credentials', clientId] as const;

export function useClientCredentials(clientId: string) {
  return useQuery({ queryKey: key(clientId), queryFn: () => listClientCredentials(clientId) });
}

export function useAddCredential(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientCredentialInput) => addClientCredential(clientId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export function useUpdateCredential(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientCredentialInput }) =>
      updateClientCredential(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export function useDeleteCredential(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClientCredential(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}
