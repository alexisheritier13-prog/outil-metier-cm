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

const ready = hasDbTestEnv && (await tableExists('alerts'));
const maybe = ready ? describe : describe.skip;

/** Story 8.3 : les seuils pilotent le résultat de generate_alerts. */
maybe('seuils des alertes (8.3)', () => {
  let cm: TestUser;
  let adminU: TestUser;
  let client = '';
  let postId = '';
  let savedThresholds: unknown;

  beforeAll(async () => {
    [cm, adminU] = await Promise.all([createTestUser('cm'), createTestUser('admin')]);
    client = await createTestClient('AS ' + crypto.randomUUID());
    await assignUserToClient(cm.id, client);

    const p = await admin()
      .from('posts')
      .insert({
        client_id: client,
        network: 'instagram',
        scheduled_at: new Date(Date.now() + 30 * 864e5).toISOString(),
        caption: 'En review depuis 2 jours',
        author_id: cm.id,
        status: 'internal_review',
        status_changed_at: new Date(Date.now() - 2 * 864e5).toISOString(),
        performance_visible_to_client: false,
      })
      .select('id')
      .single();
    postId = p.data.id;

    savedThresholds = (
      await admin().from('app_settings').select('value').eq('key', 'alert_thresholds').maybeSingle()
    ).data?.value;
  }, 60_000);

  afterAll(async () => {
    if (savedThresholds) {
      await admin()
        .from('app_settings')
        .upsert({ key: 'alert_thresholds', value: savedThresholds }, { onConflict: 'key' });
    }
    await admin().from('alerts').delete().eq('client_id', client);
    await admin().from('posts').delete().eq('client_id', client);
    await deleteTestClients([client]);
    await deleteTestUsers([cm.id, adminU.id]);
  }, 30_000);

  it('un post en review depuis 2 j : pas d’alerte à seuil 3, alerte à seuil 1', async () => {
    // seuil par défaut (3) → pas d'alerte
    await admin().from('app_settings').update({ value: { validation_overdue_days: 3 } }).eq('key', 'alert_thresholds');
    await admin().rpc('generate_alerts');
    let a = await admin().from('alerts').select('id').eq('post_id', postId).eq('type', 'validation_overdue');
    expect(a.data ?? []).toHaveLength(0);

    // l'admin abaisse le seuil à 1
    const upd = await adminU.client
      .from('app_settings')
      .update({ value: { validation_overdue_days: 1 } })
      .eq('key', 'alert_thresholds');
    expect(upd.error).toBeNull();

    await admin().rpc('generate_alerts');
    a = await admin().from('alerts').select('id, status').eq('post_id', postId).eq('type', 'validation_overdue');
    expect((a.data ?? []).length).toBe(1);
  });

  it('un CM ne peut pas modifier les seuils', async () => {
    const r = await cm.client
      .from('app_settings')
      .update({ value: { validation_overdue_days: 9 } })
      .eq('key', 'alert_thresholds');
    // policy admin-only → 0 ligne modifiée, pas d'erreur
    const { data } = await admin()
      .from('app_settings')
      .select('value')
      .eq('key', 'alert_thresholds')
      .single();
    expect((data.value as { validation_overdue_days: number }).validation_overdue_days).toBe(1);
    expect(r.error).toBeNull();
  });
});
