import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  createTestClient,
  createTestUser,
  deleteTestClients,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestUser,
} from './_helpers';

const ready =
  hasDbTestEnv &&
  (await tableExists('job_runs')) &&
  (await (async () => {
    const { error } = await admin().rpc('auto_publish_due');
    return !error;
  })());
const maybe = ready ? describe : describe.skip;

/** 0039 : publication automatique des posts planifiés arrivés à échéance. */
maybe('auto_publish_due (0039)', () => {
  let clientA = '';
  let author: TestUser;

  // Fusionne pour ne pas écraser la config de compte du projet partagé.
  const setAutoPublish = async (on: boolean) => {
    const { data } = await admin()
      .from('app_settings')
      .select('value')
      .eq('key', 'account')
      .maybeSingle();
    const base = (data?.value ?? {}) as Record<string, unknown>;
    await admin()
      .from('app_settings')
      .upsert({ key: 'account', value: { ...base, auto_publish: on } }, { onConflict: 'key' });
  };

  const mkScheduled = (whenIso: string) =>
    admin()
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram' as const,
        scheduled_at: whenIso,
        caption: 'x',
        author_id: author.id,
        status: 'scheduled' as const,
      })
      .select('id')
      .single();

  beforeAll(async () => {
    author = await createTestUser('cm');
    clientA = await createTestClient('AP ' + crypto.randomUUID());
  }, 30_000);

  afterEach(async () => {
    await setAutoPublish(false);
    await admin().from('posts').delete().eq('client_id', clientA);
  });

  afterAll(async () => {
    await setAutoPublish(false);
    await deleteTestClients([clientA]);
    await deleteTestUsers([author.id]);
  }, 30_000);

  it('désactivé : ne publie rien', async () => {
    await setAutoPublish(false);
    const { data: p } = await mkScheduled(new Date(Date.now() - 3600_000).toISOString());
    await admin().rpc('auto_publish_due');
    const { data } = await admin().from('posts').select('status').eq('id', p!.id).single();
    expect(data?.status).toBe('scheduled');
  });

  it('activé : publie les posts échus, pas les futurs', async () => {
    await setAutoPublish(true);
    const { data: past } = await mkScheduled(new Date(Date.now() - 3600_000).toISOString());
    const { data: future } = await mkScheduled(new Date(Date.now() + 86_400_000).toISOString());

    const run = await admin().rpc('auto_publish_due');
    expect(run.error).toBeNull();

    const { data: a } = await admin().from('posts').select('status').eq('id', past!.id).single();
    const { data: b } = await admin().from('posts').select('status').eq('id', future!.id).single();
    expect(a?.status).toBe('published');
    expect(b?.status).toBe('scheduled');
  });
});
