import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  assignUserToClient,
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

/** Story 6.1 : isolation stricte de l'espace client (exigence n°1). */
maybe('isolation espace client (6.1)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';
  let clientB = '';
  let contactA: TestContact;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    [clientA, clientB] = await Promise.all([
      createTestClient('PA ' + crypto.randomUUID()),
      createTestClient('PB ' + crypto.randomUUID()),
    ]);
    await Promise.all([assignUserToClient(cm.id, clientA), assignUserToClient(cm.id, clientB)]);
    contactA = await createTestContact(lead, clientA);

    const mk = async (clientId: string, status: string, caption: string) => {
      const { data } = await admin()
        .from('posts')
        .insert({
          client_id: clientId,
          network: 'instagram',
          scheduled_at: '2026-12-10T09:00:00Z',
          caption,
          author_id: cm.id,
          status,
        })
        .select('id')
        .single();
      ids[caption] = data!.id;
    };
    await mk(clientA, 'draft', 'A-draft');
    await mk(clientA, 'client_review', 'A-review');
    await mk(clientA, 'published', 'A-published');
    await mk(clientB, 'client_review', 'B-review');

    await admin().from('post_comments').insert([
      { post_id: ids['A-review'], author_id: cm.id, body: 'note interne', visibility: 'internal' },
      { post_id: ids['A-review'], author_id: cm.id, body: 'pour le client', visibility: 'client' },
    ]);
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id, lead.id, contactA.authUserId]);
  }, 30_000);

  it('le contact ne lit que sa fiche client', async () => {
    const { data } = await contactA.client.from('clients').select('id');
    expect((data ?? []).map((c) => c.id)).toEqual([clientA]);

    const b = await contactA.client.from('clients').select('id').eq('id', clientB);
    expect(b.data ?? []).toHaveLength(0);
  });

  it('le contact voit ses posts à partir de « à valider client », jamais ceux d’un autre client', async () => {
    const { data } = await contactA.client.from('posts').select('caption, client_id');
    const captions = (data ?? []).map((p) => p.caption).sort();
    expect(captions).toEqual(['A-published', 'A-review']);
    expect((data ?? []).every((p) => p.client_id === clientA)).toBe(true);

    const direct = await contactA.client.from('posts').select('id').eq('client_id', clientB);
    expect(direct.data ?? []).toHaveLength(0);
  });

  it('le contact ne voit que les commentaires « client » de ses posts', async () => {
    const { data } = await contactA.client
      .from('post_comments')
      .select('body, visibility')
      .eq('post_id', ids['A-review']);
    expect(data).toEqual([expect.objectContaining({ visibility: 'client', body: 'pour le client' })]);
  });

  it('le contact ne lit aucune campagne ni assignation interne', async () => {
    const camp = await contactA.client.from('campaigns').select('id');
    expect(camp.data ?? []).toHaveLength(0);
    const uc = await contactA.client.from('user_clients').select('client_id');
    expect(uc.data ?? []).toHaveLength(0);
  });

  it('un contact désactivé ne voit plus rien', async () => {
    await admin()
      .from('client_contacts')
      .update({ is_active: false })
      .eq('auth_user_id', contactA.authUserId);

    const clients = await contactA.client.from('clients').select('id');
    const posts = await contactA.client.from('posts').select('id');
    expect(clients.data ?? []).toHaveLength(0);
    expect(posts.data ?? []).toHaveLength(0);

    await admin()
      .from('client_contacts')
      .update({ is_active: true })
      .eq('auth_user_id', contactA.authUserId);
  });
});
