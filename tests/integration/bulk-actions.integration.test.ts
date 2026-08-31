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

/**
 * Story 9.1 — actions en masse. L'exécution est côté client (boucle sur les RPC
 * unitaires) ; ce qui compte au niveau base, c'est que chaque post soit traité
 * **indépendamment** : un post hors droits échoue sans bloquer les autres.
 */
maybe('actions en masse — cas partiels (9.1)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';
  let clientB = '';

  const mkPost = (over: Record<string, unknown> = {}) => ({
    client_id: clientA,
    network: 'instagram' as const,
    scheduled_at: new Date().toISOString(),
    caption: 'x',
    author_id: cm.id,
    ...over,
  });

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    clientA = await createTestClient('BULK-A ' + crypto.randomUUID());
    clientB = await createTestClient('BULK-B ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA); // le CM n'a PAS accès à clientB
  }, 30_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id, lead.id]);
  }, 30_000);

  it('corbeille en masse : le brouillon du CM part, le post validé est refusé', async () => {
    const draft = (await cm.client.from('posts').insert(mkPost()).select('id').single()).data!;
    const approved = (
      await lead.client.from('posts').insert(mkPost({ status: 'approved' })).select('id').single()
    ).data!;

    // Boucle « atomique par post » comme le fait useBulkActions.trash
    const results = await Promise.all(
      [draft.id, approved.id].map((id) =>
        cm.client.rpc('post_trash', { p_post_id: id }).then((r) => ({ id, ok: r.error === null })),
      ),
    );

    expect(results.find((r) => r.id === draft.id)?.ok).toBe(true);
    expect(results.find((r) => r.id === approved.id)?.ok).toBe(false);
  });

  it('changement de statut en masse : le post d’un client non autorisé échoue seul', async () => {
    const mine = (
      await cm.client.from('posts').insert(mkPost({ status: 'draft' })).select('id').single()
    ).data!;
    const other = (
      await admin()
        .from('posts')
        .insert({ ...mkPost(), client_id: clientB, status: 'draft', author_id: lead.id })
        .select('id')
        .single()
    ).data!;

    const results = await Promise.all(
      [mine.id, other.id].map((id) =>
        cm.client
          .rpc('post_change_status', { p_post_id: id, p_to: 'internal_review' })
          .then((r) => ({ id, ok: r.error === null })),
      ),
    );

    expect(results.find((r) => r.id === mine.id)?.ok).toBe(true);
    expect(results.find((r) => r.id === other.id)?.ok).toBe(false);
  });

  it('réassignation : un Lead peut, un CM non', async () => {
    const p = (await cm.client.from('posts').insert(mkPost()).select('id').single()).data!;

    const okLead = await lead.client.from('posts').update({ author_id: lead.id }).eq('id', p.id);
    expect(okLead.error).toBeNull();

    // remet au CM via lead, puis le CM tente de réassigner un post d'un client hors accès
    const other = (
      await admin()
        .from('posts')
        .insert({ ...mkPost(), client_id: clientB, author_id: lead.id })
        .select('id')
        .single()
    ).data!;
    const koCm = await cm.client.from('posts').update({ author_id: cm.id }).eq('id', other.id);
    // RLS : 0 ligne affectée (pas d'erreur, mais rien ne change)
    const { data: check } = await admin()
      .from('posts')
      .select('author_id')
      .eq('id', other.id)
      .single();
    expect(check?.author_id).toBe(lead.id);
    expect(koCm.error).toBeNull();
  });
});
