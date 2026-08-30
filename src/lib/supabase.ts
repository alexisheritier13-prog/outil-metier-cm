import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { requireSupabaseEnv } from '@/lib/env';

let client: SupabaseClient<Database> | null = null;

/**
 * Client Supabase (singleton). Créé à la première utilisation pour ne pas planter
 * l'app tant que les variables d'environnement ne sont pas configurées.
 * Utiliser uniquement depuis `src/services/*` — jamais directement dans un composant.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const { url, anonKey } = requireSupabaseEnv();
  client = createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

/** Réinitialise le singleton — usage tests uniquement. */
export function __resetSupabaseForTests(): void {
  client = null;
}
