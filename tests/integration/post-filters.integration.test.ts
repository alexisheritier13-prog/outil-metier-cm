import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  assignUserToClient,
  createTestClient,
  createTestUser,
  deleteTestClients,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('posts'));
const maybe = ready ? describe : describe.skip;

/** Story 3.5 : filtres transverses côté requête + isolation. */
maybe('filtres de posts (3.5)', () => {
  let cm: TestUser;
  let clientA = '';
  let clientB = '';

  beforeAll(async () => {
    cm = await createTestUser('cm');
    clientA = await createTestClient('FLT-A ' + crypto.randomUUID());
    clientB = await createTestClient('FLT-B ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);

    const base = (over: Record<string, unknown>) => ({
      network: 'instagram',
      scheduled_at: '2026-07-15T10:00:00Z',
      author_id: cm.id,
      caption: 'texte',
      ...over,
    });
    await admin()
      .from('posts')
      .insert([
        base({ client_id: clientA, network: 'instagram', caption: 'Promo de printemps', scheduled_at: '2026-07-10T10:00:00Z' }),
        base({ client_id: clientA, network: 'linkedin', caption: 'Recrutement', scheduled_at: '2026-08-05T10:00:00Z' }),
        base({ client_id: clientB, network: 'instagram', caption: 'Promo aussi', scheduled_at: '2026-07-12T10:00:00Z' }),
      ]);
  }, 30_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id]);
  }, 30_000);

  it('filtre par réseau, sur le périmètre du CM', async () => {
    const { data } = await cm.client
      .from('posts')
      .select('caption, network')
      .is('deleted_at', null)
      .eq('network', 'linkedin');
    expect((data ?? []).map((r) => r.caption)).toEqual(['Recrutement']);
  });

  it('filtre par période', async () => {
    const { data } = await cm.client
      .from('posts')
      .select('caption')
      .is('deleted_at', null)
      .gte('scheduled_at', '2026-08-01T00:00:00Z')
      .lte('scheduled_at', '2026-08-31T23:59:59Z');
    expect((data ?? []).map((r) => r.caption)).toEqual(['Recrutement']);
  });

  it('recherche plein texte (français) + isolation : ne voit pas le post du client B', async () => {
    const { data, error } = await cm.client
      .from('posts')
      .select('caption, client_id')
      .is('deleted_at', null)
      .textSearch('search_tsv', 'promo', { type: 'websearch', config: 'french' });
    expect(error).toBeNull();
    const captions = (data ?? []).map((r) => r.caption);
    expect(captions).toContain('Promo de printemps');
    expect((data ?? []).every((r) => r.client_id === clientA)).toBe(true);
  });
});
