import { getSupabase } from '@/lib/supabase';

/**
 * Réglage du circuit de validation (`app_settings.workflow`). Mode « CM seul » :
 * la validation interne devient optionnelle (draft → à valider client directement).
 * Miroir applicatif de `workflow_skips_internal()` SQL. Écriture réservée Admin.
 */
export interface WorkflowSettings {
  skipInternalReview: boolean;
}

export const DEFAULT_WORKFLOW: WorkflowSettings = { skipInternalReview: false };

export async function getWorkflowSettings(): Promise<WorkflowSettings> {
  const { data, error } = await getSupabase()
    .from('app_settings')
    .select('value')
    .eq('key', 'workflow')
    .maybeSingle();
  if (error) throw error;
  const v = (data?.value ?? {}) as { skip_internal_review?: boolean };
  return { skipInternalReview: Boolean(v.skip_internal_review) };
}

export async function saveWorkflowSettings(s: WorkflowSettings): Promise<void> {
  const { error } = await getSupabase()
    .from('app_settings')
    .upsert(
      { key: 'workflow', value: { skip_internal_review: s.skipInternalReview } },
      { onConflict: 'key' },
    );
  if (error) throw error;
}
