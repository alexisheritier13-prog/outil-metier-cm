import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NetworkIcon } from '@/components/NetworkIcon';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import type { Client, Post, Profile } from '@/shared/types';
import { PostForm } from './PostForm';
import { StatusControl } from './StatusControl';
import { useTrashPost, useUpdatePost } from './usePosts';

interface Props {
  post: Post | null;
  clients: Client[];
  authors: Profile[];
  onClose: () => void;
}

/** Panneau latéral de détail d'un post. Le contenu complet (commentaires, historique) = Epic 4. */
export function PostSheet({ post, clients, authors, onClose }: Props) {
  const { data: me } = useCurrentProfile();
  const canReassign = me?.role === 'lead' || me?.role === 'admin';
  const update = useUpdatePost(post?.id ?? '');
  const trash = useTrashPost();
  const [editOpen, setEditOpen] = useState(false);

  if (!post) return null;
  const client = clients.find((c) => c.id === post.clientId);

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <header className="flex items-start justify-between border-b p-4">
          <div className="space-y-1">
            <SheetTitle>{client?.name ?? 'Post'}</SheetTitle>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <NetworkIcon network={post.network} withLabel />
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <p className="text-muted-foreground text-xs">Statut</p>
            {me && <StatusControl postId={post.id} status={post.status} role={me.role} />}
          </div>

          <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Date</dt>
            <dd>
              {parisDateKey(post.scheduledAt)} à {parisTimeLabel(post.scheduledAt)} (Paris)
            </dd>
            <dt className="text-muted-foreground">Réseau</dt>
            <dd>{NETWORK_LABELS[post.network]}</dd>
            <dt className="text-muted-foreground">Lien Canva</dt>
            <dd className="truncate">
              {post.canvaUrl ? (
                <a href={post.canvaUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  Ouvrir
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </dl>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">Légende</p>
            <p className="whitespace-pre-wrap text-sm">
              {post.caption || <span className="text-muted-foreground italic">Sans légende</span>}
            </p>
          </div>
        </div>

        <footer className="flex gap-2 border-t p-4">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Modifier
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('Mettre ce post à la corbeille ?')) {
                trash.mutate(post.id);
                onClose();
              }
            }}
          >
            Corbeille
          </Button>
        </footer>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le post</DialogTitle>
            </DialogHeader>
            <PostForm
              clients={clients}
              authors={authors}
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
              onCancel={() => setEditOpen(false)}
              onSubmit={async (input) => {
                await update.mutateAsync(input);
                setEditOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
