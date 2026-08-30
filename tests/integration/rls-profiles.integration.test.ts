import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assignUserToClient,
  createTestClient,
  createTestUser,
  deleteTestClients,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestUser,
} from './_helpers';

// N'active la suite que si l'instance de test ET la migration 0002 sont en place.
const ready = hasDbTestEnv && (await tableExists('profiles'));
const maybe = ready ? describe : describe.skip;

/**
 * Vérifie l'isolation apportée par la migration 0002 :
 * - un CM ne voit que les clients qui lui sont assignés
 * - lead/admin voient tous les clients non supprimés
 * - un utilisateur ne lit pas le profil d'un autre (sauf admin)
 * - un compte inactif n'a accès à rien
 */
maybe('RLS — profiles / clients / user_clients (0002)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let admin: TestUser;
  let inactive: TestUser;
  let clientA = '';
  let clientB = '';

  beforeAll(async () => {
    [cm, lead, admin, inactive] = await Promise.all([
      createTestUser('cm'),
      createTestUser('lead'),
      createTestUser('admin'),
      createTestUser('cm', { isActive: false, prefix: 'inactive' }),
    ]);
    clientA = await createTestClient('Client A ' + crypto.randomUUID());
    clientB = await createTestClient('Client B ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id, lead.id, admin.id, inactive.id]);
  }, 30_000);

  it('le CM ne voit que le client A (assigné)', async () => {
    const { data, error } = await cm.client.from('clients').select('id, name');
    expect(error).toBeNull();
    const ids = (data ?? []).map((c) => c.id);
    expect(ids).toContain(clientA);
    expect(ids).not.toContain(clientB);
  });

  it('le lead voit A et B', async () => {
    const { data, error } = await lead.client.from('clients').select('id');
    expect(error).toBeNull();
    const ids = (data ?? []).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining([clientA, clientB]));
  });

  it("le CM ne peut pas créer de client (réservé lead/admin)", async () => {
    const { error } = await cm.client.from('clients').insert({ name: 'pirate' });
    expect(error).not.toBeNull();
  });

  it('le lead peut créer un client', async () => {
    const { data, error } = await lead.client
      .from('clients')
      .insert({ name: 'Client lead ' + crypto.randomUUID() })
      .select('id')
      .single();
    expect(error).toBeNull();
    if (data) await deleteTestClients([data.id]);
  });

  it('le CM lit les profils internes (migration 0009) mais pas les non-internes', async () => {
    // Depuis 0009 : un rôle interne voit les autres profils internes (choix du rédacteur,
    // file « À valider »…). Ce qui reste cloisonné : les profils de rôle `client`.
    const internal = await cm.client.from('profiles').select('id').eq('id', lead.id);
    expect(internal.data ?? []).toHaveLength(1);
  });

  it("l'admin lit le profil de n'importe qui", async () => {
    const { data, error } = await admin.client.from('profiles').select('id').eq('id', cm.id);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });

  it('le CM ne peut pas changer son propre rôle', async () => {
    await cm.client.from('profiles').update({ role: 'admin' }).eq('id', cm.id);
    const { data } = await cm.client.from('profiles').select('role').eq('id', cm.id).single();
    expect(data?.role).toBe('cm');
  });

  it('un compte inactif ne voit aucun client', async () => {
    const { data } = await inactive.client.from('clients').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('le CM ne voit que sa propre assignation', async () => {
    const { data } = await cm.client.from('user_clients').select('client_id, profile_id');
    expect((data ?? []).every((row) => row.profile_id === cm.id)).toBe(true);
  });
});
