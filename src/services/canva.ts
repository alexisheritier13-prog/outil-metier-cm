import { getSupabase } from '@/lib/supabase';
import type { CanvaImageSource } from '@/shared/utils/canva-parser';

export type CanvaPreviewError =
  | 'invalid_url'
  | 'private_or_unreachable'
  | 'no_image_meta'
  | 'timeout'
  | 'unknown';

export interface CanvaPreviewOk {
  ok: true;
  imageUrl: string;
  source: CanvaImageSource;
}
export interface CanvaPreviewFail {
  ok: false;
  error: CanvaPreviewError;
}
export type CanvaPreviewResult = CanvaPreviewOk | CanvaPreviewFail;

const MESSAGES: Record<CanvaPreviewError, string> = {
  invalid_url: "Ce lien n'est pas un lien Canva valide.",
  private_or_unreachable:
    'Aperçu indisponible. Vérifiez que le lien est « visible par toute personne ayant le lien ».',
  no_image_meta: "Impossible de trouver un aperçu sur cette page Canva.",
  timeout: "Canva n'a pas répondu à temps. Réessayez.",
  unknown: 'La récupération de l’aperçu a échoué.',
};

export function canvaPreviewMessage(error: CanvaPreviewError): string {
  return MESSAGES[error];
}

/**
 * Récupère l'URL d'aperçu d'un design Canva via l'Edge Function.
 * Ne lève jamais — renvoie toujours un résultat typé (NFR6 : jamais bloquant).
 */
export async function fetchCanvaPreview(url: string): Promise<CanvaPreviewResult> {
  try {
    const { data, error } = await getSupabase().functions.invoke('canva-preview', {
      body: { url },
    });
    if (error) {
      const body = (await readErr(error)) as { error?: string } | null;
      return { ok: false, error: normalize(body?.error) };
    }
    const res = data as { imageUrl: string; source: CanvaImageSource };
    return { ok: true, imageUrl: res.imageUrl, source: res.source };
  } catch {
    return { ok: false, error: 'unknown' };
  }
}

function normalize(code: string | undefined): CanvaPreviewError {
  switch (code) {
    case 'invalid_url':
    case 'private_or_unreachable':
    case 'no_image_meta':
    case 'timeout':
      return code;
    default:
      return 'unknown';
  }
}

async function readErr(error: unknown): Promise<unknown> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      return await ctx.json();
    } catch {
      return null;
    }
  }
  return null;
}
