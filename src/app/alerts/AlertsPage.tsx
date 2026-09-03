import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BellRing, ChevronRight, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { cn } from '@/lib/utils';
import { relativeAge } from '@/lib/relativeTime';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { ALERT_TYPE_LABELS, type Alert, type AlertSeverity, type AlertType } from '@/shared/types';
import { listClients } from '@/services/clients';
import { listAlerts, runGenerateAlerts, setAlertStatus } from '@/services/alerts';

const SEV_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
const SEV_DOT: Record<AlertSeverity, string> = {
  critical: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
};
const SEV_LABEL: Record<AlertSeverity, string> = {
  critical: 'Critique',
  warning: 'Important',
  info: 'Info',
};

interface Group {
  type: AlertType;
  alerts: Alert[];
  worst: AlertSeverity;
  newCount: number;
}

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

  const groups = useMemo<Group[]>(() => {
    let list = alerts.data ?? [];
    if (typeFilter) list = list.filter((a) => a.type === typeFilter);
    if (clientFilter) list = list.filter((a) => a.clientId === clientFilter);
    if (sevFilter) list = list.filter((a) => a.severity === sevFilter);

    const byType = new Map<AlertType, Alert[]>();
    for (const a of list) {
      const arr = byType.get(a.type);
      if (arr) arr.push(a);
      else byType.set(a.type, [a]);
    }

    return [...byType.entries()]
      .map(([type, arr]) => ({
        type,
        alerts: arr,
        worst: arr.reduce<AlertSeverity>(
          (w, a) => (SEV_RANK[a.severity] < SEV_RANK[w] ? a.severity : w),
          'info',
        ),
        newCount: arr.filter((a) => a.status === 'new').length,
      }))
      .sort((a, b) => SEV_RANK[a.worst] - SEV_RANK[b.worst] || b.alerts.length - a.alerts.length);
  }, [alerts.data, typeFilter, clientFilter, sevFilter]);

  const total = groups.reduce((n, g) => n + g.alerts.length, 0);

  if (!me || !isInternalRole(me.role)) return null;
  if (alerts.isLoading) return <FullPageSpinner />;

  function open(a: Alert) {
    if (a.status === 'new') setStatus.mutate({ id: a.id, status: 'seen' });
    if (a.postId) navigate(`/app/planning?post=${a.postId}`);
    else if (a.clientId) navigate(`/app/clients/${a.clientId}`);
  }

  return (
    <Page>
      <PageHeader
        title="Alertes"
        description="Les points de vigilance détectés automatiquement, regroupés par situation."
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

      {total === 0 ? (
        <EmptyState
          icon={BellRing}
          title="Aucune alerte"
          description="Tout est sous contrôle, rien ne requiert votre attention."
        />
      ) : (
        <div className="surface-card [&>details]:border-border/70 [&>details:not(:last-child)]:border-b px-4">
          {groups.map((g) => (
            <details key={g.type} open={g.worst === 'critical' || groups.length <= 2} className="group">
              <summary className="focus-visible:ring-primary/30 -mx-1.5 flex cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 py-3 focus-visible:outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none"
                  aria-hidden
                />
                <span
                  className={cn('size-2 shrink-0 rounded-full', SEV_DOT[g.worst])}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{ALERT_TYPE_LABELS[g.type]}</span>
                <span className="text-muted-foreground text-xs">
                  {g.alerts.length}
                  {g.newCount > 0 && ` · ${g.newCount} nouvelle${g.newCount > 1 ? 's' : ''}`}
                </span>
                <span className="sr-only">Sévérité : {SEV_LABEL[g.worst]}.</span>
                {g.newCount > 0 && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground ml-auto text-xs hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      g.alerts
                        .filter((a) => a.status === 'new')
                        .forEach((a) => setStatus.mutate({ id: a.id, status: 'seen' }));
                    }}
                  >
                    Tout marquer vu
                  </button>
                )}
              </summary>

              <ul className="divide-border/60 divide-y pb-1">
                {g.alerts.map((a) => (
                  <li key={a.id} className="group/row relative">
                    <button
                      type="button"
                      onClick={() => open(a)}
                      className="hover:bg-surface-2 flex w-full items-baseline gap-2 rounded-lg py-2 pl-6 pr-9 text-left text-sm"
                    >
                      {a.status === 'new' && (
                        <span
                          className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                          aria-label="Nouvelle"
                        />
                      )}
                      {a.clientId && (
                        <span className="shrink-0 font-medium">{clientName(a.clientId)}</span>
                      )}
                      <span className="text-muted-foreground min-w-0 flex-1">{a.message}</span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {relativeAge(a.createdAt)}
                      </span>
                    </button>
                    {a.status !== 'dismissed' && (
                      <button
                        type="button"
                        aria-label="Ignorer cette alerte"
                        onClick={() => setStatus.mutate({ id: a.id, status: 'dismissed' })}
                        className="text-muted-foreground hover:bg-surface-3 hover:text-foreground focus-visible:ring-primary/30 absolute right-1.5 top-1.5 rounded p-1 opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 group-hover/row:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </Page>
  );
}
