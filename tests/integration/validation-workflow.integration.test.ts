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

const ready = hasDbTestEnv && (await tableExists('notifications'));
const maybe = ready ? describe : describe.skip;

/** Story 5.1 : circuit de validation interne CM ↔ Lead + émission des notifications. */
maybe('workflow de validation interne (5.1)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';

  const newPost = async () =>
    (
      await cm.client
        .from('posts')
        .insert({
          client_id: clientA,
          network: 'instagram',
          scheduled_at: '2026-10-01T09:00:00Z',
          caption: 'Contenu',
          author_id: cm.id,
        })
        .select('id')
        .single()
    ).data!.id as string;

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    clientA = await createTestClient('VW ' + crypto.randomUUID());
    await Promise.all([assignUserToClient(cm.id, clientA), assignUserToClient(lead.id, clientA)]);
  }, 40_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id, lead.id]);
  }, 30_000);

  it('soumission par le CM → notifie le lead assigné', async () => {
    const id = await newPost();
    const r = await cm.client.rpc('post_change_status', { p_post_id: id, p_to: 'internal_review' });
    expect(r.error).toBeNull();

    const { data } = await admin()
      .from('notifications')
      .select('type, user_id, post_id')
      .eq('post_id', id);
    expect(data).toEqual([
      expect.objectContaining({ type: 'post_submitted', user_id: lead.id }),
    ]);
  });

  it('validation interne du lead → notifie le rédacteur ; pas de self-notification', async () => {
    const id = await newPost();
    await cm.client.rpc('post_change_status', { p_post_id: id, p_to: 'internal_review' });
    const r = await lead.client.rpc('post_change_status', { p_post_id: id, p_to: 'client_review' });
    expect(r.error).toBeNull();

    const { data } = await admin()
      .from('notifications')
      .select('type, user_id')
      .eq('post_id', id)
      .eq('type', 'post_internal_approved');
    expect(data).toEqual([expect.objectContaining({ user_id: cm.id })]);
    // le lead a agi : il ne se notifie pas lui-même
    expect((data ?? []).some((n) => n.user_id === lead.id)).toBe(false);
  });

  it('renvoi au rédacteur : commentaire obligatoire, puis notification', async () => {
    const id = await newPost();
    await cm.client.rpc('post_change_status', { p_post_id: id, p_to: 'internal_review' });

    const ko = await lead.client.rpc('post_change_status', { p_post_id: id, p_to: 'draft' });
    expect(ko.error).not.toBeNull();

    const ok = await lead.client.rpc('post_change_status', {
      p_post_id: id,
      p_to: 'draft',
      p_comment: 'Revoir l’accroche',
    });
    expect(ok.error).toBeNull();

    const { data } = await admin()
      .from('notifications')
      .select('type, user_id')
      .eq('post_id', id)
      .eq('type', 'post_returned');
    expect(data).toEqual([expect.objectContaining({ user_id: cm.id })]);
  });

  it('un CM ne peut pas valider en interne', async () => {
    const id = await newPost();
    await cm.client.rpc('post_change_status', { p_post_id: id, p_to: 'internal_review' });
    const r = await cm.client.rpc('post_change_status', { p_post_id: id, p_to: 'client_review' });
    expect(r.error).not.toBeNull();
  });

  it('chacun ne lit que ses propres notifications', async () => {
    const seenByCm = await cm.client.from('notifications').select('user_id');
    expect((seenByCm.data ?? []).every((n) => n.user_id === cm.id)).toBe(true);
  });
});
