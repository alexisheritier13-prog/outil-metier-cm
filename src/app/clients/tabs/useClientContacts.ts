import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addClientContact,
  inviteClientContact,
  listClientContacts,
  removeClientContact,
  setClientContactActive,
  updateClientContact,
} from '@/services/clientContacts';

const key = (clientId: string) => ['client-contacts', clientId] as const;

export function useClientContacts(clientId: string) {
  return useQuery({ queryKey: key(clientId), queryFn: () => listClientContacts(clientId) });
}

export function useAddClientContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fullName, email }: { fullName: string; email: string }) =>
      addClientContact(clientId, fullName, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export function useUpdateClientContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; fullName?: string; email?: string }) =>
      updateClientContact(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export function useSetContactActive(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setClientContactActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export function useRemoveClientContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeClientContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export function useInviteClientContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fullName, email }: { fullName: string; email: string }) =>
      inviteClientContact(clientId, fullName, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}
