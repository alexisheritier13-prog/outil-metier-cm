import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  createTestUser,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('feedback'));
const maybe = ready ? describe : describe.skip;

/** 0046 : retours des testeurs. */
maybe('feedback (0046)', () => {
  let author: TestUser;
  let platformAdmin: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    [author, platformAdmin, other] = await Promise.all([
      createTestUser('cm'),
      createTestUser('admin'),
      createTestUser('lead'),
    ]);
    await admin().from('platform_admins').insert({ user_id: platformAdmin.id });
  }, 40_000);

  afterAll(async () => {
    await admin().from('feedback').delete().eq('author_id', author.id);
    await admin().from('platform_admins').delete().eq('user_id', platformAdmin.id);
    await deleteTestUsers([author.id, platformAdmin.id, other.id]);
  }, 30_000);

  it('submit_feedback : message vide refusé, sinon enregistré avec org + e-mail', async () => {
    const empty = await author.client.rpc('submit_feedback', { p_kind: 'bug', p_message: '   ' });
    expect(empty.error).not.toBeNull();

    const ok = await author.client.rpc('submit_feedback', {
      p_kind: 'idea',
      p_message: 'On pourrait ajouter X',
      p_path: '/app/planning',
    });
    expect(ok.error).toBeNull();
    const row = ok.data as { organization_id: string; author_email: string; kind: string };
    expect(row.organization_id).toBe(author.organizationId);
    expect(row.author_email).toContain('@');
    expect(row.kind).toBe('idea');
  });

  it('lecture : l’auteur voit les siens, un tiers ne voit rien, le platform admin voit tout', async () => {
    const mine = await author.client.from('feedback').select('id');
    expect((mine.data ?? []).length).toBeGreaterThan(0);

    const none = await other.client.from('feedback').select('id');
    expect(none.data ?? []).toHaveLength(0);

    const all = await platformAdmin.client.rpc('platform_list_feedback');
    expect(all.error).toBeNull();
    expect(Array.isArray(all.data)).toBe(true);
    expect((all.data as unknown[]).length).toBeGreaterThan(0);
  });

  it('set_feedback_status : réservé au platform admin', async () => {
    const { data: fb } = await author.client
      .from('feedback')
      .select('id')
      .limit(1)
      .single();

    const denied = await other.client.rpc('set_feedback_status', {
      p_id: fb!.id,
      p_status: 'done',
    });
    expect(denied.error).not.toBeNull();

    const okd = await platformAdmin.client.rpc('set_feedback_status', {
      p_id: fb!.id,
      p_status: 'seen',
    });
    expect(okd.error).toBeNull();
    const { data: after } = await admin()
      .from('feedback')
      .select('status')
      .eq('id', fb!.id)
      .single();
    expect(after?.status).toBe('seen');
  });
});
