import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Inbox, MessageSquareText, Send, TriangleAlert } from 'lucide-react';
import { Page, PageHeader } from '@/components/Page';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import { listPosts, listReviewQueue } from '@/services/posts';
import type { Post } from '@/shared/types';
import { listClientRequests } from '@/services/clientRequests';
import { listAlerts } from '@/services/alerts';
import { listClients } from '@/services/clients';
import { listRecentActivity } from '@/services/clientActivity';
import { ALERT_TYPE_LABELS } from '@/shared/types';
import { activityLabel } from '@/app/clients/tabs/activity';

const DAY_MS = 86_400_000;

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.round(diff / 3_600_000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} j`;
}

export function DashboardPage() {
  const { data: me } = useCurrentProfile();

  const internalQ = useQuery({
    queryKey: ['review-queue', 'internal'],
    queryFn: () => listReviewQueue('internal'),
  });
  const clientQ = useQuery({
    queryKey: ['review-queue', 'client'],
    queryFn: () => listReviewQueue('client'),
  });
  const requestsQ = useQuery({
    queryKey: ['client-requests', 'list', {}],
    queryFn: () => listClientRequests(),
  });
  const alertsQ = useQuery({ queryKey: ['alerts', { showResolved: false }], queryFn: () => listAlerts() });
  const clientsQ = useQuery({
    queryKey: ['clients', { includeArchived: true }],
    queryFn: () => listClients(true),
  });
  const weekQ = useQuery({
    queryKey: ['dashboard', 'week'],
    queryFn: () =>
      listPosts({
        from: new Date().toISOString(),
        to: new Date(Date.now() + 7 * DAY_MS).toISOString(),
      }),
  });
  const activityQ = useQuery({ queryKey: ['dashboard', 'activity'], queryFn: () => listRecentActivity(8) });

  const clientName = useMemo(() => {
    const m = new Map((clientsQ.data ?? []).map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? '—') : '—');
  }, [clientsQ.data]);

  const openRequests = (requestsQ.data ?? []).filter((r) => r.status !== 'traitee');
  const newAlerts = (alertsQ.data ?? []).filter((a) => a.status === 'new');
  const hasCritical = newAlerts.some((a) => a.severity === 'critical');

  const weekPosts = weekQ.data;
  const byDay = useMemo(() => {
    const groups = new Map<string, Post[]>();
    for (const p of [...(weekPosts ?? [])].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))) {
      const key = parisDateKey(p.scheduledAt);
      const arr = groups.get(key) ?? [];
      arr.push(p);
      groups.set(key, arr);
    }
    return [...groups.entries()];
  }, [weekPosts]);

  const watchlist = useMemo(() => {
    const byClient = new Map<string, string[]>();
    for (const a of alertsQ.data ?? []) {
      if (!a.clientId) continue;
      if (!['calendar_gap', 'client_inactive', 'validation_overdue'].includes(a.type)) continue;
      const arr = byClient.get(a.clientId) ?? [];
      if (!arr.includes(ALERT_TYPE_LABELS[a.type])) arr.push(ALERT_TYPE_LABELS[a.type]);
      byClient.set(a.clientId, arr);
    }
    return [...byClient.entries()].slice(0, 6);
  }, [alertsQ.data]);

  if (!me || !isInternalRole(me.role)) return null;

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const firstName = (me.fullName || me.email).split(' ')[0];

  return (
    <Page>
      <PageHeader title={`Bonjour ${firstName}`} description={today} />

      {/* À traiter */}
      <div className="mb-8 grid gap-4 [&>*]:animate-in [&>*]:fade-in [&>*]:slide-in-from-bottom-2 [&>*]:fill-mode-backwards [&>*]:duration-300 [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms] sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          to="/app/a-valider"
          icon={Inbox}
          label="À valider en interne"
          value={internalQ.data?.length}
          loading={internalQ.isLoading}
        />
        <StatTile
          to="/app/a-valider"
          icon={Send}
          label="En attente du client"
          value={clientQ.data?.length}
          loading={clientQ.isLoading}
        />
        <StatTile
          to="/app/demandes"
          icon={MessageSquareText}
          label="Demandes clients ouvertes"
          value={openRequests.length}
          loading={requestsQ.isLoading}
        />
        <StatTile
          to="/app/alertes"
          icon={TriangleAlert}
          label="Alertes non vues"
          value={newAlerts.length}
          loading={alertsQ.isLoading}
          tone={hasCritical ? 'danger' : newAlerts.length > 0 ? 'warning' : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cette semaine */}
        <section className="lg:col-span-2">
          <SectionTitle to="/app/planning" label="Cette semaine" />
          <div className="surface-card">
            {weekQ.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : byDay.length === 0 ? (
              <EmptyState
                title="Rien de prévu"
                description="Aucun post planifié sur les 7 prochains jours. Ouvrez le planning pour en créer."
              />
            ) : (
              <ul className="divide-border/60 divide-y">
                {byDay.map(([day, posts]) => (
                  <li key={day} className="p-3">
                    <p className="text-muted-foreground mb-1.5 px-1 text-xs font-medium uppercase tracking-wide">
                      {dayLabel(day)}
                    </p>
                    <ul className="space-y-0.5">
                      {posts.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/app/planning?post=${p.id}`}
                            className="hover:bg-surface-2 flex items-center gap-3 rounded-md px-1 py-1.5 text-sm"
                          >
                            <span className="text-muted-foreground w-12 shrink-0 tabular-nums">
                              {parisTimeLabel(p.scheduledAt)}
                            </span>
                            <NetworkIcon network={p.network} />
                            <span className="min-w-0 flex-1 truncate">
                              <span className="font-medium">{clientName(p.clientId)}</span>
                              <span className="text-muted-foreground">
                                {' · '}
                                {p.caption || 'Sans légende'}
                              </span>
                            </span>
                            <StatusBadge status={p.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Colonne droite */}
        <div className="space-y-6">
          <section>
            <SectionTitle label="Clients à surveiller" />
            <div className="surface-card">
              {alertsQ.isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : watchlist.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">
                  Aucun signal — tous les clients sont à jour.
                </p>
              ) : (
                <ul className="divide-border/60 divide-y">
                  {watchlist.map(([clientId, issues]) => (
                    <li key={clientId}>
                      <Link
                        to={`/app/clients/${clientId}`}
                        className="hover:bg-surface-2 flex items-center justify-between gap-3 p-3 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{clientName(clientId)}</span>
                          <span className="text-warning-strong text-xs">{issues.join(' · ')}</span>
                        </span>
                        <ArrowRight
                          className="text-muted-foreground h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <SectionTitle label="Activité récente" />
            <div className="surface-card">
              {activityQ.isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (activityQ.data ?? []).length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">Rien à afficher.</p>
              ) : (
                <ul className="divide-border/60 divide-y">
                  {(activityQ.data ?? []).map((e) => (
                    <li key={e.historyId} className="flex items-start gap-3 p-3 text-sm">
                      <NetworkIcon network={e.network} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {activityLabel(e)}
                          <span className="text-muted-foreground"> · {clientName(e.clientId)}</span>
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {e.actorName || 'Système'} · {relative(e.createdAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </Page>
  );
}

function StatTile({
  to,
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  to: string;
  icon: typeof Inbox;
  label: string;
  value?: number;
  loading?: boolean;
  tone?: 'danger' | 'warning';
}) {
  return (
    <Link
      to={to}
      className={cn(
        'surface-card group hover:shadow-md flex flex-col gap-3 p-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5',
        tone === 'danger' && 'ring-danger-border bg-danger-surface ring-1',
        tone === 'warning' && 'ring-warning-border bg-warning-surface ring-1',
      )}
    >
      <span
        className={cn(
          'text-muted-foreground flex items-center gap-2 text-xs font-medium',
          tone === 'danger' && 'text-danger-strong',
          tone === 'warning' && 'text-warning-strong',
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        {loading ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span className="text-[1.75rem] font-semibold tabular-nums leading-none tracking-tight">
            {value ?? 0}
          </span>
        )}
        <ArrowRight className="text-muted-foreground h-4 w-4 -translate-x-1 self-center opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </span>
    </Link>
  );
}

function SectionTitle({ label, to }: { label: string; to?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-section">{label}</h2>
      {to && (
        <Link
          to={to}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
        >
          Tout voir <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function dayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  const todayKey = parisDateKey(new Date().toISOString());
  const tomorrowKey = parisDateKey(new Date(Date.now() + DAY_MS).toISOString());
  if (dateKey === todayKey) return "Aujourd'hui";
  if (dateKey === tomorrowKey) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
}
