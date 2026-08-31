import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  admin,
  assignUserToClient,
  createTestClient,
  createTestUser,
  deleteTestClients,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  TEST_ANON_KEY,
  TEST_URL,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('post_comments'));
const maybe = ready ? describe : describe.skip;

/** Stories 4.4 + 4.5 : historique (triggers) + commentaires (visibilité internal/client). */
maybe('post_history & post_comments', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';
  let postId = '';
  let contactClient: SupabaseClient;
  let contactUserId = '';

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    clientA = await createTestClient('HC ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);

    postId = (
      await cm.client
        .from('posts')
        .insert({
          client_id: clientA,
          network: 'instagram',
          scheduled_at: '2026-09-01T10:00:00Z',
          caption: 'Version 1',
          author_id: cm.id,
        })
        .select('id')
        .single()
    ).data!.id;

    // Contact client via l'Edge Function
    const email = `hc-contact-${crypto.randomUUID()}@example.test`;
    const inv = await lead.client.functions.invoke('admin-users', {
      body: { action: 'invite_contact', clientId: clientA, fullName: 'Contact', email },
    });
    contactUserId = (inv.data as { contact: { auth_user_id: string } }).contact.auth_user_id;
    await admin().auth.admin.updateUserById(contactUserId, { password: 'Test-Passw0rd!' });
    contactClient = createClient(TEST_URL, TEST_ANON_KEY, {
      auth: { persistSession: false, storageKey: `hc-${crypto.randomUUID()}` },
    });
    await contactClient.auth.signInWithPassword({ email, password: 'Test-Passw0rd!' });
    // le post doit être visible du contact → statut client_review
    await cm.client.rpc('post_change_status', { p_post_id: postId, p_to: 'internal_review' });
    await lead.client.rpc('post_change_status', { p_post_id: postId, p_to: 'client_review' });
  }, 40_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id, lead.id, contactUserId]);
  }, 30_000);

  it('l\'historique journalise création, changement de légende et transitions', async () => {
    await cm.client.from('posts').update({ caption: 'Version 2' }).eq('id', postId);

    const { data } = await admin()
      .from('post_history')
      .select('action, field')
      .eq('post_id', postId)
      .order('created_at');
    const actions = (data ?? []).map((h) => `${h.action}:${h.field ?? ''}`);
    expect(actions).toContain('create:');
    expect(actions).toContain('update:caption');
    expect(actions.filter((a) => a.startsWith('status_change')).length).toBeGreaterThanOrEqual(2);
  });

  it('commentaire interne : invisible du contact client ; commentaire client : visible', async () => {
    await cm.client.from('post_comments').insert({
      post_id: postId,
      author_id: cm.id,
      body: 'Note interne, ne pas montrer',
      visibility: 'internal',
    });
    await cm.client.from('post_comments').insert({
      post_id: postId,
      author_id: cm.id,
      body: 'Question pour le client',
      visibility: 'client',
    });

    const seenByContact = await contactClient
      .from('post_comments')
      .select('body, visibility')
      .eq('post_id', postId);
    const bodies = (seenByContact.data ?? []).map((c) => c.body);
    expect(bodies).toContain('Question pour le client');
    expect(bodies).not.toContain('Note interne, ne pas montrer');
  });

  it('le contact ne peut poster qu\'un commentaire visible client', async () => {
    const ok = await contactClient
      .from('post_comments')
      .insert({ post_id: postId, author_id: contactUserId, body: 'OK pour moi', visibility: 'client' });
    expect(ok.error).toBeNull();

    const ko = await contactClient.from('post_comments').insert({
      post_id: postId,
      author_id: contactUserId,
      body: 'tentative interne',
      visibility: 'internal',
    });
    expect(ko.error).not.toBeNull();
  });

  it('un CM non assigné ne voit ni l\'historique ni les commentaires', async () => {
    const other = await createTestUser('cm');
    const h = await other.client.from('post_history').select('id').eq('post_id', postId);
    const c = await other.client.from('post_comments').select('id').eq('post_id', postId);
    expect(h.data ?? []).toHaveLength(0);
    expect(c.data ?? []).toHaveLength(0);
    await deleteTestUsers([other.id]);
  });
});
