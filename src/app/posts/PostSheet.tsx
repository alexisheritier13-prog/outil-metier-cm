import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetworkIcon } from '@/components/NetworkIcon';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import { getPostTagIds, listTags } from '@/services/tags';
import { listCampaignsForClient } from '@/services/campaigns';
import type { Client, Post, Profile } from '@/shared/types';
import { PostForm } from './PostForm';
import { StatusControl } from './StatusControl';
import { CommentThread } from './CommentThread';
import { PostHistory } from './PostHistory';
import { useDuplicatePost, useTrashPost, useUpdatePost } from './usePosts';

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
  const duplicate = useDuplicatePost();
  const [editOpen, setEditOpen] = useState(false);

  const tagIds = useQuery({
    queryKey: ['post-tags', post?.id],
    queryFn: () => getPostTagIds(post!.id),
    enabled: Boolean(post),
  });
  const allTags = useQuery({ queryKey: ['tags'], queryFn: listTags });
  const campaigns = useQuery({
    queryKey: ['campaigns-for-client', post?.clientId],
    queryFn: () => listCampaignsForClient(post!.clientId),
    enabled: Boolean(post),
  });

  if (!post) return null;
  const client = clients.find((c) => c.id === post.clientId);
  const tagNames = (allTags.data ?? [])
    .filter((t) => (tagIds.data ?? []).includes(t.id))
    .map((t) => t.name);
  const campaignName = (campaigns.data ?? []).find((c) => c.id === post.campaignId)?.name;

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

        <Tabs defaultValue="detail" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="px-4">
            <TabsTrigger value="detail">Détail</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="flex-1 overflow-y-auto p-4 pt-4">
            <PostHistory postId={post.id} />
          </TabsContent>

          <TabsContent value="detail" className="flex-1 space-y-5 overflow-y-auto p-4 pt-4">
          <div>
            <p className="text-muted-foreground text-xs">Statut</p>
            {me && <StatusControl postId={post.id} status={post.status} role={me.role} />}
          </div>

          {post.canvaThumbnailUrl && (
            <img
              src={post.canvaThumbnailUrl}
              alt="Aperçu du visuel Canva"
              className="max-h-64 w-full rounded border object-contain"
              loading="lazy"
            />
          )}

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

          {campaignName && (
            <div>
              <p className="text-muted-foreground text-xs">Campagne</p>
              <p className="text-sm">{campaignName}</p>
            </div>
          )}

          {tagNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagNames.map((t) => (
                <span key={t} className="bg-surface-2 rounded-sm border px-1.5 py-0.5 text-xs">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <CommentThread postId={post.id} />
          </div>
          </TabsContent>
        </Tabs>

        <footer className="flex gap-2 border-t p-4">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Modifier
          </Button>
          <Button
            variant="ghost"
            disabled={duplicate.isPending}
            onClick={async () => {
              const p = await duplicate.mutateAsync({ id: post.id, shiftDays: 7 });
              onClose();
              void p;
            }}
          >
            <Copy className="h-4 w-4" /> Dupliquer
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
                canvaThumbnailUrl: post.canvaThumbnailUrl,
                canvaThumbnailSource: post.canvaThumbnailSource,
                authorId: post.authorId,
                campaignId: post.campaignId,
                tags: tagNames,
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
