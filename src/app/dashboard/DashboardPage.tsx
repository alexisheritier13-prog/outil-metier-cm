import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarRange,
  CheckCircle2,
  GaugeCircle,
  Inbox,
  MessageSquareText,
  Send,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { UserAvatar } from '@/components/UserAvatar';
import { FirstRunGuide } from './FirstRunGuide';
import { Skeleton } from '@/components/ui/skeleton';
import { NetworkIcon } from '@/components/NetworkIcon';
import { MiniBarChart, type MiniBar } from '@/components/MiniBarChart';
import { SectionCard } from './SectionCard';
import { KpiCard } from './KpiCard';
import { PostRow } from './PostRow';
import { clientColor, clientInitials } from '@/lib/clientColor';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { POST_STATUSES, POST_STATUS_LABELS, type PostStatus } from '@/shared/constants/postStatus';
import { parisDateKey } from '@/shared/utils/tz';
import { listPosts, listReviewQueue } from '@/services/posts';
import { listInternalUsers } from '@/services/users';
import { useChangePostStatus } from '@/app/posts/usePosts';
import type { Alert, Post } from '@/shared/types';
import { listClientRequests } from '@/services/clientRequests';
import { listAlerts, setAlertStatus } from '@/services/alerts';
import { listClients } from '@/services/clients';
import { listRecentActivity } from '@/services/clientActivity';
import { ALERT_TYPE_LABELS } from '@/shared/types';
import { activityLabel } from '@/app/clients/tabs/activity';
import { relativeAge } from '@/lib/relativeTime';
import {
  fetchFirstTimeApprovalRate,
  fetchMonthlyPostCounts,
  pickPriorityAlerts,
  STEP_BAR_COLOR,
} from './dashboardMetrics';

const PIPELINE_STATUSES = POST_STATUSES.filter((s) => s !== 'published');
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const DAY_MS = 86_400_000;
const ACTIVITY_VISIBLE = 5;

export function DashboardPage() {
  const { data: me } = useCurrentProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activityExpanded, setActivityExpanded] = useState(false);
  const year = new Date().getFullYear();

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
  const authorsQ = useQuery({ queryKey: ['internal-users-lite'], queryFn: listInternalUsers });
  const weekQ = useQuery({
    queryKey: ['dashboard', 'week'],
    queryFn: () =>
      listPosts({
        from: new Date().toISOString(),
        to: new Date(Date.now() + 7 * DAY_MS).toISOString(),
      }),
  });
  const activityQ = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => listRecentActivity(10),
  });
  const monthlyQ = useQuery({
    queryKey: ['dashboard', 'monthly-posts', year],
    queryFn: () => fetchMonthlyPostCounts(year),
  });
  const firstTimeQ = useQuery({
    queryKey: ['dashboard', 'first-time-approval'],
    queryFn: fetchFirstTimeApprovalRate,
  });
  const changeStatus = useChangePostStatus();
  const pipelineQ = useQuery({
    queryKey: ['dashboard', 'pipeline'],
    queryFn: () => listPosts({ statuses: PIPELINE_STATUSES }),
  });
  const markAlertSeen = useMutation({
    mutationFn: (id: string) => setAlertStatus(id, 'seen'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
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

  const authorById = useMemo(
    () => new Map((authorsQ.data ?? []).map((a) => [a.id, a])),
    [authorsQ.data],
  );

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
  const weekTotal = weekPosts?.length ?? 0;
  const weekClientCount = useMemo(
    () => new Set((weekPosts ?? []).map((p) => p.clientId)).size,
    [weekPosts],
  );

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

  const priorityAlerts = useMemo(() => pickPriorityAlerts(newAlerts, 2), [newAlerts]);

  const monthlyBars: MiniBar[] = useMemo(
    () =>
      (monthlyQ.data ?? []).map((m) => ({
        key: String(m.month),
        label: MONTH_LABELS[m.month] ?? '',
        segments: [
          { value: m.published, color: 'var(--muted-foreground)', label: 'Publiés' },
          { value: m.scheduled, color: 'var(--primary)', label: 'Planifiés' },
        ],
      })),
    [monthlyQ.data],
  );
  const peakMonthKey = useMemo(() => {
    let best: { key: string; total: number } | null = null;
    for (const bar of monthlyBars) {
      const total = bar.segments.reduce((s, seg) => s + seg.value, 0);
      if (total > 0 && (!best || total > best.total)) best = { key: bar.key, total };
    }
    return best?.key;
  }, [monthlyBars]);

  function openAlert(a: Alert) {
    if (a.status === 'new') markAlertSeen.mutate(a.id);
    if (a.postId) navigate(`/app/planning?post=${a.postId}`);
    else if (a.clientId) navigate(`/app/clients/${a.clientId}`);
    else navigate('/app/alertes');
  }

  if (!me || !isInternalRole(me.role)) return null;

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const firstName = (me.fullName || me.email).split(' ')[0];

  const hasClients = (clientsQ.data ?? []).length > 0;
  const hasPosts = (pipelineQ.data ?? []).length > 0 || (weekQ.data ?? []).length > 0;
  const settingUp =
    !clientsQ.isLoading && !pipelineQ.isLoading && !weekQ.isLoading && (!hasClients || !hasPosts);

  if (settingUp) {
    return (
      <div className="animate-in fade-in mx-auto max-w-xl px-5 py-8 duration-300 sm:px-8">
        <header className="mb-6 flex items-center gap-3">
          <UserAvatar name={me.fullName || me.email} avatarUrl={me.avatarUrl} size="lg" />
          <div>
            <h1 className="text-title tracking-tight">Bonjour {firstName}</h1>
            <p className="text-muted-foreground text-sm capitalize">{today}</p>
          </div>
        </header>
        <FirstRunGuide hasClients={hasClients} hasPosts={hasPosts} />
      </div>
    );
  }

  const activityRows = activityQ.data ?? [];
  const activityVisible = activityExpanded ? activityRows : activityRows.slice(0, ACTIVITY_VISIBLE);
  const activityHidden = activityRows.slice(ACTIVITY_VISIBLE);
  const oldestHiddenAt = activityHidden[activityHidden.length - 1]?.createdAt;

  return (
    <div className="animate-in fade-in flex flex-col gap-4 px-5 py-5 duration-300 ease-out sm:px-8 lg:h-full lg:gap-5 lg:overflow-hidden">
      <header className="flex shrink-0 items-center gap-2.5">
        <UserAvatar name={me.fullName || me.email} avatarUrl={me.avatarUrl} size="md" />
        <h1 className="text-title tracking-tight">
          Bonjour {firstName}
          <span className="text-muted-foreground ml-2 text-sm font-normal capitalize">{today}</span>
        </h1>
      </header>

      <PriorityBanner
        alerts={priorityAlerts}
        clientName={clientName}
        onTreat={() => priorityAlerts[0] && openAlert(priorityAlerts[0])}
        loading={alertsQ.isLoading}
      />

      {/* À traiter */}
      <div className="grid shrink-0 gap-3 [&>*]:animate-in [&>*]:fade-in [&>*]:slide-in-from-bottom-2 [&>*]:fill-mode-backwards [&>*]:duration-300 [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms] sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          to="/app/a-valider"
          icon={Inbox}
          accent="primary"
          label="À valider en interne"
          value={internalQ.data?.length}
          loading={internalQ.isLoading}
          context={oldestContext(internalQ.data, (p) => p.statusChangedAt)}
        />
        <KpiCard
          to="/app/a-valider"
          icon={Send}
          accent="info"
          label="En attente du client"
          value={clientQ.data?.length}
          loading={clientQ.isLoading}
          context={oldestContext(clientQ.data, (p) => p.statusChangedAt)}
        />
        <KpiCard
          to="/app/demandes"
          icon={MessageSquareText}
          accent="success"
          label="Demandes ouvertes"
          value={openRequests.length}
          loading={requestsQ.isLoading}
          context={oldestContext(openRequests, (r) => r.createdAt)}
        />
        <KpiCard
          to="/app/alertes"
          icon={TriangleAlert}
          label="Alertes non vues"
          value={newAlerts.length}
          loading={alertsQ.isLoading}
          tone={hasCritical ? 'danger' : newAlerts.length > 0 ? 'warning' : undefined}
          context={
            newAlerts.some((a) => a.severity === 'critical')
              ? `${newAlerts.filter((a) => a.severity === 'critical').length} critique${newAlerts.filter((a) => a.severity === 'critical').length > 1 ? 's' : ''}`
              : oldestContext(newAlerts, (a) => a.createdAt)
          }
        />
      </div>

      <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
        {/* Cette semaine */}
        <SectionCard
          icon={CalendarRange}
          title="Cette semaine"
          subtitle={
            weekTotal > 0
              ? `${weekTotal} post${weekTotal > 1 ? 's' : ''}, ${weekClientCount} client${weekClientCount > 1 ? 's' : ''}`
              : undefined
          }
          action={
            <Link
              to="/app/planning"
              className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs font-medium"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          }
          className="min-w-0 lg:min-h-0 lg:flex-1"
          bodyClassName="overflow-y-auto lg:min-h-0 lg:flex-1"
          dataTour="dash-week"
        >
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
            <div className="space-y-3 p-3">
              {byDay.map(([day, posts]) => (
                <div key={day}>
                  <p className="text-muted-foreground mb-1.5 px-1 text-xs font-medium uppercase tracking-wide">
                    {dayLabel(day)}
                  </p>
                  <div className="space-y-1.5">
                    {posts.map((p) => {
                      const due =
                        p.status === 'scheduled' && new Date(p.scheduledAt).getTime() <= Date.now();
                      return (
                        <PostRow
                          key={p.id}
                          post={p}
                          clientName={clientName(p.clientId)}
                          author={authorById.get(p.authorId)}
                          due={due}
                          markPending={changeStatus.isPending}
                          onMarkPublished={() =>
                            changeStatus.mutate(
                              { id: p.id, to: 'published' },
                              { onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }) },
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Colonne droite — défile comme un bloc, en dessous du graphe le reste est secondaire */}
        <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:overflow-y-auto">
          <SectionCard
            icon={TrendingUp}
            title="Posts publiés par mois"
            subtitle="Tous clients confondus"
            className="shrink-0"
            bodyClassName="p-4"
          >
            {monthlyQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <MiniBarChart bars={monthlyBars} highlightKey={peakMonthKey} />
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="bg-primary h-2 w-2 rounded-full" /> Planifiés
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="bg-muted-foreground h-2 w-2 rounded-full" /> Publiés
                  </span>
                </div>
              </>
            )}
          </SectionCard>

          <div className="shrink-0">
            <ProductionPanel counts={pipelineCounts} total={pipelineTotal} loading={pipelineQ.isLoading} />
          </div>

          <div className="surface-card shrink-0 p-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              Validé du premier coup <span className="text-muted-foreground/70">· 30 derniers jours</span>
            </p>
            {firstTimeQ.isLoading ? (
              <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            ) : firstTimeQ.data ? (
              <FirstTimeGauge rate={firstTimeQ.data.rate} total={firstTimeQ.data.total} />
            ) : (
              <p className="text-muted-foreground py-2 text-sm">
                Pas assez de posts récents pour ce chiffre.
              </p>
            )}
          </div>

          <SectionCard icon={Users} title="Clients à surveiller" accent="warning" className="shrink-0">
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
              <ul className="divide-border/60 max-h-[26vh] divide-y overflow-y-auto">
                {watchlist.map(([clientId, issues]) => {
                  const cc = clientColor(clientId);
                  return (
                    <li key={clientId}>
                      <Link
                        to={`/app/clients/${clientId}`}
                        className="hover:bg-surface-2 flex items-center gap-3 p-3 text-sm"
                      >
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: cc.soft, color: cc.ink }}
                          aria-hidden="true"
                        >
                          {clientInitials(clientName(clientId))}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{clientName(clientId)}</span>
                          <span className="text-warning-strong text-xs">{issues.join(' · ')}</span>
                        </span>
                        <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard icon={Activity} title="Activité récente" className="shrink-0">
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- zone défilable sans enfant focusable, rendue accessible au clavier (axe) */}
            <div tabIndex={0} role="region" aria-label="Activité récente">
              {activityQ.isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : activityRows.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">Rien à afficher.</p>
              ) : (
                <ul className="divide-border/60 relative divide-y">
                  {activityVisible.map((e, i) => (
                    <li key={e.historyId} className="relative flex items-start gap-3 p-3 text-sm">
                      {i < activityVisible.length - 1 && (
                        <span className="bg-border absolute left-[1.6rem] top-9 h-[calc(100%-0.5rem)] w-px" />
                      )}
                      <span className="bg-primary-surface text-primary-strong relative grid h-6 w-6 shrink-0 place-items-center rounded-full">
                        <NetworkIcon network={e.network} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {activityLabel(e)}
                          <span className="text-muted-foreground"> · {clientName(e.clientId)}</span>
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {e.actorName || 'Système'} · {relativeAge(e.createdAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                  {!activityExpanded && activityHidden.length > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setActivityExpanded(true)}
                        className="hover:bg-surface-2 text-muted-foreground flex w-full items-center gap-2 p-3 text-left text-sm transition-colors"
                      >
                        <span className="bg-surface-3 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-medium">
                          +{activityHidden.length}
                        </span>
                        {activityHidden.length} action{activityHidden.length > 1 ? 's' : ''} de plus
                        {oldestHiddenAt && <> · {relativeAge(oldestHiddenAt)}</>}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
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
    <SectionCard icon={GaugeCircle} title="Production en cours" subtitle={loading ? '…' : `${total} post${total > 1 ? 's' : ''} hors publiés`} bodyClassName="p-4">
      {loading ? (
        <div className="space-y-2">
          {PIPELINE_STATUSES.map((s) => (
            <Skeleton key={s} className="h-5 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun post en préparation pour le moment.</p>
      ) : (
        <ul className="space-y-1.5">
          {PIPELINE_STATUSES.map((s) => {
            const n = counts[s];
            const max = Math.max(...PIPELINE_STATUSES.map((k) => counts[k]), 1);
            return (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground flex w-32 shrink-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STEP_BAR_COLOR[s] }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{POST_STATUS_LABELS[s]}</span>
                </span>
                <span className="bg-surface-2 relative h-5 flex-1 overflow-hidden rounded-md">
                  <span
                    className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.max((n / max) * 100, n > 0 ? 6 : 0)}%`,
                      backgroundColor: STEP_BAR_COLOR[s],
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
    </SectionCard>
  );
}

/** Ligne de contexte honnête : l'âge du plus ancien élément de la liste, jamais une valeur inventée. */
function oldestContext<T>(items: T[] | undefined, getDate: (item: T) => string): string | undefined {
  if (!items || items.length === 0) return undefined;
  const oldest = items.reduce((a, b) => (getDate(a) < getDate(b) ? a : b));
  return `le plus ancien : ${relativeAge(getDate(oldest))}`;
}

function PriorityBanner({
  alerts,
  clientName,
  onTreat,
  loading,
}: {
  alerts: Alert[];
  clientName: (id: string | null) => string;
  onTreat: () => void;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-16 w-full shrink-0 rounded-2xl" />;

  if (alerts.length === 0) {
    return (
      <div className="surface-card flex shrink-0 items-center gap-3 p-4">
        <span className="bg-success text-success-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">Rien d'urgent aujourd'hui. Bon travail.</p>
      </div>
    );
  }

  return (
    <div className="surface-card flex shrink-0 items-center gap-3 p-4">
      <span className="bg-surface-inverse text-surface-inverse-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl">
        <BellRing className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide">Priorité du jour</p>
        <p className="truncate text-sm">
          {alerts.map((a, i) => (
            <span key={a.id}>
              {i > 0 && ' '}
              {highlightClient(a.message, a.clientId ? clientName(a.clientId) : null, a.clientId)}
            </span>
          ))}
        </p>
      </div>
      <button
        type="button"
        onClick={onTreat}
        className="bg-primary text-primary-foreground shrink-0 rounded-lg px-4 py-2 text-sm font-medium"
      >
        Traiter
      </button>
    </div>
  );
}

function highlightClient(message: string, name: string | null, clientId: string | null) {
  if (!name || !clientId || !message.includes(name)) return message;
  const [before, after] = message.split(name);
  const cc = clientColor(clientId);
  return (
    <>
      {before}
      <span style={{ color: cc.ink }} className="font-semibold">
        {name}
      </span>
      {after}
    </>
  );
}

function FirstTimeGauge({ rate, total }: { rate: number; total: number }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--success) ${rate}%, var(--surface-3) ${rate}% 100%)`,
        }}
      >
        <span className="bg-surface absolute inset-1 grid place-items-center rounded-full text-sm font-bold tabular-nums">
          {rate}%
        </span>
      </div>
      <p className="text-muted-foreground mt-2 text-center text-[11px]">{total} posts · 30 j</p>
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
