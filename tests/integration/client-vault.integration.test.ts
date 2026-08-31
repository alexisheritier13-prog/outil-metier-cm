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

const ready = hasDbTestEnv && (await tableExists('client_credentials'));
const maybe = ready ? describe : describe.skip;

/** 0035 : contrat + codes de connexion — accès strictement interne au client. */
maybe('fiche client : contrat & accès (0035)', () => {
  let lead: TestUser;
  let outsider: TestUser;
  let clientA = '';

  beforeAll(async () => {
    [lead, outsider] = await Promise.all([createTestUser('lead'), createTestUser('cm')]);
    clientA = await createTestClient('Vault ' + crypto.randomUUID());
    await assignUserToClient(lead.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await admin().from('client_credentials').delete().eq('client_id', clientA);
    await admin().from('client_contracts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([lead.id, outsider.id]);
  }, 30_000);

  it('un rôle interne avec accès gère le contrat', async () => {
    const up = await lead.client
      .from('client_contracts')
      .upsert({ client_id: clientA, scope: '12 posts / mois' }, { onConflict: 'client_id' });
    expect(up.error).toBeNull();
    const { data } = await lead.client
      .from('client_contracts')
      .select('scope')
      .eq('client_id', clientA)
      .single();
    expect(data?.scope).toBe('12 posts / mois');
  });

  it('un rôle interne avec accès gère les codes de connexion', async () => {
    const ins = await lead.client
      .from('client_credentials')
      .insert({ client_id: clientA, label: 'Instagram', login: 'a@b.c', secret: 'hunter2' })
      .select('id')
      .single();
    expect(ins.error).toBeNull();
    const { data } = await lead.client
      .from('client_credentials')
      .select('secret')
      .eq('id', ins.data!.id)
      .single();
    expect(data?.secret).toBe('hunter2');
  });

  it('un utilisateur sans accès au client ne voit rien et ne peut rien écrire', async () => {
    const read = await outsider.client.from('client_credentials').select('*').eq('client_id', clientA);
    expect(read.data ?? []).toHaveLength(0);

    const write = await outsider.client
      .from('client_credentials')
      .insert({ client_id: clientA, label: 'X', secret: 'y' });
    expect(write.error).not.toBeNull();

    const contract = await outsider.client
      .from('client_contracts')
      .upsert({ client_id: clientA, scope: 'pirate' }, { onConflict: 'client_id' });
    expect(contract.error).not.toBeNull();
  });
});
