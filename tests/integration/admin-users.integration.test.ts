import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestUser,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('profiles'));
const maybe = ready ? describe : describe.skip;

/** Story 1.5 : Edge Function admin-users + droits de gestion des comptes internes. */
maybe('admin-users (Edge Function) + RLS gestion des comptes', () => {
  let admin: TestUser;
  let cm: TestUser;
  const createdIds: string[] = [];

  beforeAll(async () => {
    [admin, cm] = await Promise.all([createTestUser('admin'), createTestUser('cm')]);
  }, 30_000);

  afterAll(async () => {
    await deleteTestUsers([admin.id, cm.id, ...createdIds]);
  }, 30_000);

  it("l'admin crée un utilisateur interne via la fonction", async () => {
    const { data, error } = await admin.client.functions.invoke('admin-users', {
      body: {
        action: 'create',
        email: `test+created-${crypto.randomUUID()}@example.test`,
        fullName: 'Nouvelle Recrue',
        role: 'lead',
        activate: true,
      },
    });
    expect(error).toBeNull();
    const profile = (data as { profile: { id: string; role: string; is_active: boolean } }).profile;
    createdIds.push(profile.id);
    expect(profile.role).toBe('lead');
    expect(profile.is_active).toBe(true);
  });

  it('un CM ne peut pas appeler la fonction (403)', async () => {
    const { error } = await cm.client.functions.invoke('admin-users', {
      body: { action: 'create', email: 'x@example.test', fullName: 'X', role: 'cm', activate: true },
    });
    expect(error).not.toBeNull();
  });

  it("l'admin change le rôle et désactive un utilisateur (update direct, RLS)", async () => {
    const target = await createTestUser('cm');
    createdIds.push(target.id);

    const r1 = await admin.client.from('profiles').update({ role: 'lead' }).eq('id', target.id);
    expect(r1.error).toBeNull();
    const r2 = await admin.client.from('profiles').update({ is_active: false }).eq('id', target.id);
    expect(r2.error).toBeNull();

    const { data } = await admin.client
      .from('profiles')
      .select('role, is_active')
      .eq('id', target.id)
      .single();
    expect(data).toMatchObject({ role: 'lead', is_active: false });
  });

  it('un CM ne peut pas modifier le profil de quelqu\'un d\'autre', async () => {
    await cm.client.from('profiles').update({ role: 'admin' }).eq('id', admin.id);
    const { data } = await admin.client
      .from('profiles')
      .select('role')
      .eq('id', admin.id)
      .single();
    expect(data?.role).toBe('admin'); // inchangé
  });

  it("l'admin gère les assignations client ; pas le CM", async () => {
    const { data: client } = await admin.client
      .from('clients')
      .insert({ name: 'Client assign ' + crypto.randomUUID() })
      .select('id')
      .single();
    const clientId = client!.id;

    const ok = await admin.client
      .from('user_clients')
      .insert({ profile_id: cm.id, client_id: clientId });
    expect(ok.error).toBeNull();

    const ko = await cm.client
      .from('user_clients')
      .insert({ profile_id: cm.id, client_id: clientId });
    expect(ko.error).not.toBeNull();

    await admin.client.from('clients').delete().eq('id', clientId);
  });
});
