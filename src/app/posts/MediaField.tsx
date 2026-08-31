import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Play, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ACCEPTED_MIME, MAX_FILE_BYTES, mediaKindOf, mediaUrl } from '@/services/postMedia';
import { cn } from '@/lib/utils';
import type { PostMedia } from '@/shared/types';
import {
  useDeletePostMedia,
  usePostMedia,
  useReorderPostMedia,
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

  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const items = media.data ?? [];

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
    </div>
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
