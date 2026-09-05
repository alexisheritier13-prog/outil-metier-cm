import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, Info, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormSheet } from '@/components/form';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Segmented } from '@/components/Segmented';
import { StatusLegend } from '@/components/StatusLegend';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { listClients } from '@/services/clients';
import { listPosts } from '@/services/posts';
import { listInternalUsers } from '@/services/users';
import { listPostTemplates } from '@/services/postTemplates';
import { listKeyDates } from '@/services/keyDates';
import { keyDateOccurrences } from './keyDateEvents';
import { postsToIcs } from '@/shared/utils/ics';
import { parisDateKey, toParisParts } from '@/shared/utils/tz';
import { downloadTextFile } from '@/lib/download';
import type { Post, Profile } from '@/shared/types';
import { MONTH_NAMES } from './monthNames';
import type { MonthGridHandle } from './MonthGrid';
import type { WeekGridHandle } from './WeekGrid';
import { PostForm } from './PostForm';
import { SeriesForm } from './SeriesForm';
import { PostList } from './PostList';
import { PostSheet } from './PostSheet';
import { BulkActionBar } from './BulkActionBar';
import { FiltersBar } from './FiltersBar';
import { useFilters } from './useFilters';
import { useCreatePost, useCreateSeries, usePosts } from './usePosts';

const MonthGrid = lazy(() => import('./MonthGrid').then((m) => ({ default: m.MonthGrid })));
const WeekGrid = lazy(() => import('./WeekGrid').then((m) => ({ default: m.WeekGrid })));
const KanbanBoard = lazy(() => import('./KanbanBoard').then((m) => ({ default: m.KanbanBoard })));

type ViewMode = 'month' | 'week' | 'list' | 'kanban';
const VIEW_MODES: readonly ViewMode[] = ['month', 'week', 'list', 'kanban'];
const VIEW_LS_KEY = 'planning-view';

const PENDING_STATUSES = ['internal_review', 'client_review'] as const;

function isViewMode(v: string | null): v is ViewMode {
  return VIEW_MODES.includes(v as ViewMode);
}

export function PlanningPage() {
  const { data: me } = useCurrentProfile();
  const canReassign = me?.role === 'lead' || me?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  // Vue persistée dans l'URL (partageable), miroir localStorage — même
  // convention que `useFilters`. Sur petit écran la grille est illisible :
  // on démarre sur la liste si rien n'est mémorisé.
  const [mode, setModeState] = useState<ViewMode>(() => {
    const fromUrl = searchParams.get('vue');
    if (isViewMode(fromUrl)) return fromUrl;
    try {
      const saved = localStorage.getItem(VIEW_LS_KEY);
      if (isViewMode(saved)) return saved;
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 640px)').matches
      ? 'list'
      : 'month';
  });
  function setMode(next: ViewMode) {
    setModeState(next);
    const sp = new URLSearchParams(searchParams);
    sp.set('vue', next);
    setSearchParams(sp, { replace: true });
    try {
      localStorage.setItem(VIEW_LS_KEY, next);
    } catch {
      /* ignore */
    }
  }
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [showKeyDates, setShowKeyDates] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [range, setRange] = useState<{ title: string; start: Date; end: Date } | null>(null);
  // Liste/Kanban n'ont pas de grille avec son propre curseur : la période
  // affichée (mois) vit ici, purement côté client — jamais via le filtre
  // Du/Au de la barre de filtres, qui alimente `usePosts` et est donc
  // partagé avec Mois/Semaine (le contaminer casserait leur navigation).
  const [periodCursor, setPeriodCursor] = useState(() => {
    const p = toParisParts(new Date());
    return { year: p.year, month0: p.month - 1 };
  });
  const monthRef = useRef<MonthGridHandle>(null);
  const weekRef = useRef<WeekGridHandle>(null);
  function shiftPeriod(delta: number) {
    setPeriodCursor((c) => {
      const d = new Date(Date.UTC(c.year, c.month0 + delta, 1));
      return { year: d.getUTCFullYear(), month0: d.getUTCMonth() };
    });
  }
  const nav = {
    prev: () => {
      if (mode === 'month') monthRef.current?.prev();
      else if (mode === 'week') weekRef.current?.prev();
      else shiftPeriod(-1);
    },
    next: () => {
      if (mode === 'month') monthRef.current?.next();
      else if (mode === 'week') weekRef.current?.next();
      else shiftPeriod(1);
    },
    today: () => {
      if (mode === 'month') monthRef.current?.today();
      else if (mode === 'week') weekRef.current?.today();
      else {
        const p = toParisParts(new Date());
        setPeriodCursor({ year: p.year, month0: p.month - 1 });
      }
    },
  };
  const periodTitle = `${MONTH_NAMES[periodCursor.month0]} ${periodCursor.year}`;

  const { filters, set: setFilters, reset: resetFilters, toService, isEmpty: filtersEmpty } =
    useFilters();
  const posts = usePosts(toService);
  const filterKey = JSON.stringify(toService);
  const clients = useQuery({
    queryKey: ['clients', { includeArchived: false }],
    queryFn: () => listClients(false),
  });
  // Compte par client indépendant du filtre client lui-même (les pastilles ne
  // doivent pas retomber à 0 quand on désélectionne un client).
  const clientCountFilters = useMemo(() => ({ ...toService, clientIds: undefined }), [toService]);
  const clientCountsQ = useQuery({
    queryKey: ['posts', 'client-counts', JSON.stringify(clientCountFilters)],
    queryFn: () => listPosts(clientCountFilters),
  });
  // Chargée seulement pour lead/admin (réassignation) — l'avatar « équipe »
  // des cartes Semaine/Liste/Kanban ne s'affiche donc que pour ces rôles.
  const authors = useQuery({
    queryKey: ['internal-users-lite'],
    queryFn: listInternalUsers,
    enabled: canReassign,
  });
  const templates = useQuery({ queryKey: ['post-templates'], queryFn: listPostTemplates });
  const keyDates = useQuery({
    queryKey: ['key-dates'],
    queryFn: listKeyDates,
    enabled: showKeyDates,
  });
  const create = useCreatePost();
  const series = useCreateSeries();

  const keyDateMarkers = useMemo(() => {
    if (!showKeyDates) return [];
    const y = new Date().getFullYear();
    return keyDateOccurrences(keyDates.data ?? [], [y, y + 1]);
  }, [showKeyDates, keyDates.data]);

  const clientName = useMemo(() => {
    const map = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [clients.data]);

  const clientCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of clientCountsQ.data ?? []) m.set(p.clientId, (m.get(p.clientId) ?? 0) + 1);
    return m;
  }, [clientCountsQ.data]);

  const authorById = useMemo(
    () => new Map<string, Profile>((authors.data ?? []).map((a) => [a.id, a])),
    [authors.data],
  );

  // Garde le post ouvert synchronisé avec les données fraîches.
  const currentOpen = useMemo(
    () => (openPost ? ((posts.data ?? []).find((p) => p.id === openPost.id) ?? openPost) : null),
    [openPost, posts.data],
  );

  // Ouverture directe via ?post=<id> (depuis une alerte).
  const deepLinkId = searchParams.get('post');
  useEffect(() => {
    if (!deepLinkId || openPost?.id === deepLinkId) return;
    const p = (posts.data ?? []).find((x) => x.id === deepLinkId);
    if (p) setOpenPost(p);
  }, [deepLinkId, posts.data, openPost?.id]);

  // Nouveau post via ?new=1 (raccourci « n »).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Une sélection ne survit pas à un changement de filtre ou de période
  // affichée (les ids affichés changent).
  useEffect(() => setSelected(new Set()), [filterKey, periodCursor]);

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (ids: string[], select: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  function exportIcs() {
    const rows = posts.data ?? [];
    if (rows.length === 0) return;
    const ics = postsToIcs(rows, { clientName });
    downloadTextFile(`calendrier-${parisDateKey(new Date().toISOString())}.ics`, 'text/calendar', ics);
  }

  function closeSheet() {
    setOpenPost(null);
    if (searchParams.has('post')) {
      searchParams.delete('post');
      setSearchParams(searchParams, { replace: true });
    }
  }

  const rows = useMemo(() => posts.data ?? [], [posts.data]);

  const visibleRows = useMemo(() => {
    if (!range) return [];
    return rows.filter((p) => {
      const t = new Date(p.scheduledAt).getTime();
      return t >= range.start.getTime() && t < range.end.getTime();
    });
  }, [rows, range]);

  const busiestWeekLabel = useMemo(() => {
    if (mode !== 'month' || visibleRows.length === 0) return null;
    const byWeek = new Map<string, { count: number; start: Date }>();
    for (const p of visibleRows) {
      const d = new Date(p.scheduledAt);
      const monday = new Date(d);
      const dow = (monday.getDay() + 6) % 7;
      monday.setDate(monday.getDate() - dow);
      const key = monday.toISOString().slice(0, 10);
      const entry = byWeek.get(key);
      if (entry) entry.count += 1;
      else byWeek.set(key, { count: 1, start: monday });
    }
    let best: { count: number; start: Date } | null = null;
    for (const v of byWeek.values()) if (!best || v.count > best.count) best = v;
    if (!best) return null;
    const end = new Date(best.start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${best.start.getDate()}-${fmt(end)}`;
  }, [visibleRows, mode]);

  const pendingCount = useMemo(
    () =>
      visibleRows.filter((p) => (PENDING_STATUSES as readonly string[]).includes(p.status)).length,
    [visibleRows],
  );

  // Semaine : mêmes principes que le pied de grille du Mois, mais à l'échelle
  // de la semaine affichée (calculés depuis `visibleRows`, jamais inventés).
  const weekClientCount = useMemo(
    () => (mode === 'week' ? new Set(visibleRows.map((p) => p.clientId)).size : 0),
    [visibleRows, mode],
  );
  const peakDayLabel = useMemo(() => {
    if (mode !== 'week' || visibleRows.length === 0) return null;
    const byDay = new Map<string, number>();
    for (const p of visibleRows) {
      const key = parisDateKey(p.scheduledAt);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    let best: [string, number] | null = null;
    for (const entry of byDay) if (!best || entry[1] > best[1]) best = entry;
    if (!best) return null;
    const [y, m, d] = best[0].split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  }, [visibleRows, mode]);

  // Liste/Kanban : posts du mois affiché par `periodCursor`, filtrés côté
  // client (jamais via le filtre Du/Au, partagé avec Mois/Semaine).
  const periodRows = useMemo(() => {
    if (mode !== 'list' && mode !== 'kanban') return rows;
    return rows.filter((p) => {
      const parts = toParisParts(p.scheduledAt);
      return parts.year === periodCursor.year && parts.month === periodCursor.month0 + 1;
    });
  }, [rows, mode, periodCursor]);

  if (!me || !isInternalRole(me.role)) return null;

  const loading = posts.isLoading || clients.isLoading;
  const hasClients = (clients.data ?? []).length > 0;
  const showCalendarNav = mode === 'month' || mode === 'week' || mode === 'list' || mode === 'kanban';
  const showKeyDatesToggle = mode === 'month' || mode === 'week';

  return (
    <div className="animate-in fade-in flex flex-col px-5 py-5 duration-300 ease-out sm:px-8 lg:h-full lg:overflow-hidden">
      <div className="shrink-0 space-y-3">
        <div className="surface-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[20px] p-[15px_18px]">
          <Segmented
            ariaLabel="Vue du calendrier"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'month', label: 'Mois' },
              { value: 'week', label: 'Semaine' },
              { value: 'list', label: 'Liste' },
              { value: 'kanban', label: 'Kanban' },
            ]}
          />

          {showCalendarNav && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Période précédente"
                onClick={nav.prev}
                className="border-border bg-surface flex h-8 w-8 items-center justify-center rounded-[11px] border"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[136px] text-center text-[15px] font-[750] capitalize">
                {mode === 'list' || mode === 'kanban' ? periodTitle : (range?.title ?? '')}
              </span>
              <button
                type="button"
                aria-label="Période suivante"
                onClick={nav.next}
                className="border-border bg-surface flex h-8 w-8 items-center justify-center rounded-[11px] border"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nav.today}
                className="border-border bg-surface ml-1 flex h-8 items-center rounded-[11px] border px-3 text-sm font-semibold"
              >
                Aujourd'hui
              </button>
            </div>
          )}

          {showKeyDatesToggle && (
            <label className="bg-surface-2 flex h-[34px] cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold">
              <input
                type="checkbox"
                className="accent-primary"
                checked={showKeyDates}
                onChange={(e) => setShowKeyDates(e.target.checked)}
              />
              Marronniers
            </label>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button disabled={!hasClients} onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nouveau post
            </Button>
            <button
              type="button"
              disabled={!hasClients}
              onClick={() => setSeriesOpen(true)}
              className="border-border bg-surface flex h-[34px] items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50"
            >
              <Layers className="h-4 w-4" /> Série
            </button>
            <button
              type="button"
              onClick={exportIcs}
              disabled={rows.length === 0}
              title="Exporter le résultat filtré au format iCalendar"
              className="border-border bg-surface flex h-[34px] items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Exporter .ics
            </button>
            <FormSheet
              open={createOpen}
              onOpenChange={(v) => {
                setCreateOpen(v);
                if (!v) setCreateDate(null);
              }}
              title="Nouveau post"
              description="Programmez un post et joignez ses visuels."
              wide
            >
              <PostForm
                key={createDate ?? 'new'}
                clients={clients.data ?? []}
                authors={authors.data ?? []}
                canReassign={canReassign}
                templates={templates.data ?? []}
                initialScheduledAt={createDate ?? undefined}
                submitLabel="Créer le post"
                pending={create.isPending}
                error={create.isError ? create.error : undefined}
                onCancel={() => setCreateOpen(false)}
                onSubmit={(input) => create.mutateAsync(input)}
                onSuccess={() => setCreateOpen(false)}
              />
            </FormSheet>
            <FormSheet
              open={seriesOpen}
              onOpenChange={(v) => {
                setSeriesOpen(v);
                if (!v) series.reset();
              }}
              title="Planifier une série"
              description="Un lot de brouillons répartis sur les jours choisis."
              wide
            >
              <SeriesForm
                clients={clients.data ?? []}
                templates={templates.data ?? []}
                authors={authors.data ?? []}
                canReassign={canReassign}
                pending={series.isPending}
                report={series.data ?? null}
                onCancel={() => setSeriesOpen(false)}
                onSubmit={(r) =>
                  series.mutate({
                    dates: r.dates,
                    base: {
                      clientId: r.clientId,
                      network: r.network,
                      caption: r.caption,
                      canvaUrl: null,
                      authorId: r.authorId,
                      pillarId: r.pillarId,
                    },
                  })
                }
              />
            </FormSheet>
          </div>
        </div>

        <FiltersBar
          clients={clients.data ?? []}
          clientCounts={clientCounts}
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          isEmpty={filtersEmpty}
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        {loading && <TableSkeleton rows={8} />}

        {!loading && mode === 'list' && (
          <div className="h-full lg:min-h-0">
            <PostList
              posts={periodRows}
              clientName={clientName}
              authorById={authorById}
              onOpen={setOpenPost}
              hasClients={hasClients}
              onResetFilters={resetFilters}
              selectedIds={selected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
            />
          </div>
        )}
        {!loading && mode === 'kanban' && (
          <div className="h-full lg:min-h-0">
            <Suspense fallback={<FullPageSpinner />}>
              <KanbanBoard
                posts={periodRows}
                role={me.role}
                clientName={clientName}
                authorById={authorById}
                onOpen={setOpenPost}
                onCreateDraft={hasClients ? () => setCreateOpen(true) : undefined}
                selectedIds={selected}
                onToggleSelect={toggleSelect}
              />
            </Suspense>
          </div>
        )}
        {!loading && mode === 'month' && (
          <div className="flex h-full flex-col gap-4">
            <Suspense fallback={<FullPageSpinner />}>
              <div className="min-h-[34rem] flex-1 lg:min-h-0">
                <MonthGrid
                  ref={monthRef}
                  posts={rows}
                  clientName={clientName}
                  onOpen={setOpenPost}
                  onCreateAt={
                    hasClients
                      ? (iso) => {
                          setCreateDate(iso);
                          setCreateOpen(true);
                        }
                      : undefined
                  }
                  editable
                  keyDates={keyDateMarkers}
                  onRangeChange={setRange}
                />
              </div>
            </Suspense>

            <div className="surface-card flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[20px] p-[15px_18px] text-[13px]">
              <span className="flex items-center gap-1.5 font-semibold">
                <Info className="h-3.5 w-3.5" aria-hidden="true" /> La pastille indique le client,
                la couleur de la carte indique le statut.
              </span>
              <StatusLegend className="hidden sm:block" />
              <span className="text-muted-foreground ml-auto font-semibold tabular-nums">
                <span className="text-foreground font-extrabold">{visibleRows.length}</span> post
                {visibleRows.length > 1 ? 's' : ''} ce mois
                {pendingCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-foreground font-extrabold">{pendingCount}</span> en
                    attente
                  </>
                )}
                {busiestWeekLabel && (
                  <>
                    {' · semaine la plus chargée '}
                    <span className="text-foreground font-extrabold">{busiestWeekLabel}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        )}
        {!loading && mode === 'week' && (
          <div className="flex h-full flex-col gap-4">
            <Suspense fallback={<FullPageSpinner />}>
              <div className="min-h-[34rem] flex-1 lg:min-h-0">
                <WeekGrid
                  ref={weekRef}
                  posts={rows}
                  clientName={clientName}
                  onOpen={setOpenPost}
                  onCreateAt={
                    hasClients
                      ? (iso) => {
                          setCreateDate(iso);
                          setCreateOpen(true);
                        }
                      : undefined
                  }
                  editable
                  keyDates={keyDateMarkers}
                  onRangeChange={setRange}
                />
              </div>
            </Suspense>

            <div className="surface-card flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[20px] p-[15px_18px] text-[13px]">
              <span className="font-semibold">
                Créneaux de 2 h — glisser une carte change l'heure de publication.
              </span>
              <span className="text-muted-foreground ml-auto font-semibold tabular-nums">
                <span className="text-foreground font-extrabold">{visibleRows.length}</span> post
                {visibleRows.length > 1 ? 's' : ''} cette semaine
                {weekClientCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-foreground font-extrabold">{weekClientCount}</span> client
                    {weekClientCount > 1 ? 's' : ''}
                  </>
                )}
                {peakDayLabel && (
                  <>
                    {' · jour de pic '}
                    <span className="text-foreground font-extrabold capitalize">{peakDayLabel}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      <PostSheet
        post={currentOpen}
        clients={clients.data ?? []}
        authors={authors.data ?? []}
        onClose={closeSheet}
      />

      {(mode === 'list' || mode === 'kanban') && (
        <BulkActionBar
          selectedIds={[...selected]}
          posts={periodRows}
          clientName={clientName}
          role={me.role}
          canReassign={canReassign}
          authors={authors.data ?? []}
          onSelectAll={() => setSelected(new Set(periodRows.map((p) => p.id)))}
          onClear={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
