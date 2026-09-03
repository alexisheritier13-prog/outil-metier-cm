import { useId, useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  IMAGE_ACCEPT_ATTR,
  ImageUploadError,
  uploadBrandImage,
} from '@/services/brandAssets';

interface Props {
  label: string;
  /** URL actuelle (stockée en base) ou vide. */
  value: string;
  onChange: (url: string) => void;
  /** Dossier de rangement dans le bucket. */
  folder: 'clients' | 'orgs' | 'avatars';
  hint?: string;
  /** `circle` pour une photo de profil, `square` (défaut) pour un logo. */
  shape?: 'square' | 'circle';
  disabled?: boolean;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  hint,
  shape = 'square',
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const url = await uploadBrandImage(file, folder);
      onChange(url);
    } catch (e) {
      setError(e instanceof ImageUploadError ? e.message : "L'envoi a échoué.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <span id={id} className="text-sm font-medium">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'bg-surface-2 grid h-14 w-14 shrink-0 place-items-center overflow-hidden border',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="text-muted-foreground h-5 w-5" aria-hidden="true" />
          )}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTR}
            className="sr-only"
            aria-labelledby={id}
            disabled={disabled || busy}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {value ? 'Remplacer' : 'Ajouter une image'}
          </Button>
          {value && !busy && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setError(null);
                onChange('');
              }}
            >
              <X className="h-4 w-4" /> Retirer
            </Button>
          )}
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
