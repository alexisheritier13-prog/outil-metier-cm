import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Library, Loader2, Play, Trash2, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  mediaAsFile,
  mediaKindOf,
  mediaUrl,
} from '@/services/postMedia';
import { cn } from '@/lib/utils';
import type { PostMedia } from '@/shared/types';
import {
  useClientMedia,
  useDeletePostMedia,
  usePostMedia,
  useReorderPostMedia,
  useReuseMedia,
  useUploadPostMedia,
} from './usePostMedia';

/**
 * Éditeur des médias d'un post (photos / vidéos, carrousel ordonné).
 *
 * - **Post existant** (`postId`) : chaque ajout / suppression / réordre est
 *   appliqué immédiatement (Supabase Storage + table `post_media`).
 * - **Nouveau post** (`stagedFiles` + `onStagedChange`) : les fichiers sont
 *   gardés en mémoire et uploadés par `PostForm` après la création du post.
 */
interface Props {
  clientId: string;
  postId?: string;
  stagedFiles?: File[];
  onStagedChange?: (files: File[]) => void;
}

function reject(file: File): string | null {
  if (!mediaKindOf(file.type) || !ACCEPTED_MIME.includes(file.type)) {
    return `${file.name} : format non pris en charge`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} : fichier trop lourd (max 100 Mo)`;
  }
  return null;
}

export function MediaField({ clientId, postId, stagedFiles, onStagedChange }: Props) {
  const live = Boolean(postId);
  const media = usePostMedia(postId);
  const upload = useUploadPostMedia(clientId, postId ?? '');
  const del = useDeletePostMedia(postId ?? '');
  const reorder = useReorderPostMedia(postId ?? '');

  const reuse = useReuseMedia(clientId, postId ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [libOpen, setLibOpen] = useState(false);

  const items = media.data ?? [];

  async function addFromLibrary(source: PostMedia) {
    if (live) {
      await reuse.mutateAsync({ source, position: items.length });
    } else {
      setBusy(true);
      try {
        const file = await mediaAsFile(source);
        onStagedChange?.([...(stagedFiles ?? []), file]);
      } catch {
        setErrors((e) => [...e, 'Ce visuel de la bibliothèque n’a pas pu être ajouté.']);
      } finally {
        setBusy(false);
      }
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = [...files];
    const errs = list.map(reject).filter(Boolean) as string[];
    setErrors(errs);
    const ok = list.filter((f) => !reject(f));
    if (ok.length === 0) return;

    if (live) {
      setBusy(true);
      let pos = items.length;
      for (const file of ok) {
        try {
          await upload.mutateAsync({ file, position: pos });
          pos += 1;
        } catch {
          setErrors((e) => [...e, `${file.name} : échec de l'envoi`]);
        }
      }
      setBusy(false);
    } else {
      onStagedChange?.([...(stagedFiles ?? []), ...ok]);
    }
  }

  function moveStaged(from: number, to: number) {
    const arr = [...(stagedFiles ?? [])];
    const [x] = arr.splice(from, 1);
    arr.splice(to, 0, x!);
    onStagedChange?.(arr);
  }

  function moveLive(from: number, to: number) {
    const ids = items.map((m) => m.id);
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x!);
    reorder.mutate(ids);
  }

  const staged = stagedFiles ?? [];
  const count = live ? items.length : staged.length;

  return (
    <div className="space-y-2">
      <Label>Visuels {count > 0 && <span className="text-muted-foreground">({count})</span>}</Label>

      <div className="flex flex-wrap gap-2">
        {live
          ? items.map((m, i) => (
              <MediaCard
                key={m.id}
                src={mediaUrl(m.storagePath)}
                kind={m.kind}
                index={i}
                last={i === items.length - 1}
                onMove={moveLive}
                onRemove={() => del.mutate(m.id)}
              />
            ))
          : staged.map((f, i) => (
              <StagedCard
                key={`${f.name}-${i}`}
                file={f}
                index={i}
                last={i === staged.length - 1}
                onMove={moveStaged}
                onRemove={() => onStagedChange?.(staged.filter((_, j) => j !== i))}
              />
            ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border-input text-muted-foreground hover:border-border-strong hover:text-foreground grid h-24 w-24 place-items-center rounded border border-dashed transition-colors"
          aria-label="Ajouter des visuels"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setLibOpen(true)}
          className="border-input text-muted-foreground hover:border-border-strong hover:text-foreground grid h-24 w-24 place-items-center gap-1 rounded border border-dashed text-[11px] transition-colors"
        >
          <Library className="h-5 w-5" aria-hidden="true" />
          Bibliothèque
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <p className="text-muted-foreground text-xs">
        Photos et vidéos, jusqu'à 100 Mo par fichier. L'ordre = l'ordre du carrousel.
      </p>
      {errors.map((e) => (
        <p key={e} className="text-danger-strong text-xs">
          {e}
        </p>
      ))}

      <MediaLibraryDialog
        clientId={clientId}
        open={libOpen}
        onOpenChange={setLibOpen}
        onPick={addFromLibrary}
        busy={busy || reuse.isPending}
      />
    </div>
  );
}

function MediaLibraryDialog({
  clientId,
  open,
  onOpenChange,
  onPick,
  busy,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (m: PostMedia) => Promise<void>;
  busy: boolean;
}) {
  const lib = useClientMedia(clientId, open);
  const [added, setAdded] = useState<Set<string>>(new Set());

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-foreground/20 fixed inset-0 backdrop-blur-[1px]" />
        <DialogPrimitive.Content className="bg-surface shadow-panel z-modal fixed left-1/2 top-1/2 flex max-h-[80vh] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border p-0 focus:outline-none">
          <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
            <DialogPrimitive.Title className="text-sm font-semibold">
              Bibliothèque de visuels
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fermer">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {lib.isLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Chargement…</p>
            ) : (lib.data ?? []).length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Aucun visuel utilisé pour ce client pour l’instant.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {(lib.data ?? []).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await onPick(m);
                      setAdded((s) => new Set(s).add(m.id));
                    }}
                    className="group relative aspect-square overflow-hidden rounded-lg border disabled:opacity-60"
                  >
                    {m.kind === 'image' ? (
                      <img
                        src={mediaUrl(m.storagePath)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={mediaUrl(m.storagePath)}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span
                      className={cn(
                        'absolute inset-0 grid place-items-center text-xs font-medium text-white transition-opacity',
                        added.has(m.id)
                          ? 'bg-primary/70 opacity-100'
                          : 'bg-foreground/0 opacity-0 group-hover:bg-foreground/40 group-hover:opacity-100',
                      )}
                    >
                      {added.has(m.id) ? 'Ajouté' : 'Ajouter'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function MediaCard({
  src,
  kind,
  index,
  last,
  onMove,
  onRemove,
}: {
  src: string;
  kind: PostMedia['kind'];
  index: number;
  last: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  return (
    <Frame index={index} last={last} onMove={onMove} onRemove={onRemove}>
      {kind === 'image' ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <video src={src} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          <span className="bg-foreground/50 text-background pointer-events-none absolute inset-0 grid place-items-center">
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          </span>
        </>
      )}
    </Frame>
  );
}

function StagedCard({
  file,
  index,
  last,
  onMove,
  onRemove,
}: {
  file: File;
  index: number;
  last: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith('video/');
  return (
    <Frame index={index} last={last} onMove={onMove} onRemove={onRemove}>
      {isVideo ? (
        <>
          <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          <span className="bg-foreground/50 text-background pointer-events-none absolute inset-0 grid place-items-center">
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          </span>
        </>
      ) : (
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
    </Frame>
  );
}

function Frame({
  index,
  last,
  onMove,
  onRemove,
  children,
}: {
  index: number;
  last: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative h-24 w-24 overflow-hidden rounded border">
      {children}
      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          className="text-white/90 hover:text-white disabled:opacity-30"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          aria-label="Déplacer avant"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="text-white/90 hover:text-white disabled:opacity-30"
          disabled={last}
          onClick={() => onMove(index, index + 1)}
          aria-label="Déplacer après"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Retirer ce visuel"
        className={cn(
          'bg-foreground/60 text-background absolute right-1 top-1 rounded p-0.5 opacity-0 transition-opacity',
          'group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-danger',
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
