import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  createTestUser,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('job_runs'));
const maybe = ready ? describe : describe.skip;

/** Story 8.4 : jobs planifiés — droits + notification d'échec. */
maybe('tâches planifiées (8.4)', () => {
  let adminU: TestUser;
  let cm: TestUser;

  beforeAll(async () => {
    [adminU, cm] = await Promise.all([createTestUser('admin'), createTestUser('cm')]);
  }, 40_000);

  afterAll(async () => {
    await admin().from('job_runs').delete().eq('job_name', 'test_fail');
    await admin().from('notifications').delete().eq('type', 'job_failed');
    await deleteTestUsers([adminU.id, cm.id]);
  }, 30_000);

  it('un CM ne peut pas déclencher la purge ; l’Admin oui', async () => {
    const ko = await cm.client.rpc('trigger_purge_trash');
    expect(ko.error).not.toBeNull();

    const ok = await adminU.client.rpc('trigger_purge_trash');
    expect(ok.error).toBeNull();
    expect(ok.data.job_name).toBe('purge_trash');
  });

  it('un job en échec notifie les Admins', async () => {
    const { data: run } = await admin()
      .from('job_runs')
      .insert({ job_name: 'test_fail' })
      .select('id')
      .single();
    await admin()
      .from('job_runs')
      .update({ finished_at: new Date().toISOString(), ok: false, error: 'boom' })
      .eq('id', run.id);

    const { data } = await admin()
      .from('notifications')
      .select('user_id, body')
      .eq('type', 'job_failed');
    expect((data ?? []).some((n) => n.user_id === adminU.id && /test_fail/.test(n.body))).toBe(true);
  });

  it('la détection est traçée dans job_runs', async () => {
    await adminU.client.rpc('trigger_generate_alerts');
    const { data } = await adminU.client
      .from('job_runs')
      .select('job_name, ok')
      .eq('job_name', 'generate_alerts')
      .order('started_at', { ascending: false })
      .limit(1);
    expect(data?.[0]?.ok).toBe(true);
  });
});
