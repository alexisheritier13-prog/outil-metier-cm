import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  CalendarRange,
  GaugeCircle,
  Inbox,
  MessageSquareText,
  Send,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { Page } from '@/components/Page';
import { EmptyState } from '@/components/EmptyState';
import { UserAvatar } from '@/components/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { POST_STATUSES, POST_STATUS_LABELS, type PostStatus } from '@/shared/constants/postStatus';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import { listPosts, listReviewQueue } from '@/services/posts';
import type { Post } from '@/shared/types';
import { listClientRequests } from '@/services/clientRequests';
import { listAlerts } from '@/services/alerts';
import { listClients } from '@/services/clients';
import { listRecentActivity } from '@/services/clientActivity';
import { ALERT_TYPE_LABELS } from '@/shared/types';
import { activityLabel } from '@/app/clients/tabs/activity';

type IconType = typeof Inbox;

const PIPELINE_STATUSES = POST_STATUSES.filter((s) => s !== 'published');
const STATUS_BAR_COLOR: Record<PostStatus, string> = {
  draft: 'oklch(0.75 0.015 262)',
  internal_review: 'var(--info)',
  client_review: 'var(--warning)',
  approved: 'var(--success)',
  scheduled: 'var(--primary)',
  published: 'var(--muted-foreground)',
};

const TILE_ACCENT = {
  primary: 'bg-primary text-primary-foreground',
  info: 'bg-info text-info-foreground',
  success: 'bg-success text-success-foreground',
} as const;

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
  const pipelineQ = useQuery({
    queryKey: ['dashboard', 'pipeline'],
    queryFn: () => listPosts({ statuses: PIPELINE_STATUSES }),
  });

  const pipelineCounts = useMemo(() => {
    const c = Object.fromEntries(PIPELINE_STATUSES.map((s) => [s, 0])) as Record<PostStatus, number>;
    for (const p of pipelineQ.data ?? []) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [pipelineQ.data]);
  const pipelineTotal = (pipelineQ.data ?? []).length;

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
      <header className="mb-6 flex items-center gap-3">
        <UserAvatar name={me.fullName || me.email} avatarUrl={me.avatarUrl} size="lg" />
        <div className="space-y-1">
          <h1 className="text-title tracking-tight">Bonjour {firstName}</h1>
          <p className="text-muted-foreground text-sm capitalize">{today}</p>
        </div>
      </header>

      {/* À traiter */}
      <div className="mb-6 grid gap-4 [&>*]:animate-in [&>*]:fade-in [&>*]:slide-in-from-bottom-2 [&>*]:fill-mode-backwards [&>*]:duration-300 [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms] sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          to="/app/a-valider"
          icon={Inbox}
          accent="primary"
          label="À valider en interne"
          value={internalQ.data?.length}
          loading={internalQ.isLoading}
        />
        <StatTile
          to="/app/a-valider"
          icon={Send}
          accent="info"
          label="En attente du client"
          value={clientQ.data?.length}
          loading={clientQ.isLoading}
        />
        <StatTile
          to="/app/demandes"
          icon={MessageSquareText}
          accent="success"
          label="Demandes ouvertes"
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

      <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards mb-6 duration-300 [animation-delay:220ms]">
        <ProductionPanel
          counts={pipelineCounts}
          total={pipelineTotal}
          loading={pipelineQ.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cette semaine */}
        <section className="lg:col-span-2">
          <SectionTitle to="/app/planning" icon={CalendarRange} label="Cette semaine" />
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
            <SectionTitle icon={Users} label="Clients à surveiller" />
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
            <SectionTitle icon={Activity} label="Activité récente" />
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
  accent = 'primary',
  tone,
}: {
  to: string;
  icon: IconType;
  label: string;
  value?: number;
  loading?: boolean;
  accent?: keyof typeof TILE_ACCENT;
  tone?: 'danger' | 'warning';
}) {
  return (
    <Link
      to={to}
      className={cn(
        'surface-card group flex items-center gap-3.5 p-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
        tone === 'danger' && 'ring-danger-border bg-danger-surface ring-1',
        tone === 'warning' && 'ring-warning-border bg-warning-surface ring-1',
      )}
    >
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
          tone === 'danger'
            ? 'bg-danger text-danger-foreground'
            : tone === 'warning'
              ? 'bg-warning text-warning-foreground'
              : TILE_ACCENT[accent],
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        {loading ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span className="block text-[1.65rem] font-semibold tabular-nums leading-none tracking-tight">
            {value ?? 0}
          </span>
        )}
        <span
          className={cn(
            'mt-1 block truncate text-xs font-medium',
            tone === 'danger'
              ? 'text-danger-strong'
              : tone === 'warning'
                ? 'text-warning-strong'
                : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
      </span>
      <ArrowRight
        className="text-muted-foreground h-4 w-4 shrink-0 -translate-x-1 self-center opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
        aria-hidden="true"
      />
    </Link>
  );
}

function ProductionPanel({
  counts,
  total,
  loading,
}: {
  counts: Record<PostStatus, number>;
  total: number;
  loading?: boolean;
}) {
  return (
    <section className="surface-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid h-8 w-8 shrink-0 place-items-center rounded-lg">
            <GaugeCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-section leading-tight">Production en cours</h2>
            <p className="text-muted-foreground text-xs">Posts en préparation, hors publiés</p>
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums leading-none tracking-tight">
            {total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {PIPELINE_STATUSES.map((s) => (
            <Skeleton key={s} className="h-6 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun post en préparation pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {PIPELINE_STATUSES.map((s) => {
            const n = counts[s];
            const max = Math.max(...PIPELINE_STATUSES.map((k) => counts[k]), 1);
            return (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground flex w-40 shrink-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_BAR_COLOR[s] }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{POST_STATUS_LABELS[s]}</span>
                </span>
                <span className="bg-surface-2 relative h-6 flex-1 overflow-hidden rounded-md">
                  <span
                    className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.max((n / max) * 100, n > 0 ? 6 : 0)}%`,
                      backgroundColor: STATUS_BAR_COLOR[s],
                    }}
                    aria-hidden="true"
                  />
                </span>
                <span className="w-6 shrink-0 text-right font-semibold tabular-nums">{n}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SectionTitle({ label, to, icon: Icon }: { label: string; to?: string; icon?: IconType }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-section flex items-center gap-2">
        {Icon && (
          <span className="bg-primary text-primary-foreground grid h-6 w-6 shrink-0 place-items-center rounded-md">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
        {label}
      </h2>
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
