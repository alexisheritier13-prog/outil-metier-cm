import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ImageOff, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isCanvaUrl } from '@/shared/utils/canva-parser';
import { canvaPreviewMessage, fetchCanvaPreview, type CanvaPreviewError } from '@/services/canva';

interface Props {
  url: string;
  onUrlChange: (v: string) => void;
  /** Miniature résolue (auto) et sa source ; remontée au parent pour l'enregistrement. */
  thumbnailUrl: string | null;
  thumbnailSource: 'auto' | 'manual' | null;
  onThumbnail: (url: string | null, source: 'auto' | 'manual' | null) => void;
}

/**
 * Lien Canva + aperçu. La récupération est asynchrone et **ne bloque jamais**
 * l'enregistrement (NFR6). Fallback : saisie manuelle d'une miniature + aperçu iframe.
 */
export function CanvaField({ url, onUrlChange, thumbnailUrl, thumbnailSource, onThumbnail }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CanvaPreviewError | null>(null);
  const [manualUrl, setManualUrl] = useState(thumbnailSource === 'manual' ? (thumbnailUrl ?? '') : '');
  const [iframeOpen, setIframeOpen] = useState(false);
  const lastFetched = useRef<string | null>(null);

  async function run(target: string) {
    if (!isCanvaUrl(target) || lastFetched.current === target) return;
    lastFetched.current = target;
    setLoading(true);
    setError(null);
    const res = await fetchCanvaPreview(target);
    setLoading(false);
    if (res.ok) {
      onThumbnail(res.imageUrl, 'auto');
    } else {
      setError(res.error);
      if (thumbnailSource === 'auto') onThumbnail(null, null);
    }
  }

  // Débounce à la saisie / au collage.
  useEffect(() => {
    if (!isCanvaUrl(url)) {
      setError(url.trim() && !isCanvaUrl(url) ? 'invalid_url' : null);
      return;
    }
    const t = setTimeout(() => void run(url), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // La miniature manuelle prime.
  useEffect(() => {
    const trimmed = manualUrl.trim();
    if (trimmed && /^https?:\/\//i.test(trimmed)) {
      onThumbnail(trimmed, 'manual');
    } else if (thumbnailSource === 'manual') {
      onThumbnail(null, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualUrl]);

  return (
    <div className="space-y-2">
      <Label htmlFor="pf-canva">Lien Canva</Label>
      <div className="flex gap-2">
        <Input
          id="pf-canva"
          placeholder="https://www.canva.com/design/…"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        {isCanvaUrl(url) && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Rafraîchir l'aperçu"
              disabled={loading}
              onClick={() => {
                lastFetched.current = null;
                void run(url);
              }}
            >
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Aperçu Canva"
              onClick={() => setIframeOpen(true)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <p className="text-muted-foreground flex gap-1.5 text-xs">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Le lien doit être « visible par toute personne ayant le lien » pour que l'aperçu se
        charge.
      </p>

      {loading && <p className="text-muted-foreground text-sm">Récupération de l'aperçu…</p>}

      {thumbnailUrl ? (
        <div className="flex items-start gap-3">
          <img
            src={thumbnailUrl}
            alt="Aperçu du visuel Canva"
            className="h-24 w-24 rounded border object-cover"
            loading="lazy"
          />
          <p className="text-muted-foreground text-xs">
            Miniature {thumbnailSource === 'manual' ? 'manuelle' : 'automatique'}.
          </p>
        </div>
      ) : (
        error && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            {canvaPreviewMessage(error)}
          </div>
        )
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pf-canva-manual" className="text-muted-foreground text-xs font-normal">
          Miniature manuelle (facultatif, prioritaire sur l'automatique)
        </Label>
        <Input
          id="pf-canva-manual"
          placeholder="https://…/image.png"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
      </div>

      <Dialog open={iframeOpen} onOpenChange={setIframeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aperçu Canva</DialogTitle>
          </DialogHeader>
          <iframe
            title="Aperçu Canva"
            src={url}
            className="h-[70vh] w-full rounded border"
            sandbox="allow-scripts allow-same-origin"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
