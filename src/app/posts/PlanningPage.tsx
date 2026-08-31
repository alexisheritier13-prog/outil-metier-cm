import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarArrowDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { Page, PageHeader } from '@/components/Page';
import { Segmented } from '@/components/Segmented';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { listClients } from '@/services/clients';
import { listInternalUsers } from '@/services/users';
import { listPostTemplates } from '@/services/postTemplates';
import { listKeyDates } from '@/services/keyDates';
import { keyDateOccurrences } from './keyDateEvents';
import { postsToIcs } from '@/shared/utils/ics';
import { parisDateKey } from '@/shared/utils/tz';
import { downloadTextFile } from '@/lib/download';
import type { Post } from '@/shared/types';
import { PostForm } from './PostForm';
import { PostsTable } from './PostsTable';
import { PostSheet } from './PostSheet';
import { BulkActionBar } from './BulkActionBar';
import { FiltersBar } from './FiltersBar';
import { useFilters } from './useFilters';
import { useCreatePost, usePosts } from './usePosts';

const CalendarView = lazy(() =>
  import('./CalendarView').then((m) => ({ default: m.CalendarView })),
);
const KanbanView = lazy(() => import('./KanbanView').then((m) => ({ default: m.KanbanView })));

type ViewMode = 'month' | 'week' | 'list' | 'kanban';

export function PlanningPage() {
  const { data: me } = useCurrentProfile();
  const canReassign = me?.role === 'lead' || me?.role === 'admin';
  const [mode, setMode] = useState<ViewMode>('month');
  const [createOpen, setCreateOpen] = useState(false);
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [showKeyDates, setShowKeyDates] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchParams, setSearchParams] = useSearchParams();

  const { filters, set: setFilters, reset: resetFilters, toService, isEmpty: filtersEmpty } =
    useFilters();
  const posts = usePosts(toService);
  const filterKey = JSON.stringify(toService);
  const clients = useQuery({
    queryKey: ['clients', { includeArchived: false }],
    queryFn: () => listClients(false),
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

  const keyDateMarkers = useMemo(() => {
    if (!showKeyDates) return [];
    const y = new Date().getFullYear();
    return keyDateOccurrences(keyDates.data ?? [], [y, y + 1]);
  }, [showKeyDates, keyDates.data]);

  const clientName = useMemo(() => {
    const map = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [clients.data]);

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

  if (!me || !isInternalRole(me.role)) return null;
  if (posts.isLoading || clients.isLoading) return <FullPageSpinner />;

  const rows = posts.data ?? [];
  const hasClients = (clients.data ?? []).length > 0;

  return (
    <Page>
      <PageHeader
        title="Planning"
        aside={
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
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportIcs}
              disabled={rows.length === 0}
              title="Exporter le résultat filtré au format iCalendar"
            >
              <CalendarArrowDown className="h-4 w-4" /> Exporter .ics
            </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!hasClients}>
                <Plus className="h-4 w-4" /> Nouveau post
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau post</DialogTitle>
              </DialogHeader>
              <PostForm
                clients={clients.data ?? []}
                authors={authors.data ?? []}
                canReassign={canReassign}
                templates={templates.data ?? []}
                submitLabel="Créer"
                pending={create.isPending}
                error={create.isError ? create.error : undefined}
                onCancel={() => setCreateOpen(false)}
                onSubmit={async (input) => {
                  await create.mutateAsync(input);
                  setCreateOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <FiltersBar
        clients={clients.data ?? []}
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        isEmpty={filtersEmpty}
      />

      {(mode === 'month' || mode === 'week') && (
        <label className="text-muted-foreground mb-3 mt-1 flex w-fit cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-foreground"
            checked={showKeyDates}
            onChange={(e) => setShowKeyDates(e.target.checked)}
          />
          Afficher les marronniers
        </label>
      )}

      {mode === 'list' && (
        <PostsTable
          posts={rows}
          clientName={clientName}
          onOpen={setOpenPost}
          hasClients={hasClients}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
        />
      )}
      {mode === 'kanban' && (
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
      )}
      {(mode === 'month' || mode === 'week') && (
        <Suspense fallback={<FullPageSpinner />}>
          <CalendarView
            posts={rows}
            view={mode === 'month' ? 'dayGridMonth' : 'timeGridWeek'}
            clientName={clientName}
            onOpen={setOpenPost}
            editable
            keyDates={keyDateMarkers}
          />
        </Suspense>
      )}

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
    </Page>
  );
}
