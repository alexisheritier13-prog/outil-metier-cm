import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarArrowDown,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
} from 'lucide-react';
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
import { parisDateKey } from '@/shared/utils/tz';
import { downloadTextFile } from '@/lib/download';
import type { Post } from '@/shared/types';
import type { CalendarViewHandle } from './CalendarView';
import { PostForm } from './PostForm';
import { SeriesForm } from './SeriesForm';
import { PostsTable } from './PostsTable';
import { PostSheet } from './PostSheet';
import { BulkActionBar } from './BulkActionBar';
import { FiltersBar } from './FiltersBar';
import { useFilters } from './useFilters';
import { useCreatePost, useCreateSeries, usePosts } from './usePosts';

const CalendarView = lazy(() =>
  import('./CalendarView').then((m) => ({ default: m.CalendarView })),
);
const KanbanView = lazy(() => import('./KanbanView').then((m) => ({ default: m.KanbanView })));

type ViewMode = 'month' | 'week' | 'list' | 'kanban';

const PENDING_STATUSES = ['internal_review', 'client_review'] as const;

export function PlanningPage() {
  const { data: me } = useCurrentProfile();
  const canReassign = me?.role === 'lead' || me?.role === 'admin';
  // Sur petit écran la grille du calendrier est illisible : on démarre sur la liste.
  const [mode, setMode] = useState<ViewMode>(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 640px)').matches
      ? 'list'
      : 'month',
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [showKeyDates, setShowKeyDates] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState<{ title: string; start: Date; end: Date } | null>(null);
  const calendarRef = useRef<CalendarViewHandle>(null);

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

  // Une sélection ne survit pas à un changement de filtre (les ids affichés changent).
  useEffect(() => setSelected(new Set()), [filterKey]);

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

  if (!me || !isInternalRole(me.role)) return null;

  const loading = posts.isLoading || clients.isLoading;
  const hasClients = (clients.data ?? []).length > 0;
  const showCalendarNav = mode === 'month' || mode === 'week';

  return (
    <div className="animate-in fade-in flex flex-col px-5 py-5 duration-300 ease-out sm:px-8 lg:h-full lg:overflow-hidden">
      <div className="shrink-0 space-y-3">
        <div className="surface-card flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
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
              <Button
                variant="outline"
                size="icon"
                aria-label="Période précédente"
                onClick={() => calendarRef.current?.prev()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[9rem] text-center text-sm font-semibold capitalize">
                {range?.title ?? ''}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Période suivante"
                onClick={() => calendarRef.current?.next()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => calendarRef.current?.today()}>
                Aujourd'hui
              </Button>
            </div>
          )}

          {showCalendarNav && (
            <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-sm">
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
            <Button variant="outline" disabled={!hasClients} onClick={() => setSeriesOpen(true)}>
              <CalendarPlus className="h-4 w-4" /> Série
            </Button>
            <Button
              variant="outline"
              onClick={exportIcs}
              disabled={rows.length === 0}
              title="Exporter le résultat filtré au format iCalendar"
            >
              <CalendarArrowDown className="h-4 w-4" /> Exporter .ics
            </Button>
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
          <div className="h-full overflow-y-auto lg:min-h-0">
            <PostsTable
              posts={rows}
              clientName={clientName}
              onOpen={setOpenPost}
              hasClients={hasClients}
              selectedIds={selected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
            />
          </div>
        )}
        {!loading && mode === 'kanban' && (
          <div className="h-full overflow-auto lg:min-h-0">
            <Suspense fallback={<FullPageSpinner />}>
              <KanbanView
                posts={rows}
                role={me.role}
                clientName={clientName}
                onOpen={setOpenPost}
                selectedIds={selected}
                onToggleSelect={toggleSelect}
              />
            </Suspense>
          </div>
        )}
        {!loading && (mode === 'month' || mode === 'week') && (
          <div className="flex h-full flex-col gap-2">
            <Suspense fallback={<FullPageSpinner />}>
              <div className="min-h-[34rem] flex-1 lg:min-h-0">
                <CalendarView
                  ref={calendarRef}
                  posts={rows}
                  view={mode === 'month' ? 'dayGridMonth' : 'timeGridWeek'}
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
                  fill
                  showInternalToolbar={false}
                  onRangeChange={setRange}
                />
              </div>
            </Suspense>

            {mode === 'month' && (
              <div className="surface-card flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> La pastille indique le client, la couleur de la
                  carte indique le statut.
                </span>
                <StatusLegend className="hidden sm:block" />
                <span className="text-muted-foreground ml-auto tabular-nums">
                  {visibleRows.length} post{visibleRows.length > 1 ? 's' : ''} ce mois
                  {pendingCount > 0 && ` · ${pendingCount} en attente`}
                  {busiestWeekLabel && ` · semaine la plus chargée ${busiestWeekLabel}`}
                </span>
              </div>
            )}
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
          posts={rows}
          clientName={clientName}
          role={me.role}
          canReassign={canReassign}
          authors={authors.data ?? []}
          onSelectAll={() => setSelected(new Set(rows.map((p) => p.id)))}
          onClear={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
