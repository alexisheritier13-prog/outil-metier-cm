import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  assignUserToClient,
  createTestClient,
  createTestContact,
  createTestUser,
  deleteTestClients,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestContact,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('ideas'));
const maybe = ready ? describe : describe.skip;

/** Story 7.1 : banque d'idées — visibilité + transformation en post. */
maybe('banque d’idées (7.1)', () => {
  let cmA: TestUser;
  let cmB: TestUser;
  let clientA = '';
  let contactA: TestContact;

  beforeAll(async () => {
    [cmA, cmB] = await Promise.all([createTestUser('cm'), createTestUser('cm')]);
    clientA = await createTestClient('IDEA ' + crypto.randomUUID());
    await assignUserToClient(cmA.id, clientA);
    const lead = await createTestUser('lead');
    contactA = await createTestContact(lead, clientA);
    await deleteTestUsers([lead.id]);
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await admin().from('ideas').delete().eq('client_id', clientA);
    await admin().from('ideas').delete().is('client_id', null).eq('created_by', cmA.id);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cmA.id, cmB.id, contactA.authUserId]);
  }, 30_000);

  it('une idée sans client est visible de tout interne ; une idée client suit l’accès', async () => {
    const shared = await cmA.client
      .from('ideas')
      .insert({ title: 'Idée transverse', created_by: cmA.id, client_id: null })
      .select('id')
      .single();
    expect(shared.error).toBeNull();

    const clientIdea = await cmA.client
      .from('ideas')
      .insert({ title: 'Idée client', created_by: cmA.id, client_id: clientA })
      .select('id')
      .single();
    expect(clientIdea.error).toBeNull();

    // cmB (non assigné à clientA) voit la transverse, pas celle du client
    const seenByB = await cmB.client.from('ideas').select('title');
    const titles = (seenByB.data ?? []).map((i) => i.title);
    expect(titles).toContain('Idée transverse');
    expect(titles).not.toContain('Idée client');

    // le contact client ne voit aucune idée
    const seenByContact = await contactA.client.from('ideas').select('id');
    expect(seenByContact.data ?? []).toHaveLength(0);
  });

  it('idea_to_post : crée un post brouillon lié ; exige un client si l’idée n’en a pas', async () => {
    const { data: idea } = await cmA.client
      .from('ideas')
      .insert({ title: 'Carrousel conseils', description: '5 astuces', created_by: cmA.id })
      .select('id')
      .single();

    const noClient = await cmA.client.rpc('idea_to_post', { p_idea_id: idea!.id });
    expect(noClient.error).not.toBeNull();

    const ok = await cmA.client.rpc('idea_to_post', {
      p_idea_id: idea!.id,
      p_client_id: clientA,
      p_network: 'linkedin',
    });
    expect(ok.error).toBeNull();
    const post = ok.data as { origin_type: string; origin_id: string; status: string; network: string };
    expect(post.origin_type).toBe('idea');
    expect(post.origin_id).toBe(idea!.id);
    expect(post.status).toBe('draft');
    expect(post.network).toBe('linkedin');
  });

  it('un contact client ne peut pas appeler idea_to_post', async () => {
    const { data: idea } = await cmA.client
      .from('ideas')
      .insert({ title: 'x', created_by: cmA.id, client_id: clientA })
      .select('id')
      .single();
    const r = await contactA.client.rpc('idea_to_post', {
      p_idea_id: idea!.id,
      p_client_id: clientA,
    });
    expect(r.error).not.toBeNull();
  });
});
