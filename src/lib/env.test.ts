import { afterEach, describe, expect, it, vi } from 'vitest';

describe('requireSupabaseEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('lève une erreur listant les variables manquantes', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const { requireSupabaseEnv } = await import('@/lib/env');
    expect(() => requireSupabaseEnv()).toThrow(/VITE_SUPABASE_URL/);
    expect(() => requireSupabaseEnv()).toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it('renvoie url + anonKey quand les deux sont présentes', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    const { requireSupabaseEnv } = await import('@/lib/env');
    expect(requireSupabaseEnv()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
  });
});
