import { afterAll, beforeAll, afterEach, describe, expect, it } from 'vitest';
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

const ready = hasDbTestEnv && (await tableExists('post_transitions'));
const maybe = ready ? describe : describe.skip;

/** Mode « CM seul » : draft → client_review directement quand le réglage est actif. */
maybe('workflow — mode CM seul', () => {
  let cm: TestUser;
  let clientA = '';

  const setSkip = (on: boolean) =>
    admin()
      .from('app_settings')
      .upsert({ key: 'workflow', value: { skip_internal_review: on } }, { onConflict: 'key' });

  const mkPost = () =>
    cm.client
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram' as const,
        scheduled_at: new Date().toISOString(),
        caption: 'x',
        author_id: cm.id,
      })
      .select('id')
      .single();

  beforeAll(async () => {
    cm = await createTestUser('cm');
    clientA = await createTestClient('WF ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterEach(async () => {
    await setSkip(false);
  });

  afterAll(async () => {
    await setSkip(false);
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id]);
  }, 30_000);

  it('désactivé : un CM ne peut pas envoyer un brouillon au client', async () => {
    await setSkip(false);
    const { data: p } = await mkPost();
    const r = await cm.client.rpc('post_change_status', {
      p_post_id: p!.id,
      p_to: 'client_review',
    });
    expect(r.error).not.toBeNull();
  });

  it('activé : un CM envoie le brouillon directement en « à valider client »', async () => {
    await setSkip(true);
    const { data: p } = await mkPost();
    const r = await cm.client.rpc('post_change_status', {
      p_post_id: p!.id,
      p_to: 'client_review',
    });
    expect(r.error).toBeNull();
    expect((r.data as { status: string }).status).toBe('client_review');
  });

  it('activé : les autres transitions restent inchangées', async () => {
    await setSkip(true);
    const { data: p } = await mkPost();
    // draft → approved reste interdit
    const r = await cm.client.rpc('post_change_status', { p_post_id: p!.id, p_to: 'approved' });
    expect(r.error).not.toBeNull();
  });
});
