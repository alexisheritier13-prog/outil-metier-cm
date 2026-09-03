import { useState } from 'react';
import { X } from 'lucide-react';
import { textareaClass } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { MediaGallery } from '@/components/MediaGallery';
import { PostPreview } from '@/components/PostPreview';
import { usePortalClient } from './PortalClientContext';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import {
  useAddPortalComment,
  useApprovePost,
  usePortalComments,
  usePortalPostMedia,
  useRejectPost,
} from './usePortal';

/**
 * Détail d'un post côté client (Stories 6.2 + 6.3). Lecture des méta + échanges `client`,
 * ajout de commentaires, et — si le post est « à valider client » — approbation ou demande
 * de modification (RPC de la Story 5.3).
 */
export function PortalPostDetail({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const client = usePortalClient();
  const comments = usePortalComments(post?.id ?? null);
  const media = usePortalPostMedia(post?.id ?? null);
  const addComment = useAddPortalComment(post?.id ?? '');
  const approve = useApprovePost();
  const reject = useRejectPost();

  const [body, setBody] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  if (!post) return null;
  const pending = post.status === 'client_review';
  const busy = approve.isPending || reject.isPending;

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <header className="flex items-start justify-between border-b p-4">
          <div className="space-y-1">
            <SheetTitle className="flex items-center gap-2">
              <NetworkIcon network={post.network} withLabel />
            </SheetTitle>
            <StatusBadge status={post.status} />
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="bg-surface-2 -mx-4 -mt-4 border-b p-4">
            <PostPreview
              network={post.network}
              name={client.name}
              logoUrl={client.logoUrl}
              caption={post.caption}
              media={media.data ?? []}
              scheduledAt={post.scheduledAt}
            />
          </div>

          {(media.data ?? []).length > 1 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium">Tous les visuels</p>
              <MediaGallery media={media.data!} thumbSize="sm" />
            </div>
          )}

          <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Date</dt>
            <dd>
              {parisDateLabel(post.scheduledAt)} à {parisTimeLabel(post.scheduledAt)}
            </dd>
            <dt className="text-muted-foreground">Réseau</dt>
            <dd>{NETWORK_LABELS[post.network]}</dd>
          </dl>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">Légende</p>
            <p className="whitespace-pre-wrap text-sm">
              {post.caption || <span className="text-muted-foreground italic">Sans légende</span>}
            </p>
          </div>

          {post.performanceVisibleToClient && post.performanceNote && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Performance</p>
              <p className="whitespace-pre-wrap text-sm">{post.performanceNote}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium">Échanges</p>
            {comments.isLoading ? (
              <p className="text-muted-foreground text-sm">Chargement…</p>
            ) : (comments.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun échange pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {(comments.data ?? []).map((c) => (
                  <li key={c.id} className="bg-surface-2 rounded border p-2 text-sm">
                    <p className="text-muted-foreground mb-1 text-xs">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}

            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!body.trim()) return;
                addComment.mutate(body, { onSuccess: () => setBody('') });
              }}
            >
              <textarea
                className={textareaClass}
                rows={2}
                placeholder="Ajouter un commentaire…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                aria-label="Nouveau commentaire"
              />
              <Button size="sm" type="submit" disabled={addComment.isPending || !body.trim()}>
                Commenter
              </Button>
            </form>
          </div>
        </div>

        {pending && (
          <footer className="space-y-2 border-t p-4">
            {reject.isError && (
              <p className="text-destructive text-xs">{(reject.error as Error).message}</p>
            )}
            {approve.isError && (
              <p className="text-destructive text-xs">{(approve.error as Error).message}</p>
            )}

            {rejectMode ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reject-comment">
                  Que faut-il modifier ?
                </label>
                <textarea
                  id="reject-comment"
                  className={textareaClass}
                  rows={3}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={!rejectComment.trim() || busy}
                    onClick={() =>
                      reject.mutate(
                        { postId: post.id, comment: rejectComment.trim() },
                        { onSuccess: () => setRejectMode(false) },
                      )
                    }
                  >
                    Envoyer la demande
                  </Button>
                  <Button variant="ghost" onClick={() => setRejectMode(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="success" disabled={busy} onClick={() => approve.mutate(post.id)}>
                  Approuver
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setRejectMode(true)}>
                  Demander une modification
                </Button>
              </div>
            )}
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
}
