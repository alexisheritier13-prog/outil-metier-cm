import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { mediaUrl } from '@/services/postMedia';
import { cn } from '@/lib/utils';
import type { PostMedia } from '@/shared/types';

/** Affichage en lecture d'un carrousel de médias (photos / vidéos). */
export function MediaGallery({
  media,
  className,
  thumbSize = 'md',
}: {
  media: PostMedia[];
  className?: string;
  thumbSize?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (media.length === 0) return null;

  const box = thumbSize === 'sm' ? 'h-16 w-16' : 'h-24 w-24';
  const current = open === null ? null : media[open];

  return (
    <>
      <ul className={cn('flex flex-wrap gap-2', className)}>
        {media.map((m, i) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className={cn(
                'group relative overflow-hidden rounded border',
                box,
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
              )}
              aria-label={`Ouvrir le média ${i + 1} sur ${media.length}`}
            >
              {m.kind === 'image' ? (
                <img
                  src={mediaUrl(m.storagePath)}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <>
                  <video
                    src={mediaUrl(m.storagePath)}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <span className="bg-foreground/55 text-background absolute inset-0 grid place-items-center">
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  </span>
                </>
              )}
              {media.length > 1 && (
                <span className="bg-foreground/70 text-background absolute bottom-0.5 right-0.5 rounded px-1 text-[10px] tabular-nums">
                  {i + 1}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Aperçu du média</DialogTitle>
          {current && (
            <div className="space-y-3">
              <div className="bg-surface-2 grid max-h-[70vh] place-items-center overflow-hidden rounded">
                {current.kind === 'image' ? (
                  <img
                    src={mediaUrl(current.storagePath)}
                    alt=""
                    className="max-h-[70vh] w-auto object-contain"
                  />
                ) : (
                  // Vidéo fournie par l'utilisateur (contenu social) — pas de piste de sous-titres.
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={mediaUrl(current.storagePath)}
                    className="max-h-[70vh] w-auto"
                    controls
                    autoPlay
                    playsInline
                  />
                )}
              </div>
              {media.length > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="hover:bg-surface-2 rounded-md p-2 disabled:opacity-40"
                    onClick={() => setOpen((o) => (o === null ? o : Math.max(0, o - 1)))}
                    disabled={open === 0}
                    aria-label="Média précédent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {(open ?? 0) + 1} / {media.length}
                  </span>
                  <button
                    type="button"
                    className="hover:bg-surface-2 rounded-md p-2 disabled:opacity-40"
                    onClick={() =>
                      setOpen((o) => (o === null ? o : Math.min(media.length - 1, o + 1)))
                    }
                    disabled={open === media.length - 1}
                    aria-label="Média suivant"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Vignette compacte du premier média (listes, cartes). `null` si aucun média. */
export function FirstMediaThumb({
  media,
  className,
}: {
  media: PostMedia[];
  className?: string;
}) {
  const first = media[0];
  if (!first) return null;
  return first.kind === 'image' ? (
    <img
      src={mediaUrl(first.storagePath)}
      alt=""
      className={cn('object-cover', className)}
      loading="lazy"
    />
  ) : (
    <div className={cn('bg-foreground/5 relative', className)}>
      <video
        src={mediaUrl(first.storagePath)}
        className="h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
      />
      <span className="bg-foreground/55 text-background absolute inset-0 grid place-items-center">
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
      </span>
    </div>
  );
}
