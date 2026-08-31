import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { listPortalComments } from '@/services/portal';

/**
 * Détail d'un post côté client (Story 6.2). Lecture seule : réseau, date, légende,
 * aperçu Canva, statut, commentaires `client`. Jamais d'historique, de rédacteur, de
 * commentaire interne ni d'autre client. Les actions (approuver / commenter) = Story 6.3.
 */
export function PortalPostDetail({
  post,
  onClose,
  footer,
}: {
  post: Post | null;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const comments = useQuery({
    queryKey: ['portal', 'comments', post?.id],
    queryFn: () => listPortalComments(post!.id),
    enabled: Boolean(post),
  });

  if (!post) return null;

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
          {post.canvaThumbnailUrl && (
            <img
              src={post.canvaThumbnailUrl}
              alt="Aperçu du visuel"
              className="max-h-72 w-full rounded border object-contain"
              loading="lazy"
            />
          )}

          <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Date</dt>
            <dd>
              {parisDateKey(post.scheduledAt)} à {parisTimeLabel(post.scheduledAt)}
            </dd>
            <dt className="text-muted-foreground">Réseau</dt>
            <dd>{NETWORK_LABELS[post.network]}</dd>
            {post.canvaUrl && (
              <>
                <dt className="text-muted-foreground">Visuel</dt>
                <dd className="truncate">
                  <a
                    href={post.canvaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    Ouvrir dans Canva
                  </a>
                </dd>
              </>
            )}
          </dl>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">Légende</p>
            <p className="whitespace-pre-wrap text-sm">
              {post.caption || <span className="text-muted-foreground italic">Sans légende</span>}
            </p>
          </div>

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
          </div>
        </div>

        {footer && <footer className="border-t p-4">{footer}</footer>}
      </SheetContent>
    </Sheet>
  );
}
