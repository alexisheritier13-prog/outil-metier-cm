import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  createTestClient,
  createTestContact,
  createTestUser,
  deleteTestClients,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestContact,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('notifications'));
const maybe = ready ? describe : describe.skip;

/** Story 6.4 : historique des publiés côté client — périmètre + archivage. */
maybe('espace client : posts publiés (6.4)', () => {
  let lead: TestUser;
  let clientA = '';
  let contactA: TestContact;

  beforeAll(async () => {
    lead = await createTestUser('lead');
    clientA = await createTestClient('PUB ' + crypto.randomUUID());
    contactA = await createTestContact(lead, clientA);

    await admin()
      .from('posts')
      .insert([
        {
          client_id: clientA,
          network: 'instagram',
          scheduled_at: '2026-01-10T09:00:00Z',
          caption: 'Publié visible',
          author_id: lead.id,
          status: 'published',
          performance_note: '1200 likes',
          performance_visible_to_client: true,
        },
        {
          client_id: clientA,
          network: 'linkedin',
          scheduled_at: '2026-02-10T09:00:00Z',
          caption: 'Publié perf cachée',
          author_id: lead.id,
          status: 'published',
          performance_note: 'CPC interne',
          performance_visible_to_client: false,
        },
        {
          client_id: clientA,
          network: 'instagram',
          scheduled_at: '2026-03-10T09:00:00Z',
          caption: 'Encore en brouillon',
          author_id: lead.id,
          status: 'draft',
          performance_visible_to_client: false,
        },
      ]);
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([lead.id, contactA.authUserId]);
  }, 30_000);

  it('le contact voit ses posts publiés, pas les brouillons', async () => {
    const { data } = await contactA.client
      .from('posts')
      .select('caption, status')
      .eq('status', 'published');
    const captions = (data ?? []).map((p) => p.caption).sort();
    expect(captions).toEqual(['Publié perf cachée', 'Publié visible']);
  });

  it('reste accessible même après archivage du client', async () => {
    await admin().from('clients').update({ is_archived: true }).eq('id', clientA);

    const fiche = await contactA.client.from('clients').select('id, is_archived').eq('id', clientA);
    expect(fiche.data ?? []).toHaveLength(1);
    const posts = await contactA.client.from('posts').select('id').eq('status', 'published');
    expect((posts.data ?? []).length).toBe(2);

    await admin().from('clients').update({ is_archived: false }).eq('id', clientA);
  });
});
