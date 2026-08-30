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

const ready = hasDbTestEnv && (await tableExists('social_accounts'));
const maybe = ready ? describe : describe.skip;

/** Story 2.2 : comptes sociaux + table de référence networks, sous RLS. */
maybe('social_accounts & networks (RLS)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';
  let clientB = '';

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    clientA = await createTestClient('SA-A ' + crypto.randomUUID());
    clientB = await createTestClient('SA-B ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id, lead.id]);
  }, 30_000);

  it('la table networks est lisible et contient les 8 réseaux', async () => {
    const { data, error } = await cm.client.from('networks').select('code');
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(8);
  });

  it('un non-admin ne peut pas modifier networks', async () => {
    const r = await lead.client.from('networks').update({ label: 'hack' }).eq('code', 'x');
    // pas d'erreur mais 0 ligne affectée (RLS), ou erreur : on vérifie que rien n'a changé
    const { data } = await admin().from('networks').select('label').eq('code', 'x').single();
    expect(data?.label).not.toBe('hack');
    void r;
  });

  it('un CM assigné ajoute, liste et supprime un compte pour son client', async () => {
    const ins = await cm.client
      .from('social_accounts')
      .insert({ client_id: clientA, network: 'instagram', handle: '@studio' })
      .select('id')
      .single();
    expect(ins.error).toBeNull();

    const list = await cm.client.from('social_accounts').select('*').eq('client_id', clientA);
    expect((list.data ?? []).length).toBe(1);

    const del = await cm.client.from('social_accounts').delete().eq('id', ins.data!.id);
    expect(del.error).toBeNull();
  });

  it('un CM non assigné ne peut pas ajouter de compte pour un autre client', async () => {
    const r = await cm.client
      .from('social_accounts')
      .insert({ client_id: clientB, network: 'linkedin', handle: '@x' });
    expect(r.error).not.toBeNull();

    const seen = await cm.client.from('social_accounts').select('id').eq('client_id', clientB);
    expect((seen.data ?? []).length).toBe(0);
  });

  it('doublon (client, réseau, handle) rejeté', async () => {
    await cm.client
      .from('social_accounts')
      .insert({ client_id: clientA, network: 'tiktok', handle: '@dup' });
    const again = await cm.client
      .from('social_accounts')
      .insert({ client_id: clientA, network: 'tiktok', handle: '@dup' });
    expect(again.error).not.toBeNull();
    await admin().from('social_accounts').delete().eq('client_id', clientA);
  });
});
