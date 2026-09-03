import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { FormSheet, textareaClass } from '@/components/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetworkIcon } from '@/components/NetworkIcon';
import { MediaGallery } from '@/components/MediaGallery';
import { PostPreview } from '@/components/PostPreview';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import { listCampaignsForClient } from '@/services/campaigns';
import { ORIGIN_TYPE_LABELS, describeOrigin } from '@/services/postOrigin';
import type { Client, Post, Profile } from '@/shared/types';
import { approvalUrl, getApprovalToken } from '@/services/approval';
import { PostForm } from './PostForm';
import { PerformanceSection } from './PerformanceSection';
import { StatusActions } from './StatusActions';
import { CommentThread } from './CommentThread';
import { PostHistory } from './PostHistory';
import { usePostMedia } from './usePostMedia';
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

  const mediaQ = usePostMedia(post?.id);
  const campaigns = useQuery({
    queryKey: ['campaigns-for-client', post?.clientId],
    queryFn: () => listCampaignsForClient(post!.clientId),
    enabled: Boolean(post),
  });
  const origin = useQuery({
    queryKey: ['post-origin', post?.id, post?.originType, post?.originId],
    queryFn: () => describeOrigin(post!.originType, post!.originId),
    enabled: Boolean(post?.originType),
  });

  if (!post) return null;
  const client = clients.find((c) => c.id === post.clientId);
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
          <TabsList className="mx-4 mb-1 mt-3">
            <TabsTrigger value="detail">Détail</TabsTrigger>
            <TabsTrigger value="preview">Aperçu</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent
            value="preview"
            className="bg-surface-2 flex-1 overflow-y-auto p-4 pt-4"
          >
            <PostPreview
              network={post.network}
              name={client?.name ?? '—'}
              logoUrl={client?.logoUrl}
              caption={post.caption}
              media={mediaQ.data ?? []}
              scheduledAt={post.scheduledAt}
            />
            <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-center text-xs">
              Rendu indicatif : l'affichage réel dépend du réseau.
            </p>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto p-4 pt-4">
            <PostHistory postId={post.id} />
          </TabsContent>

          <TabsContent value="detail" className="flex-1 space-y-5 overflow-y-auto p-4 pt-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">Statut</p>
            {me && <StatusActions post={post} role={me.role} />}
          </div>

          {post.status === 'client_review' && <ApprovalLink postId={post.id} />}

          {(mediaQ.data ?? []).length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs">
                Visuels ({mediaQ.data!.length})
              </p>
              <MediaGallery media={mediaQ.data!} />
            </div>
          )}

          <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Date</dt>
            <dd>
              {parisDateLabel(post.scheduledAt)} à {parisTimeLabel(post.scheduledAt)} (Paris)
            </dd>
            <dt className="text-muted-foreground">Réseau</dt>
            <dd>{NETWORK_LABELS[post.network]}</dd>
            <dt className="text-muted-foreground">Lien Canva</dt>
            <dd className="truncate">
              {post.canvaUrl ? (
                <>
                  <a
                    href={post.canvaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    Ouvrir
                  </a>
                  <span className="text-muted-foreground"> · interne, jamais montré au client</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </dl>

          <InlineCaption
            caption={post.caption}
            pending={update.isPending}
            onSave={(caption) =>
              update.mutateAsync({
                clientId: post.clientId,
                network: post.network,
                scheduledAt: post.scheduledAt,
                caption,
                canvaUrl: post.canvaUrl,
                campaignId: post.campaignId,
                pillarId: post.pillarId,
                authorId: post.authorId,
              })
            }
          />

          {campaignName && (
            <div>
              <p className="text-muted-foreground text-xs">Campagne</p>
              <p className="text-sm">{campaignName}</p>
            </div>
          )}

          {post.originType && (
            <div>
              <p className="text-muted-foreground text-xs">Origine</p>
              <p className="text-sm">
                {ORIGIN_TYPE_LABELS[post.originType]}
                {origin.data?.label ? (
                  <span className="text-muted-foreground"> · {origin.data.label}</span>
                ) : origin.isFetched ? (
                  <span className="text-muted-foreground italic"> · origine supprimée</span>
                ) : null}
              </p>
            </div>
          )}


          <PerformanceSection post={post} />

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
            className="text-danger-strong hover:bg-danger-surface hover:text-danger-strong"
            onClick={() => {
              if (confirm('Mettre ce post à la corbeille ?')) {
                trash.mutate(post.id);
                onClose();
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Corbeille
          </Button>
        </footer>

        <FormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Modifier le post"
          description={client?.name}
          wide
        >
          <PostForm
            clients={clients}
            authors={authors}
            canReassign={canReassign}
            postId={post.id}
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
              campaignId: post.campaignId,
              pillarId: post.pillarId,
            }}
            onCancel={() => setEditOpen(false)}
            onSubmit={(input) => update.mutateAsync(input)}
            onSuccess={() => setEditOpen(false)}
          />
        </FormSheet>
      </SheetContent>
    </Sheet>
  );
}

function ApprovalLink({ postId }: { postId: string }) {
  const token = useQuery({
    queryKey: ['approval-token', postId],
    queryFn: () => getApprovalToken(postId),
  });
  const [copied, setCopied] = useState(false);
  const url = token.data ? approvalUrl(token.data) : '';

  if (!url) return null;
  return (
    <div className="border-border bg-surface-2/50 space-y-1.5 rounded-lg border p-3">
      <p className="text-xs font-medium">Lien de validation directe</p>
      <p className="text-muted-foreground text-xs">
        À envoyer au client s'il ne veut pas se connecter au portail.
      </p>
      <div className="flex items-center gap-1.5">
        <code className="bg-surface border-border block flex-1 truncate rounded border px-2 py-1 text-xs">
          {url}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            } catch {
              /* presse-papiers indisponible */
            }
          }}
        >
          {copied ? 'Copié' : 'Copier'}
        </Button>
      </div>
    </div>
  );
}

/** Légende éditable en place — évite d'ouvrir le formulaire complet pour un ajustement de texte. */
function InlineCaption({
  caption,
  pending,
  onSave,
}: {
  caption: string;
  pending: boolean;
  onSave: (caption: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(caption);

  if (!editing) {
    return (
      <div className="group/cap relative">
        <p className="text-muted-foreground mb-1 text-xs">Légende</p>
        <p className="whitespace-pre-wrap pr-8 text-sm">
          {caption || <span className="text-muted-foreground italic">Sans légende</span>}
        </p>
        <button
          type="button"
          aria-label="Modifier la légende"
          onClick={() => {
            setDraft(caption);
            setEditing(true);
          }}
          className="text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:ring-primary/30 absolute right-0 top-0 rounded p-1 opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 group-hover/cap:opacity-100"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Légende</p>
      <textarea
        // eslint-disable-next-line jsx-a11y/no-autofocus -- édition inline déclenchée par l'utilisateur
        autoFocus
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
        className={textareaClass}
        aria-label="Légende"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || draft === caption}
          onClick={async () => {
            await onSave(draft);
            setEditing(false);
          }}
        >
          Enregistrer
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
