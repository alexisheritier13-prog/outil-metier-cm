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

const ready = hasDbTestEnv && (await tableExists('ideas'));
const maybe = ready ? describe : describe.skip;

/** Story 7.4 : traçabilité origine ↔ post ; l'origine supprimée n'efface pas le post. */
maybe('origine des posts (7.4)', () => {
  let cm: TestUser;
  let clientA = '';

  beforeAll(async () => {
    cm = await createTestUser('cm');
    clientA = await createTestClient('ORIG ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 40_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await admin().from('ideas').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id]);
  }, 30_000);

  it('un post transformé porte origin_type/origin_id ; supprimer l’idée garde le post', async () => {
    const { data: idea } = await cm.client
      .from('ideas')
      .insert({ title: 'Série témoignages', created_by: cm.id, client_id: clientA })
      .select('id')
      .single();

    const { data: post } = await cm.client.rpc('idea_to_post', {
      p_idea_id: idea!.id,
      p_client_id: clientA,
    });
    const postId = (post as { id: string }).id;
    expect((post as { origin_id: string }).origin_id).toBe(idea!.id);

    // posts générés par l'origine
    const linked = await cm.client
      .from('posts')
      .select('id')
      .eq('origin_type', 'idea')
      .eq('origin_id', idea!.id);
    expect((linked.data ?? []).map((p) => p.id)).toEqual([postId]);

    // suppression de l'idée
    await cm.client.from('ideas').delete().eq('id', idea!.id);

    const still = await cm.client.from('posts').select('origin_type, origin_id').eq('id', postId).single();
    expect(still.data!.origin_type).toBe('idea');
    expect(still.data!.origin_id).toBe(idea!.id); // pointeur conservé, cible disparue

    const gone = await admin().from('ideas').select('id').eq('id', idea!.id);
    expect(gone.data ?? []).toHaveLength(0);
  });
});
