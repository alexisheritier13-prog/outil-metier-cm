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

const ready =
  hasDbTestEnv &&
  (await tableExists('post_transitions')) &&
  (await (async () => {
    const { error } = await admin().from('clients').select('skip_client_review').limit(1);
    return !error;
  })());
const maybe = ready ? describe : describe.skip;

/** Option « ce client ne valide pas les posts » : client_review est sauté. */
maybe('workflow — client sans validation (0034)', () => {
  let lead: TestUser;
  let normal = '';
  let skip = '';

  const mkPost = (client: string) =>
    lead.client
      .from('posts')
      .insert({
        client_id: client,
        network: 'instagram' as const,
        scheduled_at: new Date().toISOString(),
        caption: 'x',
        author_id: lead.id,
      })
      .select('id')
      .single();

  beforeAll(async () => {
    lead = await createTestUser('lead');
    normal = await createTestClient('SR-normal ' + crypto.randomUUID());
    skip = await createTestClient('SR-skip ' + crypto.randomUUID());
    await admin().from('clients').update({ skip_client_review: true }).eq('id', skip);
    await assignUserToClient(lead.id, normal);
    await assignUserToClient(lead.id, skip);
  }, 30_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [normal, skip]);
    await deleteTestClients([normal, skip]);
    await deleteTestUsers([lead.id]);
  }, 30_000);

  it('client normal : internal_review → approved est refusé', async () => {
    const { data: p } = await mkPost(normal);
    await lead.client.rpc('post_change_status', { p_post_id: p!.id, p_to: 'internal_review' });
    const r = await lead.client.rpc('post_change_status', { p_post_id: p!.id, p_to: 'approved' });
    expect(r.error).not.toBeNull();
  });

  it('client sans validation : internal_review → approved directement', async () => {
    const { data: p } = await mkPost(skip);
    await lead.client.rpc('post_change_status', { p_post_id: p!.id, p_to: 'internal_review' });
    const r = await lead.client.rpc('post_change_status', { p_post_id: p!.id, p_to: 'approved' });
    expect(r.error).toBeNull();
    expect((r.data as { status: string }).status).toBe('approved');
  });

  it('client sans validation : draft → approved reste interdit (CM seul off)', async () => {
    const { data: p } = await mkPost(skip);
    const r = await lead.client.rpc('post_change_status', { p_post_id: p!.id, p_to: 'approved' });
    expect(r.error).not.toBeNull();
  });
});
