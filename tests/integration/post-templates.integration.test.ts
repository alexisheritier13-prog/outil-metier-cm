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

const ready = hasDbTestEnv && (await tableExists('post_templates'));
const maybe = ready ? describe : describe.skip;

/** Story 7.2 : templates de posts — portée global / client. */
maybe('templates de posts (7.2)', () => {
  let cmA: TestUser;
  let cmB: TestUser;
  let clientA = '';
  let contactA: TestContact;

  beforeAll(async () => {
    [cmA, cmB] = await Promise.all([createTestUser('cm'), createTestUser('cm')]);
    clientA = await createTestClient('TPL ' + crypto.randomUUID());
    await assignUserToClient(cmA.id, clientA);
    const lead = await createTestUser('lead');
    contactA = await createTestContact(lead, clientA);
    await deleteTestUsers([lead.id]);
  }, 60_000);

  afterAll(async () => {
    await admin().from('post_templates').delete().eq('client_id', clientA);
    await admin().from('post_templates').delete().eq('created_by', cmA.id);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cmA.id, cmB.id, contactA.authUserId]);
  }, 30_000);

  it('template global visible de tous les internes ; template client suit l’accès', async () => {
    await cmA.client.from('post_templates').insert({
      name: 'Global citation',
      created_by: cmA.id,
      client_id: null,
      caption_template: 'Citation',
      default_tags: ['citation'],
    });
    await cmA.client.from('post_templates').insert({
      name: 'Client only',
      created_by: cmA.id,
      client_id: clientA,
      caption_template: 'x',
    });

    const seenByB = await cmB.client.from('post_templates').select('name');
    const names = (seenByB.data ?? []).map((t) => t.name);
    expect(names).toContain('Global citation');
    expect(names).not.toContain('Client only');

    const seenByContact = await contactA.client.from('post_templates').select('id');
    expect(seenByContact.data ?? []).toHaveLength(0);
  });

  it('suppression définitive', async () => {
    const { data } = await cmA.client
      .from('post_templates')
      .insert({ name: 'Jetable', created_by: cmA.id, caption_template: '' })
      .select('id')
      .single();
    const del = await cmA.client.from('post_templates').delete().eq('id', data!.id);
    expect(del.error).toBeNull();
    const { data: gone } = await admin()
      .from('post_templates')
      .select('id')
      .eq('id', data!.id);
    expect(gone ?? []).toHaveLength(0);
  });
});
