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

/** 0038 : notifications côté contact client + sur les échanges. */
maybe('notifications — contact & commentaires (0038)', () => {
  let lead: TestUser;
  let contact: TestContact;
  let clientA = '';

  const mkPost = async (status: string) => {
    const { data } = await admin()
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram' as const,
        scheduled_at: new Date().toISOString(),
        caption: 'x',
        author_id: lead.id,
        status,
      })
      .select('id')
      .single();
    return data!.id as string;
  };

  beforeAll(async () => {
    lead = await createTestUser('lead');
    clientA = await createTestClient('NC ' + crypto.randomUUID());
    await assignUserToClient(lead.id, clientA);
    contact = await createTestContact(lead, clientA);
  }, 40_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([lead.id]);
    await admin().auth.admin.deleteUser(contact.authUserId);
  }, 30_000);

  it('entrée en validation client → le contact est notifié', async () => {
    const id = await mkPost('internal_review');
    const r = await lead.client.rpc('post_change_status', { p_post_id: id, p_to: 'client_review' });
    expect(r.error).toBeNull();

    const { data } = await contact.client
      .from('notifications')
      .select('type')
      .eq('post_id', id);
    expect((data ?? []).map((n) => n.type)).toContain('post_awaiting_client');
  });

  it('commentaire du contact → le rédacteur est notifié (kind message)', async () => {
    const id = await mkPost('client_review');
    const c = await contact.client.from('post_comments').insert({
      post_id: id,
      body: 'Petite remarque',
      visibility: 'client',
      author_id: contact.authUserId,
    });
    expect(c.error).toBeNull();

    const { data } = await admin()
      .from('notifications')
      .select('type, user_id')
      .eq('post_id', id);
    expect(
      (data ?? []).some((n) => n.type === 'comment_client' && n.user_id === lead.id),
    ).toBe(true);
  });

  it('demande de modification (system) ne double pas la notification', async () => {
    const id = await mkPost('client_review');
    const rej = await contact.client.rpc('reject_post', {
      p_post_id: id,
      p_comment: 'À revoir',
    });
    expect(rej.error).toBeNull();

    const { data } = await admin()
      .from('notifications')
      .select('type')
      .eq('post_id', id)
      .eq('user_id', lead.id);
    const types = (data ?? []).map((n) => n.type);
    expect(types).toContain('post_client_rejected');
    expect(types).not.toContain('comment_client');
  });
});
