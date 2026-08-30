// En-têtes CORS partagés par les Edge Functions.
// L'app étant servie depuis un domaine distinct (Vercel/Netlify), on autorise l'origine
// appelante ; en production on pourra restreindre via une variable d'environnement.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
