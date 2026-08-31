import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BellRing, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { ALERT_TYPE_LABELS, type AlertSeverity, type AlertType } from '@/shared/types';
import { listClients } from '@/services/clients';
import { listAlerts, runGenerateAlerts, setAlertStatus } from '@/services/alerts';

const SEVERITY: Record<AlertSeverity, { card: string; dot: string; label: string }> = {
  info: { card: 'border-info-border bg-info-surface', dot: 'bg-info', label: 'Info' },
  warning: {
    card: 'border-warning-border bg-warning-surface',
    dot: 'bg-warning',
    label: 'Important',
  },
  critical: { card: 'border-danger-border bg-danger-surface', dot: 'bg-danger', label: 'Critique' },
};

export function AlertsPage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<AlertType | ''>('');
  const [clientFilter, setClientFilter] = useState('');
  const [sevFilter, setSevFilter] = useState<AlertSeverity | ''>('');
  const [showResolved, setShowResolved] = useState(false);

  const canRun = me?.role === 'lead' || me?.role === 'admin';

  const alerts = useQuery({
    queryKey: ['alerts', { showResolved }],
    queryFn: () => listAlerts({ includeResolved: showResolved }),
  });
  const clients = useQuery({
    queryKey: ['clients', { includeArchived: true }],
    queryFn: () => listClients(true),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'seen' | 'dismissed' }) =>
      setAlertStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
  const run = useMutation({
    mutationFn: runGenerateAlerts,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const clientName = useMemo(() => {
    const m = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? '—') : '');
  }, [clients.data]);

  const rows = useMemo(() => {
    let list = alerts.data ?? [];
    if (typeFilter) list = list.filter((a) => a.type === typeFilter);
    if (clientFilter) list = list.filter((a) => a.clientId === clientFilter);
    if (sevFilter) list = list.filter((a) => a.severity === sevFilter);
    return list;
  }, [alerts.data, typeFilter, clientFilter, sevFilter]);

  if (!me || !isInternalRole(me.role)) return null;
  if (alerts.isLoading) return <FullPageSpinner />;

  function goTo(clientId: string | null, postId: string | null) {
    if (postId) navigate(`/app/planning?post=${postId}`);
    else if (clientId) navigate(`/app/clients/${clientId}`);
  }

  return (
    <Page>
      <PageHeader
        title="Alertes"
        description="Les points de vigilance détectés automatiquement."
        actions={
          canRun && (
            <Button
              variant="outline"
              size="sm"
              disabled={run.isPending}
              onClick={() => run.mutate()}
            >
              <RefreshCw className={cn('h-4 w-4', run.isPending && 'animate-spin')} />
              {run.isSuccess && !run.isPending
                ? `${run.data.created} créées · ${run.data.dismissed} fermées`
                : 'Lancer la détection'}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="field"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AlertType | '')}
          aria-label="Filtrer par type"
        >
          <option value="">Tous les types</option>
          {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map((t) => (
            <option key={t} value={t}>
              {ALERT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          aria-label="Filtrer par client"
        >
          <option value="">Tous les clients</option>
          {(clients.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={sevFilter}
          onChange={(e) => setSevFilter(e.target.value as AlertSeverity | '')}
          aria-label="Filtrer par sévérité"
        >
          <option value="">Toutes les sévérités</option>
          <option value="critical">Critique</option>
          <option value="warning">Important</option>
          <option value="info">Info</option>
        </select>
        <label className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Afficher les ignorées
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="Aucune alerte"
          description="Tout est sous contrôle — rien ne requiert votre attention."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li
              key={a.id}
              className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border p-3 text-sm',
                SEVERITY[a.severity].card,
                a.status === 'dismissed' && 'opacity-50',
              )}
            >
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', SEVERITY[a.severity].dot)}
                aria-hidden="true"
              />
              <span className="bg-surface/70 rounded border px-1 text-xs">
                {ALERT_TYPE_LABELS[a.type]}
              </span>
              <span className="sr-only">Sévérité : {SEVERITY[a.severity].label}.</span>
              {a.clientId && <span className="font-medium">{clientName(a.clientId)}</span>}
              <span className="min-w-0 flex-1">{a.message}</span>
              {a.status === 'new' && (
                <span className="bg-foreground rounded-full px-1.5 text-[10px] text-background">
                  nouvelle
                </span>
              )}
              <div className="flex gap-1">
                {(a.clientId || a.postId) && (
                  <Button size="sm" variant="ghost" onClick={() => goTo(a.clientId, a.postId)}>
                    Ouvrir
                  </Button>
                )}
                {a.status !== 'seen' && a.status !== 'dismissed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus.mutate({ id: a.id, status: 'seen' })}
                  >
                    Marquer vue
                  </Button>
                )}
                {a.status !== 'dismissed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus.mutate({ id: a.id, status: 'dismissed' })}
                  >
                    Ignorer
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
