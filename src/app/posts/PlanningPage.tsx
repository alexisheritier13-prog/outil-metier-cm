import { lazy, Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { listClients } from '@/services/clients';
import { listInternalUsers } from '@/services/users';
import type { Post } from '@/shared/types';
import { PostForm } from './PostForm';
import { PostsTable } from './PostsTable';
import { PostSheet } from './PostSheet';
import { useCreatePost, usePosts } from './usePosts';

const CalendarView = lazy(() =>
  import('./CalendarView').then((m) => ({ default: m.CalendarView })),
);

type ViewMode = 'month' | 'week' | 'list';
const VIEW_LABEL: Record<ViewMode, string> = { month: 'Mois', week: 'Semaine', list: 'Liste' };

export function PlanningPage() {
  const { data: me } = useCurrentProfile();
  const canReassign = me?.role === 'lead' || me?.role === 'admin';
  const [mode, setMode] = useState<ViewMode>('month');
  const [createOpen, setCreateOpen] = useState(false);
  const [openPost, setOpenPost] = useState<Post | null>(null);

  const posts = usePosts();
  const clients = useQuery({
    queryKey: ['clients', { includeArchived: false }],
    queryFn: () => listClients(false),
  });
  const authors = useQuery({
    queryKey: ['internal-users-lite'],
    queryFn: listInternalUsers,
    enabled: canReassign,
  });
  const create = useCreatePost();

  const clientName = useMemo(() => {
    const map = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [clients.data]);

  // Garde le post ouvert synchronisé avec les données fraîches.
  const currentOpen = useMemo(
    () => (openPost ? ((posts.data ?? []).find((p) => p.id === openPost.id) ?? openPost) : null),
    [openPost, posts.data],
  );

  if (!me || !isInternalRole(me.role)) return null;
  if (posts.isLoading || clients.isLoading) return <FullPageSpinner />;

  const rows = posts.data ?? [];
  const hasClients = (clients.data ?? []).length > 0;

  return (
    <section className="p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-title">Planning</h1>
          <div className="flex rounded-md border p-0.5">
            {(['month', 'week', 'list'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'rounded px-3 py-1 text-sm',
                  mode === m ? 'bg-foreground text-background' : 'text-muted-foreground',
                )}
              >
                {VIEW_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
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
      </header>

      {mode === 'list' ? (
        <PostsTable
          posts={rows}
          role={me.role}
          clientName={clientName}
          onOpen={setOpenPost}
          hasClients={hasClients}
        />
      ) : (
        <Suspense fallback={<FullPageSpinner />}>
          <CalendarView
            posts={rows}
            view={mode === 'month' ? 'dayGridMonth' : 'timeGridWeek'}
            clientName={clientName}
            onOpen={setOpenPost}
            editable
          />
        </Suspense>
      )}

      <PostSheet
        post={currentOpen}
        clients={clients.data ?? []}
        authors={authors.data ?? []}
        onClose={() => setOpenPost(null)}
      />
    </section>
  );
}
