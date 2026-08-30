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

const ready = hasDbTestEnv && (await tableExists('posts'));
const maybe = ready ? describe : describe.skip;

/** Story 3.1 : modèle de post + CRUD sous RLS. */
maybe('posts — CRUD & RLS (3.1)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';
  let clientB = '';
  const trashClients: string[] = [];

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    clientA = await createTestClient('POST-A ' + crypto.randomUUID());
    clientB = await createTestClient('POST-B ' + crypto.randomUUID());
    trashClients.push(clientA, clientB);
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', trashClients);
    await deleteTestClients(trashClients);
    await deleteTestUsers([cm.id, lead.id]);
  }, 30_000);

  const draft = (clientId: string, authorId: string) => ({
    client_id: clientId,
    network: 'instagram' as const,
    scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
    caption: 'Lancement de la collection printemps',
    author_id: authorId,
  });

  it('un CM assigné crée un post pour son client (statut draft par défaut)', async () => {
    const { data, error } = await cm.client
      .from('posts')
      .insert(draft(clientA, cm.id))
      .select('id, status')
      .single();
    expect(error).toBeNull();
    expect(data?.status).toBe('draft');
  });

  it('un CM non assigné ne peut pas créer pour un autre client', async () => {
    const { error } = await cm.client.from('posts').insert(draft(clientB, cm.id));
    expect(error).not.toBeNull();
  });

  it('un lead crée pour n\'importe quel client actif', async () => {
    const { error } = await lead.client.from('posts').insert(draft(clientB, lead.id));
    expect(error).toBeNull();
  });

  it('la mise en corbeille (soft delete) exclut le post de la liste', async () => {
    const { data: p } = await cm.client
      .from('posts')
      .insert(draft(clientA, cm.id))
      .select('id')
      .single();

    await cm.client.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', p!.id);

    const visible = await cm.client.from('posts').select('id').is('deleted_at', null);
    expect((visible.data ?? []).map((r) => r.id)).not.toContain(p!.id);
  });

  it('la recherche plein texte (search_tsv) fonctionne', async () => {
    await cm.client
      .from('posts')
      .insert({ ...draft(clientA, cm.id), caption: 'Offre spéciale sur les bougies parfumées' });

    const { data, error } = await cm.client
      .from('posts')
      .select('caption')
      .is('deleted_at', null)
      .textSearch('search_tsv', 'bougies', { type: 'websearch', config: 'french' });
    expect(error).toBeNull();
    expect((data ?? []).some((r) => r.caption.includes('bougies'))).toBe(true);
  });

  it('le changement de statut renseigne status_changed_at', async () => {
    const { data: p } = await cm.client
      .from('posts')
      .insert(draft(clientA, cm.id))
      .select('id, status_changed_at')
      .single();
    const before = p!.status_changed_at;
    await new Promise((r) => setTimeout(r, 20));
    await cm.client.from('posts').update({ status: 'internal_review' }).eq('id', p!.id);
    const { data: after } = await cm.client
      .from('posts')
      .select('status_changed_at')
      .eq('id', p!.id)
      .single();
    expect(after!.status_changed_at).not.toBe(before);
  });
});
