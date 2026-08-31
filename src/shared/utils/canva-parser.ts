/**
 * Extraction de l'URL d'aperçu d'une page Canva partagée publiquement.
 * Pur, sans I/O — utilisé par l'Edge Function `canva-preview` (copié dans `_shared/`)
 * et testé unitairement.
 */

export type CanvaImageSource = 'og' | 'twitter' | 'image_src';

export interface CanvaParseResult {
  imageUrl: string;
  source: CanvaImageSource;
}

const META_PATTERNS: { source: CanvaImageSource; re: RegExp }[] = [
  {
    source: 'og',
    re: /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
  },
  {
    source: 'og',
    re: /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["']/i,
  },
  {
    source: 'twitter',
    re: /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
  },
  {
    source: 'twitter',
    re: /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["']/i,
  },
  { source: 'image_src', re: /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i },
];

export function parseCanvaImage(html: string): CanvaParseResult | null {
  for (const { source, re } of META_PATTERNS) {
    const m = re.exec(html);
    if (m?.[1]) {
      const url = decodeHtmlEntities(m[1].trim());
      if (/^https?:\/\//i.test(url)) return { imageUrl: url, source };
    }
  }
  return null;
}

/** Le lien Canva pointe-t-il vers un domaine Canva légitime ? */
export function isCanvaUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && /(^|\.)canva\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
