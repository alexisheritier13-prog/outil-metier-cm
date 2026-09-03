import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { Page, PageHeader } from '@/components/Page';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import {
  THRESHOLD_FIELDS,
  getAlertThresholds,
  saveAlertThresholds,
  type AlertThresholds,
} from '@/services/alertSettings';

export function AlertSettingsPage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const thresholds = useQuery({ queryKey: ['alert-thresholds'], queryFn: getAlertThresholds });
  const [draft, setDraft] = useState<AlertThresholds | null>(null);

  useEffect(() => {
    if (thresholds.data && !draft) setDraft(thresholds.data);
  }, [thresholds.data, draft]);

  const save = useMutation({
    mutationFn: (v: AlertThresholds) => saveAlertThresholds(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-thresholds'] });
    },
  });

  if (!me || me.role !== 'admin') return null;
  if (thresholds.isLoading || !draft) return <FullPageSpinner />;

  const errors = THRESHOLD_FIELDS.filter((f) => {
    const v = draft[f.key];
    return !Number.isInteger(v) || v < f.min || v > f.max;
  }).map((f) => f.key);

  return (
    <Page size="form">
      <PageHeader
        title="Seuils des alertes"
        description="Ces valeurs pilotent le moteur de détection. Prises en compte à la prochaine exécution."
      />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (errors.length === 0) save.mutate(draft);
        }}
      >
        {THRESHOLD_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-sm font-medium" htmlFor={f.key}>
              {f.label}
            </label>
            <input
              id={f.key}
              type="number"
              min={f.min}
              max={f.max}
              className="field w-24"
              value={draft[f.key]}
              onChange={(e) =>
                setDraft({ ...draft, [f.key]: Number(e.target.value) })
              }
            />
            <p className="text-muted-foreground text-xs">{f.hint}</p>
            {errors.includes(f.key) && (
              <p className="text-destructive text-xs">
                Valeur attendue entre {f.min} et {f.max}.
              </p>
            )}
          </div>
        ))}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending || errors.length > 0}>
            Enregistrer
          </Button>
          {save.isSuccess && !save.isPending && (
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
