import { getSupabase } from '@/lib/supabase';
import { requireOrgId } from '@/services/org';

/**
 * Réglage du circuit de validation (`org_settings.workflow`, par organisation).
 * Mode « CM seul » : la validation interne devient optionnelle (draft → à valider
 * client directement). Miroir applicatif de `workflow_skips_internal()` SQL.
 * Écriture réservée au Directeur.
 */
export interface WorkflowSettings {
  skipInternalReview: boolean;
}

export const DEFAULT_WORKFLOW: WorkflowSettings = { skipInternalReview: false };

export async function getWorkflowSettings(): Promise<WorkflowSettings> {
  const { data, error } = await getSupabase()
    .from('org_settings')
    .select('value')
    .eq('key', 'workflow')
    .maybeSingle();
  if (error) throw error;
  const v = (data?.value ?? {}) as { skip_internal_review?: boolean };
  return { skipInternalReview: Boolean(v.skip_internal_review) };
}

export async function saveWorkflowSettings(s: WorkflowSettings): Promise<void> {
  const organization_id = await requireOrgId();
  const { error } = await getSupabase()
    .from('org_settings')
    .upsert(
      { organization_id, key: 'workflow', value: { skip_internal_review: s.skipInternalReview } },
      { onConflict: 'organization_id,key' },
    );
  if (error) throw error;
}
