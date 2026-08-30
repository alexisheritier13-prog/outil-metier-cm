import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  assignUserToClient,
  createTestUser,
  deleteTestClients,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('clients'));
const maybe = ready ? describe : describe.skip;

/** Story 2.1 : CRUD client + archivage, sous RLS. */
maybe('clients — CRUD & archivage (RLS)', () => {
  let lead: TestUser;
  let cm: TestUser;
  const trash: string[] = [];

  beforeAll(async () => {
    [lead, cm] = await Promise.all([createTestUser('lead'), createTestUser('cm')]);
  }, 30_000);

  afterAll(async () => {
    await deleteTestClients(trash);
    await deleteTestUsers([lead.id, cm.id]);
  }, 30_000);

  it('un lead crée, renomme et archive un client', async () => {
    const created = await lead.client
      .from('clients')
      .insert({ name: 'Studio ' + crypto.randomUUID(), sector: 'design' })
      .select('*')
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id;
    trash.push(id);

    const renamed = await lead.client
      .from('clients')
      .update({ name: 'Studio Lumen' })
      .eq('id', id)
      .select('name')
      .single();
    expect(renamed.data?.name).toBe('Studio Lumen');

    const archived = await lead.client
      .from('clients')
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq('id', id);
    expect(archived.error).toBeNull();
  });

  it('un CM ne peut pas créer de client', async () => {
    const r = await cm.client.from('clients').insert({ name: 'pirate' });
    expect(r.error).not.toBeNull();
  });

  it('le filtre is_archived exclut/inclut correctement', async () => {
    const c = await admin()
      .from('clients')
      .insert({ name: 'Archivé ' + crypto.randomUUID(), is_archived: true })
      .select('id')
      .single();
    trash.push(c.data!.id);
    await assignUserToClient(cm.id, c.data!.id);

    const activeOnly = await cm.client
      .from('clients')
      .select('id')
      .eq('is_archived', false)
      .is('deleted_at', null);
    expect((activeOnly.data ?? []).map((x) => x.id)).not.toContain(c.data!.id);

    const withArchived = await cm.client.from('clients').select('id').is('deleted_at', null);
    expect((withArchived.data ?? []).map((x) => x.id)).toContain(c.data!.id);
  });

  it("un CM ne peut pas archiver un client (même assigné)", async () => {
    const c = await admin()
      .from('clients')
      .insert({ name: 'NoArchive ' + crypto.randomUUID() })
      .select('id')
      .single();
    trash.push(c.data!.id);
    await assignUserToClient(cm.id, c.data!.id);

    await cm.client.from('clients').update({ is_archived: true }).eq('id', c.data!.id);
    const { data } = await admin()
      .from('clients')
      .select('is_archived')
      .eq('id', c.data!.id)
      .single();
    expect(data?.is_archived).toBe(false);
  });
});
