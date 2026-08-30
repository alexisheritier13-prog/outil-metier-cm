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

const ready = hasDbTestEnv && (await tableExists('client_overview'));
const maybe = ready ? describe : describe.skip;

/** Story 2.6 : vue client_overview — indicateurs + respect de la RLS. */
maybe('client_overview (vue, Story 2.6)', () => {
  let cm: TestUser;
  let clientA = '';
  let clientB = '';

  beforeAll(async () => {
    cm = await createTestUser('cm');
    clientA = await createTestClient('OV-A ' + crypto.randomUUID());
    clientB = await createTestClient('OV-B ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
    // coche une étape d'onboarding de A
    const { data } = await admin()
      .from('onboarding_items')
      .select('id')
      .eq('client_id', clientA)
      .order('position')
      .limit(1)
      .single();
    await admin().from('onboarding_items').update({ is_done: true }).eq('id', data!.id);
  }, 30_000);

  afterAll(async () => {
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id]);
  }, 30_000);

  it("le CM ne voit dans la vue que ses clients, avec l'avancement d'onboarding", async () => {
    const { data, error } = await cm.client.from('client_overview').select('*');
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(clientA);
    expect(ids).not.toContain(clientB);

    const a = (data ?? []).find((r) => r.id === clientA)!;
    expect(a.onboarding_total).toBeGreaterThanOrEqual(5);
    expect(a.onboarding_done).toBe(1);
    expect(a.pending_internal).toBe(0); // placeholder jusqu'à l'Epic 3
  });
});
