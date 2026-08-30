import { getSupabase } from '@/lib/supabase';

export interface AppMetaEntry {
  key: string;
  value: unknown;
  updatedAt: string;
}

/** Lit une entrée de `app_meta` (ou null si absente). */
export async function getAppMeta(key: string): Promise<AppMetaEntry | null> {
  const { data, error } = await getSupabase()
    .from('app_meta')
    .select('key, value, updated_at')
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { key: data.key, value: data.value, updatedAt: data.updated_at };
}

/** Renvoie la version de schéma enregistrée par les migrations. */
export async function getSchemaVersion(): Promise<number | null> {
  const entry = await getAppMeta('schema_version');
  if (entry && typeof entry.value === 'object' && entry.value !== null && 'version' in entry.value) {
    const v = (entry.value as { version: unknown }).version;
    return typeof v === 'number' ? v : null;
  }
  return null;
}
