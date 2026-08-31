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

const ready = hasDbTestEnv && (await tableExists('client_activity'));
const maybe = ready ? describe : describe.skip;

/** Story 5.5 : vue client_activity — agrégation + droits. */
maybe('journal d’activité client (5.5)', () => {
  let cm: TestUser;
  let other: TestUser;
  let lead: TestUser;
  let clientA = '';
  let contactA: TestContact;
  let postId = '';

  beforeAll(async () => {
    [cm, other, lead] = await Promise.all([
      createTestUser('cm'),
      createTestUser('cm'),
      createTestUser('lead'),
    ]);
    clientA = await createTestClient('ACT ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
    contactA = await createTestContact(lead, clientA);

    postId = (
      await cm.client
        .from('posts')
        .insert({
          client_id: clientA,
          network: 'instagram',
          scheduled_at: '2026-12-01T09:00:00Z',
          caption: 'Parcours complet',
          author_id: cm.id,
        })
        .select('id')
        .single()
    ).data!.id;

    // create + update + soumission + validation interne + approbation client
    await cm.client.from('posts').update({ caption: 'Parcours complet v2' }).eq('id', postId);
    await cm.client.rpc('post_change_status', { p_post_id: postId, p_to: 'internal_review' });
    await lead.client.rpc('post_change_status', { p_post_id: postId, p_to: 'client_review' });
    await contactA.client.rpc('approve_post', { p_post_id: postId });
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id, other.id, lead.id, contactA.authUserId]);
  }, 30_000);

  it('agrège les entrées du parcours pour le CM assigné', async () => {
    const { data, error } = await cm.client
      .from('client_activity')
      .select('action, field, new_value, actor_name')
      .eq('client_id', clientA)
      .eq('post_id', postId);
    expect(error).toBeNull();

    const rows = data ?? [];
    expect(rows.some((r) => r.action === 'create')).toBe(true);
    expect(rows.some((r) => r.action === 'update' && r.field === 'caption')).toBe(true);
    const statuses = rows.filter((r) => r.action === 'status_change').map((r) => r.new_value);
    expect(statuses).toEqual(
      expect.arrayContaining(['internal_review', 'client_review', 'approved']),
    );

    // le nom du contact est résolu pour l'action d'approbation
    const approve = rows.find((r) => r.new_value === 'approved');
    expect(approve?.actor_name).toBeTruthy();
  });

  it('un CM non assigné ne voit rien du journal de ce client', async () => {
    const { data } = await other.client
      .from('client_activity')
      .select('history_id')
      .eq('client_id', clientA);
    expect(data ?? []).toHaveLength(0);
  });

  it('client_overview reflète les compteurs réels', async () => {
    // remet le post en attente client pour l'assertion
    await admin().from('posts').update({ status: 'client_review' }).eq('id', postId);
    const { data } = await lead.client
      .from('client_overview')
      .select('pending_client, last_activity_at')
      .eq('id', clientA)
      .single();
    expect(data!.pending_client).toBeGreaterThanOrEqual(1);
    expect(data!.last_activity_at).toBeTruthy();
  });
});
