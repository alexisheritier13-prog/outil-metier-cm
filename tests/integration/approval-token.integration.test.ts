import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
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

const ready = hasDbTestEnv && (await tableExists('post_approval_tokens'));
const maybe = ready ? describe : describe.skip;

/** 0040 : validation d'un post via un lien (jeton), sans connexion. */
maybe('approval token (0040)', () => {
  let lead: TestUser;
  let clientA = '';
  const anon = () => createClient(TEST_URL, TEST_ANON_KEY, { auth: { persistSession: false } });

  const mkClientReview = async () => {
    const { data } = await admin()
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram' as const,
        scheduled_at: new Date().toISOString(),
        caption: 'À valider',
        author_id: lead.id,
        status: 'internal_review' as const,
      })
      .select('id')
      .single();
    await lead.client.rpc('post_change_status', { p_post_id: data!.id, p_to: 'client_review' });
    const { data: t } = await admin()
      .from('post_approval_tokens')
      .select('token')
      .eq('post_id', data!.id)
      .single();
    return { postId: data!.id as string, token: t!.token as string };
  };

  beforeAll(async () => {
    lead = await createTestUser('lead');
    clientA = await createTestClient('TK ' + crypto.randomUUID());
    await assignUserToClient(lead.id, clientA);
  }, 40_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([lead.id]);
  }, 30_000);

  it('lecture publique du post via jeton', async () => {
    const { token } = await mkClientReview();
    const { data } = await anon().rpc('post_by_approval_token', { p_token: token });
    expect(data).toMatchObject({ status: 'client_review', caption: 'À valider', used: false });
  });

  it('approbation via jeton → post approuvé, jeton consommé', async () => {
    const { postId, token } = await mkClientReview();
    const r1 = await anon().rpc('approve_via_token', { p_token: token });
    expect(r1.data).toBe('ok');

    const { data: p } = await admin().from('posts').select('status').eq('id', postId).single();
    expect(p?.status).toBe('approved');

    const r2 = await anon().rpc('approve_via_token', { p_token: token });
    expect(r2.data).toBe('invalid');
  });

  it('demande de modif via jeton → post en brouillon + commentaire', async () => {
    const { postId, token } = await mkClientReview();
    const r = await anon().rpc('reject_via_token', { p_token: token, p_comment: 'Changer le visuel' });
    expect(r.data).toBe('ok');

    const { data: p } = await admin().from('posts').select('status').eq('id', postId).single();
    expect(p?.status).toBe('draft');
    const { data: c } = await admin()
      .from('post_comments')
      .select('body')
      .eq('post_id', postId)
      .eq('kind', 'system');
    expect((c ?? []).some((x) => x.body === 'Changer le visuel')).toBe(true);
  });

  it('jeton inconnu → null / invalid', async () => {
    const fake = crypto.randomUUID();
    const { data } = await anon().rpc('post_by_approval_token', { p_token: fake });
    expect(data).toBeNull();
    const r = await anon().rpc('approve_via_token', { p_token: fake });
    expect(r.data).toBe('invalid');
  });
});
