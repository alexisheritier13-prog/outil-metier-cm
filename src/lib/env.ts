/**
 * Accès centralisé aux variables d'environnement (ne jamais lire `import.meta.env`
 * ailleurs dans le code applicatif). Seules les variables `VITE_*` sont exposées au
 * client — aucun secret ici.
 *
 * Les valeurs Supabase peuvent être absentes tant que la Story 1.2 n'est pas finalisée
 * côté infra ; `requireSupabaseEnv()` lève une erreur claire au moment où on en a besoin.
 */

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
} as const;

/** Renvoie l'URL + la clé anon Supabase, ou lève une erreur listant ce qui manque. */
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Variable(s) d'environnement manquante(s) : ${missing.join(', ')}. ` +
        `Copiez .env.example vers .env.local et renseignez les valeurs du projet Supabase.`,
    );
  }
  return { url: env.supabaseUrl, anonKey: env.supabaseAnonKey };
}
