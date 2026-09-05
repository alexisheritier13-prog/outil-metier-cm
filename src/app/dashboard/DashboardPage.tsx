import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarRange,
  CheckCircle2,
  Inbox,
  MessageSquareText,
  Plus,
  Send,
  SlidersHorizontal,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { UserAvatar } from '@/components/UserAvatar';
import { FirstRunGuide } from './FirstRunGuide';
import { Skeleton } from '@/components/ui/skeleton';
import { MiniBarChart, type MiniBar } from '@/components/MiniBarChart';
import { SectionCard } from './SectionCard';
import { KpiCard } from './KpiCard';
import { PostRow } from './PostRow';
import { HalfGauge } from './HalfGauge';
import { ActivityFeed } from './ActivityFeed';
import { clientColor, clientInitials } from '@/lib/clientColor';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { POST_STATUSES } from '@/shared/constants/postStatus';
import { parisDateKey } from '@/shared/utils/tz';
import { listPosts, listReviewQueue } from '@/services/posts';
import { listInternalUsers } from '@/services/users';
import { useChangePostStatus } from '@/app/posts/usePosts';
import type { Alert } from '@/shared/types';
import { listClientRequests } from '@/services/clientRequests';
import { listAlerts, setAlertStatus } from '@/services/alerts';
import { listClients } from '@/services/clients';
import { listRecentActivity } from '@/services/clientActivity';
import { ALERT_TYPE_LABELS } from '@/shared/types';
import { relativeAge } from '@/lib/relativeTime';
import { fetchFirstTimeApprovalRate, fetchMonthlyPostCounts, pickPriorityAlerts } from './dashboardMetrics';

const PIPELINE_STATUSES = POST_STATUSES.filter((s) => s !== 'published');
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const DAY_MS = 86_400_000;

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
    queryFn: () => fetchFirstTimeApprovalRate(),
  });
  // Comparaison honnête au mois précédent (mêmes règles, fenêtre décalée de 30 j)
  // plutôt qu'une variation inventée.
  const previousFirstTimeQ = useQuery({
    queryKey: ['dashboard', 'first-time-approval', 'previous'],
    queryFn: () => fetchFirstTimeApprovalRate(30),
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
  const weekList = useMemo(
    () => [...(weekPosts ?? [])].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [weekPosts],
  );
  const weekTotal = weekPosts?.length ?? 0;
  const weekClientCount = useMemo(
    () => new Set((weekPosts ?? []).map((p) => p.clientId)).size,
    [weekPosts],
  );
  const weekRangeLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return `du ${fmt(new Date())} au ${fmt(new Date(Date.now() + 6 * DAY_MS))}`;
  }, []);

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

  return (
    <div className="animate-in fade-in flex flex-col gap-4 px-5 py-5 duration-300 ease-out sm:px-8 lg:h-full lg:gap-5 lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <UserAvatar name={me.fullName || me.email} avatarUrl={me.avatarUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.03em]">
            Hey, {firstName}
          </h1>
          <p className="text-muted-foreground text-[13px] capitalize">{today}</p>
        </div>
        <Link
          to="/app/planning?new=1"
          className="shadow-primary bg-primary text-primary-foreground ml-auto flex h-11 shrink-0 items-center gap-1.5 rounded-[15px] px-4 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Nouveau post
        </Link>
      </header>

      <PriorityBanner
        alerts={priorityAlerts}
        clientName={clientName}
        onTreat={() => priorityAlerts[0] && openAlert(priorityAlerts[0])}
        loading={alertsQ.isLoading}
      />

      {/* À traiter */}
      <div className="grid shrink-0 grid-cols-1 gap-3.5 [&>*]:animate-in [&>*]:fade-in [&>*]:slide-in-from-bottom-2 [&>*]:fill-mode-backwards [&>*]:duration-300 [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms] sm:grid-cols-2 min-[1100px]:grid-cols-4">
        <KpiCard
          to="/app/a-valider"
          icon={Inbox}
          accent="info"
          label="À valider en interne"
          value={internalQ.data?.length}
          loading={internalQ.isLoading}
          context={oldestContext(internalQ.data, (p) => p.statusChangedAt)}
        />
        <KpiCard
          to="/app/a-valider"
          icon={Send}
          accent="warning"
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
          accent="danger"
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

      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.15fr_1fr]">
        {/* Cette semaine */}
        <SectionCard
          icon={CalendarRange}
          title="Cette semaine"
          subtitle={
            weekTotal > 0
              ? `${weekTotal} post${weekTotal > 1 ? 's' : ''}, ${weekClientCount} client${weekClientCount > 1 ? 's' : ''} — ${weekRangeLabel}`
              : undefined
          }
          action={
            <Link
              to="/app/planning"
              aria-label="Voir tout le planning"
              className="text-muted-foreground hover:text-foreground hover:bg-surface-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
          className="min-w-0 lg:h-full lg:min-h-0"
          bodyClassName="lg:min-h-0 lg:flex-1 overflow-y-auto"
          dataTour="dash-week"
        >
          {weekQ.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : weekList.length === 0 ? (
            <EmptyState
              title="Rien de prévu"
              description="Aucun post planifié sur les 7 prochains jours. Ouvrez le planning pour en créer."
            />
          ) : (
            <div className="space-y-1.5 p-3">
              {weekList.map((p) => {
                const due = p.status === 'scheduled' && new Date(p.scheduledAt).getTime() <= Date.now();
                return (
                  <PostRow
                    key={p.id}
                    post={p}
                    clientName={clientName(p.clientId)}
                    dayLabel={dayLabel(parisDateKey(p.scheduledAt))}
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
          )}
        </SectionCard>

        {/* Colonne droite — chart + gauge/watchlist gardent leur hauteur naturelle,
            l'activité récente absorbe l'espace restant et défile si besoin. */}
        <div className="flex min-w-0 flex-col gap-4 lg:h-full lg:min-h-0">
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

          <div className="grid shrink-0 grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="surface-card flex flex-col rounded-[20px] p-4">
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                Validé du premier coup <span className="text-muted-foreground/70">· 30 derniers jours</span>
              </p>
              {firstTimeQ.isLoading ? (
                <Skeleton className="mx-auto h-16 w-24" />
              ) : firstTimeQ.data ? (
                <HalfGauge
                  rate={firstTimeQ.data.rate}
                  total={firstTimeQ.data.total}
                  previousRate={previousFirstTimeQ.data?.rate ?? null}
                />
              ) : (
                <p className="text-muted-foreground py-2 text-sm">
                  Pas assez de posts récents pour ce chiffre.
                </p>
              )}
            </div>

            <SectionCard
              icon={Users}
              title="Clients à surveiller"
              accent="warning"
              subtitle={`${watchlist.length} sur ${(clientsQ.data ?? []).length}`}
              action={
                <Link
                  to="/app/clients"
                  className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-medium"
                >
                  Tout
                </Link>
              }
            >
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
                    // Rouge seulement pour un vrai retard (validation en retard) —
                    // les autres signaux (trou calendrier, client inactif) restent neutres.
                    const isLate = issues.includes(ALERT_TYPE_LABELS.validation_overdue);
                    return (
                      <li key={clientId}>
                        <Link
                          to={`/app/clients/${clientId}`}
                          className="hover:bg-surface-2 flex items-center gap-3 p-3 text-sm"
                        >
                          <span
                            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-xl text-xs font-bold"
                            style={{ backgroundColor: cc.soft, color: cc.ink }}
                            aria-hidden="true"
                          >
                            {clientInitials(clientName(clientId))}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold">
                              {clientName(clientId)}
                            </span>
                            <span
                              className="block truncate text-[11.5px] font-[650]"
                              style={{ color: isLate ? 'oklch(0.5 0.16 27)' : undefined }}
                            >
                              {!isLate && <span className="text-muted-foreground">{issues.join(' · ')}</span>}
                              {isLate && issues.join(' · ')}
                            </span>
                          </span>
                          <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          <SectionCard
            icon={Activity}
            title="Activité récente"
            className="min-h-0 lg:flex-1"
            bodyClassName="lg:min-h-0 lg:flex-1 overflow-y-auto"
            action={
              <button
                type="button"
                onClick={() => setActivityExpanded((v) => !v)}
                className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-medium"
              >
                {activityExpanded ? 'Réduire' : 'Journal'}
              </button>
            }
          >
            <div
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- zone défilable sans enfant focusable, rendue accessible au clavier (axe)
              tabIndex={0}
              role="region"
              aria-label="Activité récente"
            >
              {activityQ.isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <ActivityFeed
                  rows={activityRows}
                  expanded={activityExpanded}
                  onExpand={() => setActivityExpanded(true)}
                  onCollapse={() => setActivityExpanded(false)}
                  clientName={clientName}
                />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
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
      <div className="surface-card flex shrink-0 items-center gap-[15px] rounded-[20px] p-4 px-[18px]">
        <span className="bg-success text-success-foreground grid h-11 w-11 shrink-0 place-items-center rounded-[15px]">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-[14.5px] font-[750]">Rien d'urgent aujourd'hui. Bon travail.</p>
      </div>
    );
  }

  return (
    <div className="surface-card flex shrink-0 items-center gap-[15px] rounded-[20px] p-4 px-[18px]">
      <span className="bg-surface-inverse text-surface-inverse-foreground grid h-11 w-11 shrink-0 place-items-center rounded-[15px]">
        <BellRing className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-[750]">Priorité du jour</p>
        <p className="text-[13.5px] leading-[1.45]" style={{ color: 'oklch(0.38 0.02 265)' }}>
          {alerts.map((a, i) => (
            <span key={a.id}>
              {i > 0 && ', et '}
              {highlightClient(a.message, a.clientId ? clientName(a.clientId) : null, a.clientId)}
            </span>
          ))}
        </p>
      </div>
      <button
        type="button"
        onClick={onTreat}
        className="bg-primary text-primary-foreground shadow-primary flex h-[38px] shrink-0 items-center rounded-[13px] px-4 text-sm font-semibold"
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

function dayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  const todayKey = parisDateKey(new Date().toISOString());
  const tomorrowKey = parisDateKey(new Date(Date.now() + DAY_MS).toISOString());
  if (dateKey === todayKey) return "Aujourd'hui";
  if (dateKey === tomorrowKey) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
}
