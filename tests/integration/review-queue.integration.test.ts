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

/** Story 5.4 : file « À valider » (isolation par rôle) + relance client. */
maybe('file de validation (5.4)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';
  let clientB = '';
  let contactA: TestContact;

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    [clientA, clientB] = await Promise.all([
      createTestClient('RQ-A ' + crypto.randomUUID()),
      createTestClient('RQ-B ' + crypto.randomUUID()),
    ]);
    await assignUserToClient(cm.id, clientA);
    contactA = await createTestContact(lead, clientA);

    await admin()
      .from('posts')
      .insert([
        {
          client_id: clientA,
          network: 'instagram',
          scheduled_at: '2026-11-01T09:00:00Z',
          caption: 'A interne',
          author_id: cm.id,
          status: 'internal_review',
        },
        {
          client_id: clientA,
          network: 'linkedin',
          scheduled_at: '2026-11-02T09:00:00Z',
          caption: 'A client',
          author_id: cm.id,
          status: 'client_review',
        },
        {
          client_id: clientB,
          network: 'instagram',
          scheduled_at: '2026-11-03T09:00:00Z',
          caption: 'B interne',
          author_id: lead.id,
          status: 'internal_review',
        },
      ]);
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id, lead.id, contactA.authUserId]);
  }, 30_000);

  it('un CM ne voit que la file de ses clients ; un lead voit tout', async () => {
    const cmInternal = await cm.client
      .from('posts')
      .select('caption, client_id')
      .eq('status', 'internal_review')
      .is('deleted_at', null);
    const cmClientIds = new Set((cmInternal.data ?? []).map((p) => p.client_id));
    expect(cmClientIds.has(clientA)).toBe(true);
    expect(cmClientIds.has(clientB)).toBe(false); // pas assigné à B

    const leadInternal = await lead.client
      .from('posts')
      .select('caption')
      .eq('status', 'internal_review')
      .is('deleted_at', null);
    const captions = (leadInternal.data ?? []).map((p) => p.caption);
    expect(captions).toEqual(expect.arrayContaining(['A interne', 'B interne']));
  });

  it('relance client : notifie le contact, journalise, et refuse hors statut', async () => {
    const { data: p } = await admin()
      .from('posts')
      .select('id')
      .eq('client_id', clientA)
      .eq('status', 'client_review')
      .single();

    const r = await cm.client.rpc('remind_client_review', { p_post_id: p!.id });
    expect(r.error).toBeNull();

    const { data: notif } = await admin()
      .from('notifications')
      .select('type, user_id')
      .eq('post_id', p!.id)
      .eq('type', 'client_review_reminder');
    expect(notif).toEqual([
      expect.objectContaining({ user_id: contactA.authUserId }),
    ]);

    const { data: hist } = await admin()
      .from('post_history')
      .select('new_value')
      .eq('post_id', p!.id)
      .eq('action', 'comment');
    expect((hist ?? []).some((h) => /Relance envoyée/.test(h.new_value ?? ''))).toBe(true);

    // post en internal_review → refusé
    const { data: pi } = await admin()
      .from('posts')
      .select('id')
      .eq('client_id', clientA)
      .eq('status', 'internal_review')
      .single();
    const ko = await cm.client.rpc('remind_client_review', { p_post_id: pi!.id });
    expect(ko.error).not.toBeNull();
  });

  it('un contact ne peut pas appeler remind_client_review', async () => {
    const { data: p } = await admin()
      .from('posts')
      .select('id')
      .eq('client_id', clientA)
      .eq('status', 'client_review')
      .single();
    const r = await contactA.client.rpc('remind_client_review', { p_post_id: p!.id });
    expect(r.error).not.toBeNull();
  });
});
