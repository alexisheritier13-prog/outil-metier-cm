import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { Page, PageHeader } from '@/components/Page';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { listJobRuns, runPurgeTrash } from '@/services/jobs';
import { runGenerateAlerts } from '@/services/alerts';
import { parisDateTimeLabel } from '@/shared/utils/tz';

const JOB_LABELS: Record<string, string> = {
  generate_alerts: 'Détection des alertes',
  purge_trash: 'Purge de la corbeille (60 j)',
};

function duration(a: string, b: string | null): string {
  if (!b) return '—';
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function JobsPage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const runs = useQuery({ queryKey: ['job-runs'], queryFn: () => listJobRuns() });

  const alerts = useMutation({
    mutationFn: runGenerateAlerts,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-runs'] }),
  });
  const purge = useMutation({
    mutationFn: runPurgeTrash,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-runs'] }),
  });

  if (!me || me.role !== 'admin') return null;
  if (runs.isLoading) return <FullPageSpinner />;

  return (
    <Page>
      <PageHeader
        title="Tâches planifiées"
        description="Détection des alertes (chaque nuit + toutes les heures en journée) et purge de la corbeille (chaque nuit). Historique des dernières exécutions."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={alerts.isPending} onClick={() => alerts.mutate()}>
          Lancer la détection
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={purge.isPending}
          onClick={() => {
            if (confirm('Purger définitivement les éléments en corbeille depuis plus de 60 jours ?'))
              purge.mutate();
          }}
        >
          Purger la corbeille maintenant
        </Button>
      </div>

      {runs.data && runs.data.length === 0 ? (
        <EmptyState title="Aucune exécution" description="Les jobs n'ont pas encore tourné." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-medium">Job</th>
                <th className="p-3 text-left font-medium">Lancé</th>
                <th className="p-3 text-left font-medium">Durée</th>
                <th className="p-3 text-left font-medium">Résultat</th>
                <th className="p-3 text-left font-medium">Détail</th>
              </tr>
            </thead>
            <tbody>
              {(runs.data ?? []).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{JOB_LABELS[r.jobName] ?? r.jobName}</td>
                  <td className="text-muted-foreground whitespace-nowrap p-3">
                    {parisDateTimeLabel(r.startedAt)}
                  </td>
                  <td className="text-muted-foreground p-3">{duration(r.startedAt, r.finishedAt)}</td>
                  <td className="p-3">
                    {r.ok === null ? (
                      <span className="text-muted-foreground inline-flex items-center gap-1">
                        <Loader className="h-3.5 w-3.5 animate-spin" /> en cours
                      </span>
                    ) : r.ok ? (
                      <span className="text-success-strong inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> OK
                      </span>
                    ) : (
                      <span className="text-danger-strong inline-flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> échec
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground p-3">
                    {r.error ? (
                      <span className="text-destructive">{r.error}</span>
                    ) : (
                      Object.entries(r.stats)
                        .map(([k, v]) => `${k} : ${v}`)
                        .join(' · ') || '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
