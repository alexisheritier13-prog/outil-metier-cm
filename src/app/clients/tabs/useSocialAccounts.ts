import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addSocialAccount,
  listNetworks,
  listSocialAccounts,
  removeSocialAccount,
  updateSocialAccount,
} from '@/services/socialAccounts';
import type { Network } from '@/shared/constants/networks';

const key = (clientId: string) => ['social-accounts', clientId] as const;

export function useNetworks() {
  return useQuery({ queryKey: ['networks'], queryFn: listNetworks, staleTime: 5 * 60_000 });
}

export function useSocialAccounts(clientId: string) {
  return useQuery({ queryKey: key(clientId), queryFn: () => listSocialAccounts(clientId) });
}

export function useAddSocialAccount(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ network, handle }: { network: Network; handle: string }) =>
      addSocialAccount(clientId, network, handle),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export function useUpdateSocialAccount(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; network?: Network; handle?: string }) =>
      updateSocialAccount(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export function useRemoveSocialAccount(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeSocialAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}
