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

const ready = hasDbTestEnv && (await tableExists('post_media'));
const maybe = ready ? describe : describe.skip;

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Médias des posts : RLS de découverte + écriture bucket + réordre + purge. */
maybe('post_media (upload visuel)', () => {
  let lead: TestUser;
  let cm: TestUser;
  let outsider: TestUser;
  let contactA: TestContact;
  let clientA = '';
  let clientB = '';
  let draftId = '';
  let pubId = '';

  beforeAll(async () => {
    [lead, cm, outsider] = await Promise.all([
      createTestUser('lead'),
      createTestUser('cm'),
      createTestUser('cm'),
    ]);
    clientA = await createTestClient('MEDIA-A ' + crypto.randomUUID());
    clientB = await createTestClient('MEDIA-B ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
    contactA = await createTestContact(lead, clientA);

    const mk = (status: string) =>
      admin()
        .from('posts')
        .insert({
          client_id: clientA,
          network: 'instagram' as const,
          scheduled_at: new Date().toISOString(),
          caption: 'x',
          author_id: cm.id,
          status,
        })
        .select('id')
        .single();
    draftId = (await mk('draft')).data!.id;
    pubId = (await mk('published')).data!.id;
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([lead.id, cm.id, outsider.id, contactA.authUserId]);
  }, 30_000);

  it('le CM assigné upload un visuel et crée la ligne post_media', async () => {
    const path = `${clientA}/${pubId}/${crypto.randomUUID()}.png`;
    const up = await cm.client.storage
      .from('post-media')
      .upload(path, tinyPng, { contentType: 'image/png' });
    expect(up.error).toBeNull();

    const row = await cm.client
      .from('post_media')
      .insert({ post_id: pubId, storage_path: path, kind: 'image', mime_type: 'image/png' })
      .select('id')
      .single();
    expect(row.error).toBeNull();
  });

  it('un CM sans accès ne peut pas uploader dans le dossier d’un autre client', async () => {
    const path = `${clientB}/${pubId}/${crypto.randomUUID()}.png`;
    const up = await cm.client.storage
      .from('post-media')
      .upload(path, tinyPng, { contentType: 'image/png' });
    expect(up.error).not.toBeNull();
  });

  it('le contact voit les visuels d’un post publié, pas ceux d’un brouillon', async () => {
    // visuel sur le brouillon (via service_role pour contourner l'écriture)
    await admin()
      .from('post_media')
      .insert({
        post_id: draftId,
        storage_path: `${clientA}/${draftId}/${crypto.randomUUID()}.png`,
        kind: 'image',
      });

    const pub = await contactA.client.from('post_media').select('id').eq('post_id', pubId);
    const draft = await contactA.client.from('post_media').select('id').eq('post_id', draftId);
    expect((pub.data ?? []).length).toBeGreaterThan(0);
    expect(draft.data ?? []).toHaveLength(0);
  });

  it('post_media_reorder : le CM assigné oui, un tiers non', async () => {
    const { data } = await admin()
      .from('post_media')
      .select('id')
      .eq('post_id', pubId)
      .order('created_at');
    const ids = (data ?? []).map((r) => r.id);
    if (ids.length < 2) {
      await admin()
        .from('post_media')
        .insert({
          post_id: pubId,
          storage_path: `${clientA}/${pubId}/${crypto.randomUUID()}.png`,
          kind: 'image',
        });
    }
    const fresh = (
      await admin().from('post_media').select('id').eq('post_id', pubId).order('created_at')
    ).data!.map((r) => r.id);

    const ko = await outsider.client.rpc('post_media_reorder', {
      p_post_id: pubId,
      p_ids: fresh.slice().reverse(),
    });
    expect(ko.error).not.toBeNull();

    const ok = await cm.client.rpc('post_media_reorder', {
      p_post_id: pubId,
      p_ids: fresh.slice().reverse(),
    });
    expect(ok.error).toBeNull();
  });

  it('le CM peut retirer un visuel : objet + ligne', async () => {
    const path = `${clientA}/${pubId}/${crypto.randomUUID()}.png`;
    await cm.client.storage.from('post-media').upload(path, tinyPng, { contentType: 'image/png' });
    const row = (
      await cm.client
        .from('post_media')
        .insert({ post_id: pubId, storage_path: path, kind: 'image' })
        .select('id')
        .single()
    ).data!;

    // deletePostMedia() : Storage API puis ligne
    const rm = await cm.client.storage.from('post-media').remove([path]);
    expect(rm.error).toBeNull();
    const del = await cm.client.from('post_media').delete().eq('id', row.id);
    expect(del.error).toBeNull();

    const check = await admin().from('post_media').select('id').eq('id', row.id);
    expect(check.data ?? []).toHaveLength(0);
  });
});
