// canva-preview — récupère l'URL d'aperçu (og:image) d'un design Canva partagé.
//
// - N'accepte que des URLs *.canva.com en https
// - Timeout 5 s, ne suit pas de redirection hors canva.com
// - Ne stocke aucun binaire : renvoie juste l'URL de l'image
// - Erreurs typées (422) : private_or_unreachable | no_image_meta | timeout | invalid_url
import { corsHeaders, json } from '../_shared/cors.ts';
import { isCanvaUrl, parseCanvaImage } from '../_shared/canva-parser.ts';

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let url: string;
  try {
    url = String((await req.json()).url ?? '');
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  if (!isCanvaUrl(url)) return json(422, { error: 'invalid_url' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        // Canva ne sert les balises og: qu'aux crawlers de dépliage de lien.
        'user-agent': 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
        accept: 'text/html',
      },
    });

    // Redirection hors canva.com : refusée.
    if (!isCanvaUrl(res.url)) return json(422, { error: 'private_or_unreachable' });
    if (!res.ok) return json(422, { error: 'private_or_unreachable' });

    const html = await readCapped(res, MAX_BYTES);
    const parsed = parseCanvaImage(html);
    if (!parsed) return json(422, { error: 'no_image_meta' });

    return json(200, { imageUrl: parsed.imageUrl, source: parsed.source });
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    return json(422, { error: name === 'AbortError' ? 'timeout' : 'private_or_unreachable' });
  } finally {
    clearTimeout(timer);
  }
});

async function readCapped(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder().decode(concat(chunks));
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
