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

const ready = hasDbTestEnv && (await tableExists('editorial_guidelines'));
const maybe = ready ? describe : describe.skip;

/** Story 2.4 : charte éditoriale, sous RLS (accès interne au client). */
maybe('editorial_guidelines (RLS)', () => {
  let cm: TestUser;
  let cmOther: TestUser;
  let clientA = '';

  beforeAll(async () => {
    [cm, cmOther] = await Promise.all([createTestUser('cm'), createTestUser('cm')]);
    clientA = await createTestClient('EG ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await admin().from('editorial_guidelines').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id, cmOther.id]);
  }, 30_000);

  it('un CM assigné écrit puis relit la charte (upsert)', async () => {
    const up = await cm.client
      .from('editorial_guidelines')
      .upsert({ client_id: clientA, tone: 'Chaleureux, direct.' }, { onConflict: 'client_id' })
      .select('tone')
      .single();
    expect(up.error).toBeNull();
    expect(up.data?.tone).toBe('Chaleureux, direct.');

    const up2 = await cm.client
      .from('editorial_guidelines')
      .upsert(
        { client_id: clientA, tone: 'Chaleureux.', words_to_avoid: 'promo, cheap' },
        { onConflict: 'client_id' },
      )
      .select('words_to_avoid')
      .single();
    expect(up2.data?.words_to_avoid).toBe('promo, cheap');

    const read = await cm.client
      .from('editorial_guidelines')
      .select('tone, words_to_avoid')
      .eq('client_id', clientA)
      .single();
    expect(read.data).toMatchObject({ tone: 'Chaleureux.', words_to_avoid: 'promo, cheap' });
  });

  it('un CM non assigné ne voit ni ne modifie la charte', async () => {
    const read = await cmOther.client
      .from('editorial_guidelines')
      .select('tone')
      .eq('client_id', clientA);
    expect(read.data ?? []).toHaveLength(0);

    const write = await cmOther.client
      .from('editorial_guidelines')
      .upsert({ client_id: clientA, tone: 'hack' }, { onConflict: 'client_id' });
    expect(write.error).not.toBeNull();

    const { data } = await admin()
      .from('editorial_guidelines')
      .select('tone')
      .eq('client_id', clientA)
      .single();
    expect(data?.tone).not.toBe('hack');
  });
});
