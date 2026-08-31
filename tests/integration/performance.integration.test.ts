import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
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

const ready = hasDbTestEnv && (await tableExists('post_history'));
const maybe = ready ? describe : describe.skip;

/** Story 9.4 : note de performance — édition, journalisation, visibilité client. */
maybe('note de performance (9.4)', () => {
  let lead: TestUser;
  let cmOutsider: TestUser;
  let clientA = '';
  let contactA: TestContact;
  let postId = '';

  beforeAll(async () => {
    [lead, cmOutsider] = await Promise.all([createTestUser('lead'), createTestUser('cm')]);
    clientA = await createTestClient('PERF ' + crypto.randomUUID());
    contactA = await createTestContact(lead, clientA);
    // cmOutsider n'est volontairement PAS assigné à clientA.

    const { data } = await admin()
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram',
        scheduled_at: '2026-01-10T09:00:00Z',
        caption: 'Publié',
        author_id: lead.id,
        status: 'published',
      })
      .select('id')
      .single();
    postId = data!.id;
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([lead.id, cmOutsider.id, contactA.authUserId]);
  }, 30_000);

  it('le Lead édite la note + la visibilité, les deux sont journalisées (migr 0029)', async () => {
    const upd = await lead.client
      .from('posts')
      .update({ performance_note: '820 likes', performance_visible_to_client: true })
      .eq('id', postId);
    expect(upd.error).toBeNull();

    const { data: hist } = await admin()
      .from('post_history')
      .select('field')
      .eq('post_id', postId)
      .eq('action', 'update');
    const fields = (hist ?? []).map((h) => h.field);
    expect(fields).toContain('performance_note');
    expect(fields).toContain('performance_visible_to_client');
  });

  it('un CM sans accès au client ne peut pas modifier la note', async () => {
    const upd = await cmOutsider.client
      .from('posts')
      .update({ performance_note: 'pirate' })
      .eq('id', postId);
    // RLS : 0 ligne affectée (pas d'erreur levée par PostgREST)
    const { data } = await admin()
      .from('posts')
      .select('performance_note')
      .eq('id', postId)
      .single();
    expect(data?.performance_note).toBe('820 likes');
    expect(upd.error).toBeNull();
  });

  it('la note visible reste lisible par le contact (le masquage éventuel est applicatif)', async () => {
    const { data } = await contactA.client
      .from('posts')
      .select('performance_note, performance_visible_to_client')
      .eq('id', postId)
      .single();
    expect(data?.performance_visible_to_client).toBe(true);
    expect(data?.performance_note).toBe('820 likes');
  });

  it('quand la note repasse à visible=false, le contact la voit encore en base mais l’app la masque', async () => {
    await lead.client
      .from('posts')
      .update({ performance_visible_to_client: false })
      .eq('id', postId);
    const { data } = await contactA.client
      .from('posts')
      .select('performance_visible_to_client')
      .eq('id', postId)
      .single();
    expect(data?.performance_visible_to_client).toBe(false);
    // `redactClientPost` (testé en unitaire) renvoie alors performance_note = null.
  });
});
