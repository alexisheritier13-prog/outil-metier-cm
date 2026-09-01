import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInvitation,
  isPlatformAdmin,
  listPlatformInvitations,
  listPlatformOrgs,
} from '@/services/platform';
import { listFeedback, setFeedbackStatus, type FeedbackStatus } from '@/services/feedback';

export function useIsPlatformAdmin() {
  return useQuery({
    queryKey: ['platform-admin'],
    queryFn: isPlatformAdmin,
    staleTime: 5 * 60_000,
  });
}

export function usePlatformOrgs(enabled: boolean) {
  return useQuery({ queryKey: ['platform-orgs'], queryFn: listPlatformOrgs, enabled });
}

export function usePlatformInvitations(enabled: boolean) {
  return useQuery({
    queryKey: ['platform-invitations'],
    queryFn: listPlatformInvitations,
    enabled,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { orgName: string; email?: string; fullName?: string }) =>
      createInvitation(v.orgName, v.email, v.fullName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-invitations'] }),
  });
}

export function usePlatformFeedback(enabled: boolean) {
  return useQuery({ queryKey: ['platform-feedback'], queryFn: listFeedback, enabled });
}

export function useSetFeedbackStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: FeedbackStatus }) => setFeedbackStatus(v.id, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-feedback'] }),
  });
}
