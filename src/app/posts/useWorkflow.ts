import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWorkflowSettings } from '@/services/workflowSettings';
import { listClients } from '@/services/clients';
import type { WorkflowOptions } from '@/shared/utils/transitions';

/**
 * Réglage GLOBAL du circuit (mode « CM seul »), lu une fois et mis en cache.
 * Pour les vérifications de transition, préférer `useWorkflowForClient` /
 * `useClientSkipReview` qui ajoutent l'option propre au client.
 */
export function useWorkflowOptions(): WorkflowOptions {
  const q = useQuery({
    queryKey: ['workflow-settings'],
    queryFn: getWorkflowSettings,
    staleTime: 5 * 60_000,
  });
  return { skipInternalReview: q.data?.skipInternalReview ?? false };
}

/** Map clientId → « ne valide pas les posts » (skip_client_review). */
export function useClientSkipReview(): (clientId: string | null | undefined) => boolean {
  const q = useQuery({
    queryKey: ['clients', { includeArchived: true }],
    queryFn: () => listClients(true),
    staleTime: 5 * 60_000,
  });
  const map = useMemo(
    () => new Map((q.data ?? []).map((c) => [c.id, c.skipClientReview])),
    [q.data],
  );
  return (clientId) => (clientId ? (map.get(clientId) ?? false) : false);
}

/** Options de circuit complètes pour un client donné (global + propre au client). */
export function useWorkflowForClient(clientId: string | null | undefined): WorkflowOptions {
  const base = useWorkflowOptions();
  const skipReview = useClientSkipReview();
  return { ...base, skipClientReview: skipReview(clientId) };
}
