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

/** Story 5.3 : RPC approve_post / reject_post — périmètre contact client. */
maybe('approbation / refus client (5.3)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';
  let clientB = '';
  let contactA: TestContact;
  let contactB: TestContact;

  const newPostInReview = async (clientId: string) => {
    const { data } = await admin()
      .from('posts')
      .insert({
        client_id: clientId,
        network: 'instagram',
        scheduled_at: '2026-10-05T08:00:00Z',
        caption: 'À valider',
        author_id: cm.id,
        status: 'client_review',
      })
      .select('id')
      .single();
    return data!.id as string;
  };

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    [clientA, clientB] = await Promise.all([
      createTestClient('CA ' + crypto.randomUUID()),
      createTestClient('CB ' + crypto.randomUUID()),
    ]);
    await assignUserToClient(cm.id, clientA);
    contactA = await createTestContact(lead, clientA);
    contactB = await createTestContact(lead, clientB);
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id, lead.id, contactA.authUserId, contactB.authUserId]);
  }, 30_000);

  it('approbation : statut « validé », entrée historique, commentaire système, notification', async () => {
    const id = await newPostInReview(clientA);
    const r = await contactA.client.rpc('approve_post', { p_post_id: id });
    expect(r.error).toBeNull();
    expect((r.data as { status: string }).status).toBe('approved');

    const { data: hist } = await admin()
      .from('post_history')
      .select('action, new_value')
      .eq('post_id', id);
    expect((hist ?? []).some((h) => h.action === 'status_change' && h.new_value === 'approved')).toBe(
      true,
    );

    const { data: comments } = await admin()
      .from('post_comments')
      .select('body, visibility')
      .eq('post_id', id);
    expect((comments ?? []).some((c) => c.visibility === 'client' && /Approuvé par/.test(c.body))).toBe(
      true,
    );

    const { data: notif } = await admin()
      .from('notifications')
      .select('type, user_id')
      .eq('post_id', id);
    expect(notif).toEqual([
      expect.objectContaining({ type: 'post_client_approved', user_id: cm.id }),
    ]);
  });

  it('refus : commentaire obligatoire, statut « brouillon », notification', async () => {
    const id = await newPostInReview(clientA);

    const ko = await contactA.client.rpc('reject_post', { p_post_id: id, p_comment: '  ' });
    expect(ko.error).not.toBeNull();

    const ok = await contactA.client.rpc('reject_post', {
      p_post_id: id,
      p_comment: 'Le visuel ne correspond pas à la charte',
    });
    expect(ok.error).toBeNull();
    expect((ok.data as { status: string }).status).toBe('draft');

    const { data: comments } = await admin()
      .from('post_comments')
      .select('body, visibility')
      .eq('post_id', id);
    expect(
      (comments ?? []).some((c) => c.visibility === 'client' && /ne correspond pas/.test(c.body)),
    ).toBe(true);

    const { data: notif } = await admin()
      .from('notifications')
      .select('type')
      .eq('post_id', id)
      .eq('type', 'post_client_rejected');
    expect((notif ?? []).length).toBe(1);
  });

  it('un contact ne peut pas agir sur le post d’un autre client', async () => {
    const id = await newPostInReview(clientA);
    const r = await contactB.client.rpc('approve_post', { p_post_id: id });
    expect(r.error).not.toBeNull();
    // le post n'a pas bougé
    const { data } = await admin().from('posts').select('status').eq('id', id).single();
    expect(data!.status).toBe('client_review');
  });

  it('un post hors statut « à valider client » est refusé', async () => {
    const { data } = await admin()
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram',
        scheduled_at: '2026-10-06T08:00:00Z',
        caption: 'brouillon',
        author_id: cm.id,
        status: 'draft',
      })
      .select('id')
      .single();
    const r = await contactA.client.rpc('approve_post', { p_post_id: data!.id });
    expect(r.error).not.toBeNull();
  });

  it('un rôle interne ne peut pas appeler approve_post', async () => {
    const id = await newPostInReview(clientA);
    const r = await lead.client.rpc('approve_post', { p_post_id: id });
    expect(r.error).not.toBeNull();
    await admin().from('posts').update({ status: 'draft' }).eq('id', id);
  });
});
