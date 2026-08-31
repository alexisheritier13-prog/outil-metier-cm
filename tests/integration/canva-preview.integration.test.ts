import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestUser,
  deleteTestUsers,
  hasDbTestEnv,
  type TestUser,
} from './_helpers';

const maybe = hasDbTestEnv ? describe : describe.skip;

/** Story 4.1 : Edge Function canva-preview. */
maybe('canva-preview (Edge Function)', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser('cm');
  }, 30_000);

  afterAll(async () => {
    await deleteTestUsers([user.id]);
  }, 20_000);

  it('récupère og:image depuis une page canva.com', async () => {
    const { data, error } = await user.client.functions.invoke('canva-preview', {
      body: { url: 'https://www.canva.com/' },
    });
    expect(error).toBeNull();
    expect((data as { imageUrl: string }).imageUrl).toMatch(/^https:\/\/.+\.(jpg|png|webp)/i);
    expect((data as { source: string }).source).toBe('og');
  });

  it('refuse une URL non-Canva', async () => {
    const { data, error } = await user.client.functions.invoke('canva-preview', {
      body: { url: 'https://example.com/design/x' },
    });
    // supabase-js met error != null pour un status 4xx
    expect(error ?? data).toBeTruthy();
    if (error?.context) {
      const body = await error.context.json();
      expect(body.error).toBe('invalid_url');
    }
  });

  it('refuse une URL invalide', async () => {
    const { error } = await user.client.functions.invoke('canva-preview', {
      body: { url: 'pas-une-url' },
    });
    expect(error).not.toBeNull();
  });

  it('renvoie une erreur typée pour un design Canva inexistant', async () => {
    const { error } = await user.client.functions.invoke('canva-preview', {
      body: { url: 'https://www.canva.com/design/DOES-NOT-EXIST-000/view' },
    });
    expect(error).not.toBeNull();
    if (error?.context) {
      const body = await error.context.json();
      expect(['private_or_unreachable', 'no_image_meta', 'timeout']).toContain(body.error);
    }
  });
});
