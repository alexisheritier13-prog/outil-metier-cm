import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { NetworkIcon } from '@/components/NetworkIcon';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { listClients } from '@/services/clients';
import { listInternalUsers } from '@/services/users';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { PostForm } from './PostForm';
import { useCreatePost, usePosts, useTrashPost, useUpdatePost } from './usePosts';

/**
 * Vue provisoire des posts (liste). Le calendrier mois/semaine/kanban arrive en Story 3.3+.
 */
export function PostsView() {
  const { data: me } = useCurrentProfile();
  const canReassign = me?.role === 'lead' || me?.role === 'admin';
  const posts = usePosts();
  const clients = useQuery({ queryKey: ['clients', { includeArchived: false }], queryFn: () => listClients(false) });
  const authors = useQuery({
    queryKey: ['internal-users-lite'],
    queryFn: listInternalUsers,
    enabled: canReassign,
  });
  const create = useCreatePost();
  const trash = useTrashPost();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);

  const clientName = useMemo(() => {
    const m = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [clients.data]);

  if (posts.isLoading || clients.isLoading) return <FullPageSpinner />;
  const rows = posts.data ?? [];

  return (
    <section className="p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-title">Posts</h1>
          <p className="text-muted-foreground text-sm">
            Vue liste provisoire. Le calendrier multi-clients arrive à la prochaine story.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={(clients.data ?? []).length === 0}>
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

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucun post"
          description={
            (clients.data ?? []).length === 0
              ? "Créez d'abord un client, puis planifiez son premier post."
              : 'Créez le premier post pour commencer à planifier.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Réseau</th>
                <th className="p-3 font-medium">Légende</th>
                <th className="p-3 font-medium">Statut</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-surface-2/60 cursor-pointer border-t"
                  onClick={() => setEditing(p)}
                >
                  <td className="p-3 whitespace-nowrap">
                    {parisDateKey(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
                  </td>
                  <td className="p-3">{clientName(p.clientId)}</td>
                  <td className="p-3">
                    <NetworkIcon network={p.network} />
                  </td>
                  <td className="text-muted-foreground max-w-md truncate p-3">
                    {p.caption || <span className="italic">Sans légende</span>}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mettre à la corbeille"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Mettre ce post à la corbeille ?')) trash.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditPostDialog
        post={editing}
        clients={clients.data ?? []}
        authors={authors.data ?? []}
        canReassign={canReassign}
        onClose={() => setEditing(null)}
      />
    </section>
  );
}

function EditPostDialog({
  post,
  clients,
  authors,
  canReassign,
  onClose,
}: {
  post: Post | null;
  clients: { id: string; name: string }[];
  authors: { id: string; fullName: string; email: string }[];
  canReassign: boolean;
  onClose: () => void;
}) {
  const update = useUpdatePost(post?.id ?? '');
  if (!post) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le post</DialogTitle>
        </DialogHeader>
        <PostForm
          clients={clients as never}
          authors={authors as never}
          canReassign={canReassign}
          submitLabel="Enregistrer"
          pending={update.isPending}
          error={update.isError ? update.error : undefined}
          defaults={{
            clientId: post.clientId,
            network: post.network,
            scheduledAt: post.scheduledAt,
            caption: post.caption,
            canvaUrl: post.canvaUrl,
            authorId: post.authorId,
          }}
          onCancel={onClose}
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
