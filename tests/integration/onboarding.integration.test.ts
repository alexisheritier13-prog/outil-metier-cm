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

const ready = hasDbTestEnv && (await tableExists('onboarding_items'));
const maybe = ready ? describe : describe.skip;

/** Story 2.5 : checklist d'onboarding — auto-seed, CRUD, avancement, RLS. */
maybe('onboarding_items', () => {
  let cm: TestUser;
  let cmOther: TestUser;
  let clientA = '';

  beforeAll(async () => {
    [cm, cmOther] = await Promise.all([createTestUser('cm'), createTestUser('cm')]);
    clientA = await createTestClient('OB ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id, cmOther.id]);
  }, 30_000);

  it('la création du client a généré la checklist depuis le modèle', async () => {
    const { data, error } = await admin()
      .from('onboarding_items')
      .select('label, position')
      .eq('client_id', clientA)
      .order('position');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(5);
    expect(data?.[0]?.position).toBe(0);
  });

  it('un CM assigné coche une étape (done_by renseigné)', async () => {
    const { data: first } = await cm.client
      .from('onboarding_items')
      .select('id')
      .eq('client_id', clientA)
      .order('position')
      .limit(1)
      .single();

    const upd = await cm.client
      .from('onboarding_items')
      .update({ is_done: true, done_at: new Date().toISOString(), done_by: cm.id })
      .eq('id', first!.id);
    expect(upd.error).toBeNull();

    const { data } = await cm.client
      .from('onboarding_items')
      .select('is_done, done_by')
      .eq('id', first!.id)
      .single();
    expect(data).toMatchObject({ is_done: true, done_by: cm.id });
  });

  it('un CM assigné ajoute et supprime une étape', async () => {
    const ins = await cm.client
      .from('onboarding_items')
      .insert({ client_id: clientA, label: 'Étape sur mesure', position: 99 })
      .select('id')
      .single();
    expect(ins.error).toBeNull();
    const del = await cm.client.from('onboarding_items').delete().eq('id', ins.data!.id);
    expect(del.error).toBeNull();
  });

  it('la vue d\'avancement respecte la RLS', async () => {
    const { data } = await cm.client
      .from('client_onboarding_progress')
      .select('client_id, done, total')
      .eq('client_id', clientA)
      .maybeSingle();
    expect(data?.total).toBeGreaterThanOrEqual(5);
    expect(data?.done).toBeGreaterThanOrEqual(1);

    const other = await cmOther.client
      .from('client_onboarding_progress')
      .select('client_id')
      .eq('client_id', clientA);
    expect(other.data ?? []).toHaveLength(0);
  });

  it('un CM non assigné ne voit ni ne modifie la checklist', async () => {
    const seen = await cmOther.client
      .from('onboarding_items')
      .select('id')
      .eq('client_id', clientA);
    expect(seen.data ?? []).toHaveLength(0);

    const write = await cmOther.client
      .from('onboarding_items')
      .insert({ client_id: clientA, label: 'hack', position: 0 });
    expect(write.error).not.toBeNull();
  });
});
