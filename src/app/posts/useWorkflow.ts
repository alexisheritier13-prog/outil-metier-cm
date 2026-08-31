import { useQuery } from '@tanstack/react-query';
import { getWorkflowSettings } from '@/services/workflowSettings';
import type { WorkflowOptions } from '@/shared/utils/transitions';

/**
 * Réglage du circuit, lu une fois et mis en cache (change rarement). Renvoie
 * directement des `WorkflowOptions` prêts à passer à `canTransition` /
 * `allowedTransitions`.
 */
export function useWorkflowOptions(): WorkflowOptions {
  const q = useQuery({
    queryKey: ['workflow-settings'],
    queryFn: getWorkflowSettings,
    staleTime: 5 * 60_000,
  });
  return { skipInternalReview: q.data?.skipInternalReview ?? false };
}
