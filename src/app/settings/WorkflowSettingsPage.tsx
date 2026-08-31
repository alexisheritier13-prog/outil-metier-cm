import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { Page, PageHeader } from '@/components/Page';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import {
  getWorkflowSettings,
  saveWorkflowSettings,
  type WorkflowSettings,
} from '@/services/workflowSettings';

/** Réglage du circuit de validation (Admin). Story « mode CM seul ». */
export function WorkflowSettingsPage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['workflow-settings'], queryFn: getWorkflowSettings });
  const [draft, setDraft] = useState<WorkflowSettings | null>(null);

  useEffect(() => {
    if (settings.data && !draft) setDraft(settings.data);
  }, [settings.data, draft]);

  const save = useMutation({
    mutationFn: (v: WorkflowSettings) => saveWorkflowSettings(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-settings'] }),
  });

  if (!me || me.role !== 'admin') return null;
  if (settings.isLoading || !draft) return <FullPageSpinner />;

  const dirty = draft.skipInternalReview !== settings.data?.skipInternalReview;

  return (
    <Page size="form">
      <PageHeader
        title="Circuit de validation"
        description="Adapte le parcours d'un post entre sa création et son envoi au client."
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) save.mutate(draft);
        }}
      >
        <div className="flex items-start gap-3">
          <input
            id="skip-internal"
            type="checkbox"
            className="accent-primary mt-0.5 h-4 w-4"
            checked={draft.skipInternalReview}
            onChange={(e) => setDraft({ ...draft, skipInternalReview: e.target.checked })}
          />
          <div className="text-sm">
            <label htmlFor="skip-internal" className="cursor-pointer font-medium">
              Mode « CM seul » — sauter la validation interne
            </label>
            <p className="text-muted-foreground mt-1">
              Un Community Manager peut envoyer un brouillon directement au client, sans qu'un
              Lead ne valide d'abord en interne. L'étape « À valider en interne » reste
              disponible pour ceux qui veulent une relecture.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending || !dirty}>
            Enregistrer
          </Button>
          {save.isSuccess && !save.isPending && !dirty && (
            <span className="text-success-strong inline-flex items-center gap-1 text-sm" role="status">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Enregistré
            </span>
          )}
        </div>
      </form>
    </Page>
  );
}
