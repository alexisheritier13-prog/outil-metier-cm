import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInternalUser,
  getUserClientIds,
  listAssignableClients,
  listInternalUsers,
  setUserActive,
  setUserClientIds,
  updateUserRole,
  type CreateUserInput,
  type InternalRole,
} from '@/services/users';

const USERS_KEY = ['admin', 'internal-users'] as const;
const CLIENTS_KEY = ['admin', 'assignable-clients'] as const;
const userClientsKey = (id: string) => ['admin', 'user-clients', id] as const;

export function useInternalUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: listInternalUsers });
}

export function useAssignableClients() {
  return useQuery({ queryKey: CLIENTS_KEY, queryFn: listAssignableClients });
}

export function useUserClientIds(profileId: string | null) {
  return useQuery({
    queryKey: userClientsKey(profileId ?? ''),
    queryFn: () => getUserClientIds(profileId as string),
    enabled: Boolean(profileId),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createInternalUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: InternalRole }) => updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useSetActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setUserActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useSetUserClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientIds }: { id: string; clientIds: string[] }) =>
      setUserClientIds(id, clientIds),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: userClientsKey(id) });
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}
