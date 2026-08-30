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

const ready = hasDbTestEnv && (await tableExists('job_runs'));
const maybe = ready ? describe : describe.skip;

/** Story 3.7 : corbeille (FR45), restauration, purge 60 j. */
maybe('corbeille & purge (3.7)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let adminU: TestUser;
  let clientA = '';

  const mkPost = (over: Record<string, unknown> = {}) => ({
    client_id: clientA,
    network: 'instagram' as const,
    scheduled_at: new Date().toISOString(),
    caption: 'x',
    author_id: cm.id,
    ...over,
  });

  beforeAll(async () => {
    [cm, lead, adminU] = await Promise.all([
      createTestUser('cm'),
      createTestUser('lead'),
      createTestUser('admin'),
    ]);
    clientA = await createTestClient('TRASH ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id, lead.id, adminU.id]);
  }, 30_000);

  it('un CM met à la corbeille son brouillon, mais pas un post validé', async () => {
    const draft = (await cm.client.from('posts').insert(mkPost()).select('id').single()).data!;
    const ok = await cm.client.rpc('post_trash', { p_post_id: draft.id });
    expect(ok.error).toBeNull();

    const approved = (
      await cm.client.from('posts').insert(mkPost({ status: 'approved' })).select('id').single()
    ).data!;
    const ko = await cm.client.rpc('post_trash', { p_post_id: approved.id });
    expect(ko.error).not.toBeNull();

    // le lead peut, lui
    const ok2 = await lead.client.rpc('post_trash', { p_post_id: approved.id });
    expect(ok2.error).toBeNull();
  });

  it('un UPDATE direct de deleted_at est refusé', async () => {
    const p = (await cm.client.from('posts').insert(mkPost()).select('id').single()).data!;
    const r = await cm.client
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', p.id);
    expect(r.error).not.toBeNull();
  });

  it('restauration : Lead oui, CM non', async () => {
    const p = (await cm.client.from('posts').insert(mkPost()).select('id').single()).data!;
    await cm.client.rpc('post_trash', { p_post_id: p.id });

    const koCm = await cm.client.rpc('post_restore', { p_post_id: p.id });
    expect(koCm.error).not.toBeNull();

    const okLead = await lead.client.rpc('post_restore', { p_post_id: p.id });
    expect(okLead.error).toBeNull();
    const { data } = await admin().from('posts').select('deleted_at').eq('id', p.id).single();
    expect(data?.deleted_at).toBeNull();
  });

  it('purge immédiate : Admin seul', async () => {
    const p = (await cm.client.from('posts').insert(mkPost()).select('id').single()).data!;
    await cm.client.rpc('post_trash', { p_post_id: p.id });

    const koLead = await lead.client.rpc('trash_purge_now', { p_entity: 'post', p_id: p.id });
    expect(koLead.error).not.toBeNull();

    const okAdmin = await adminU.client.rpc('trash_purge_now', { p_entity: 'post', p_id: p.id });
    expect(okAdmin.error).toBeNull();
    const { data } = await admin().from('posts').select('id').eq('id', p.id);
    expect(data ?? []).toHaveLength(0);
  });

  it('purge_trash() supprime les éléments de plus de 60 jours, pas les récents', async () => {
    const old = (await cm.client.from('posts').insert(mkPost()).select('id').single()).data!;
    const recent = (await cm.client.from('posts').insert(mkPost()).select('id').single()).data!;
    await cm.client.rpc('post_trash', { p_post_id: old.id });
    await cm.client.rpc('post_trash', { p_post_id: recent.id });
    // vieillit `old` à -61 jours
    await admin()
      .from('posts')
      .update({ deleted_at: new Date(Date.now() - 61 * 86_400_000).toISOString() })
      .eq('id', old.id);

    const run = await admin().rpc('purge_trash');
    expect(run.error).toBeNull();

    const oldGone = await admin().from('posts').select('id').eq('id', old.id);
    const recentStays = await admin().from('posts').select('id').eq('id', recent.id);
    expect(oldGone.data ?? []).toHaveLength(0);
    expect(recentStays.data ?? []).toHaveLength(1);
  });
});
