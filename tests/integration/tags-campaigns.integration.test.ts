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

const ready = hasDbTestEnv && (await tableExists('campaigns'));
const maybe = ready ? describe : describe.skip;

/** Story 3.6 : tags, campagnes, duplication — sous RLS. */
maybe('tags / campaigns / post_duplicate (3.6)', () => {
  let cm: TestUser;
  let cmOther: TestUser;
  let clientA = '';
  const tagIds: string[] = [];

  beforeAll(async () => {
    [cm, cmOther] = await Promise.all([createTestUser('cm'), createTestUser('cm')]);
    clientA = await createTestClient('TC ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await admin().from('campaigns').delete().eq('client_id', clientA);
    await admin().from('tags').delete().in('id', tagIds);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id, cmOther.id]);
  }, 30_000);

  it('un CM crée un tag (global) et une campagne (sur son client)', async () => {
    const tag = await cm.client
      .from('tags')
      .insert({ name: 'promo-' + crypto.randomUUID() })
      .select('id')
      .single();
    expect(tag.error).toBeNull();
    tagIds.push(tag.data!.id);

    const camp = await cm.client
      .from('campaigns')
      .insert({ client_id: clientA, name: 'Été', starts_on: '2026-06-01', ends_on: '2026-08-31' })
      .select('id')
      .single();
    expect(camp.error).toBeNull();
  });

  it('post_duplicate copie la campagne + les tags, décale la date, statut brouillon', async () => {
    const { data: camp } = await admin()
      .from('campaigns')
      .insert({ client_id: clientA, name: 'Rentrée', starts_on: '2026-09-01', ends_on: '2026-09-30' })
      .select('id')
      .single();
    const { data: tag } = await admin()
      .from('tags')
      .insert({ name: 'ugc-' + crypto.randomUUID() })
      .select('id')
      .single();
    tagIds.push(tag!.id);

    const { data: src } = await cm.client
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram',
        scheduled_at: '2026-09-10T10:00:00Z',
        caption: 'Post source',
        author_id: cm.id,
        campaign_id: camp!.id,
        status: 'approved',
      })
      .select('id')
      .single();
    await cm.client.from('post_tags').insert({ post_id: src!.id, tag_id: tag!.id });

    const { data: dup, error } = await cm.client.rpc('post_duplicate', {
      p_post_id: src!.id,
      p_shift_days: 7,
    });
    expect(error).toBeNull();
    const d = dup as { id: string; status: string; campaign_id: string; scheduled_at: string };
    expect(d.status).toBe('draft');
    expect(d.campaign_id).toBe(camp!.id);
    expect(new Date(d.scheduled_at).toISOString()).toBe('2026-09-17T10:00:00.000Z');

    const { data: dupTags } = await cm.client.from('post_tags').select('tag_id').eq('post_id', d.id);
    expect((dupTags ?? []).map((r) => r.tag_id)).toEqual([tag!.id]);
  });

  it('un CM non assigné ne voit pas la campagne et ne peut pas dupliquer', async () => {
    const { data: camp } = await admin()
      .from('campaigns')
      .select('id')
      .eq('client_id', clientA)
      .limit(1)
      .single();
    const seen = await cmOther.client.from('campaigns').select('id').eq('id', camp!.id);
    expect(seen.data ?? []).toHaveLength(0);

    const { data: post } = await admin()
      .from('posts')
      .select('id')
      .eq('client_id', clientA)
      .limit(1)
      .single();
    const dup = await cmOther.client.rpc('post_duplicate', { p_post_id: post!.id });
    expect(dup.error).not.toBeNull();
  });

  it('campaign_overview compte les posts', async () => {
    const { data } = await cm.client
      .from('campaign_overview')
      .select('name, post_count')
      .eq('client_id', clientA);
    const rentree = (data ?? []).find((c) => c.name === 'Rentrée');
    expect(rentree?.post_count).toBeGreaterThanOrEqual(2);
  });
});
