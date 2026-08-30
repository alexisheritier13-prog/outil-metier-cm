import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;

// Ignoré tant qu'aucune instance Supabase de test n'est configurée (voir README).
const maybe = url && anonKey ? describe : describe.skip;

maybe('app_meta (intégration DB)', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(url as string, anonKey as string);
  });

  it('la migration 0001 a créé app_meta et enregistré schema_version >= 1', async () => {
    const { data, error } = await supabase
      .from('app_meta')
      .select('key, value')
      .eq('key', 'schema_version')
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    const version = (data?.value as { version?: number } | null)?.version ?? 0;
    expect(version).toBeGreaterThanOrEqual(1);
  });

  it('anon peut lire app_meta mais pas écrire', async () => {
    const read = await supabase.from('app_meta').select('key').limit(1);
    expect(read.error).toBeNull();

    const write = await supabase.from('app_meta').insert({ key: 'hack', value: {} });
    expect(write.error).not.toBeNull();
  });
});
