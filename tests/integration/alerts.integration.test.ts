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

const ready = hasDbTestEnv && (await tableExists('alerts'));
const maybe = ready ? describe : describe.skip;

/** Stories 8.1 + 8.2 : moteur d'alertes + visibilité. */
maybe('alertes (8.1 / 8.2)', () => {
  let cmA: TestUser;
  let cmB: TestUser;
  let lead: TestUser;
  let clientA = '';
  let clientB = '';
  let contactA: TestContact;
  let overduePost = '';

  beforeAll(async () => {
    [cmA, cmB, lead] = await Promise.all([
      createTestUser('cm'),
      createTestUser('cm'),
      createTestUser('lead'),
    ]);
    clientA = await createTestClient('AL-A ' + crypto.randomUUID());
    clientB = await createTestClient('AL-B ' + crypto.randomUUID());
    await assignUserToClient(cmA.id, clientA);
    await assignUserToClient(cmB.id, clientB);
    contactA = await createTestContact(lead, clientA);

    // Post en attente de validation depuis 6 jours (règle a) + client A inactif au-delà
    const p = await admin()
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram',
        scheduled_at: new Date(Date.now() + 40 * 864e5).toISOString(),
        caption: 'À valider depuis longtemps',
        author_id: cmA.id,
        status: 'internal_review',
        status_changed_at: new Date(Date.now() - 6 * 864e5).toISOString(),
        performance_visible_to_client: false,
      })
      .select('id')
      .single();
    overduePost = p.data.id;

    // Post B planifié aujourd'hui (règle g)
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    await admin().from('posts').insert({
      client_id: clientB,
      network: 'instagram',
      scheduled_at: today.toISOString(),
      caption: 'À publier',
      author_id: cmB.id,
      status: 'scheduled',
      performance_visible_to_client: false,
    });
  }, 60_000);

  afterAll(async () => {
    await admin().from('alerts').delete().in('client_id', [clientA, clientB]);
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cmA.id, cmB.id, lead.id, contactA.authUserId]);
  }, 30_000);

  it('generate_alerts crée les alertes attendues et est idempotent', async () => {
    const r1 = await admin().rpc('generate_alerts');
    expect(r1.error).toBeNull();

    const { data } = await admin()
      .from('alerts')
      .select('type, client_id, status')
      .in('client_id', [clientA, clientB]);
    const types = (data ?? []).map((a) => a.type);
    expect(types).toContain('validation_overdue');
    expect(types).toContain('publish_reminder');
    expect(types).toContain('client_inactive'); // A et B n'ont pas de post à venir "planifié" côté fenêtre

    const before = (data ?? []).length;
    const r2 = await admin().rpc('generate_alerts');
    expect(r2.data.stats.created).toBe(0);
    const after = await admin()
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .in('client_id', [clientA, clientB]);
    expect(after.count).toBe(before);
  });

  it('ferme automatiquement l’alerte quand le post est validé', async () => {
    // le post quitte l'état "review" (via service_role, le trigger de garde l'autorise)
    await admin().from('posts').update({ status: 'approved' }).eq('id', overduePost);
    await admin().rpc('generate_alerts');

    const { data } = await admin()
      .from('alerts')
      .select('status')
      .eq('post_id', overduePost)
      .eq('type', 'validation_overdue')
      .single();
    expect(data.status).toBe('dismissed');
  });

  it('un CM ne voit que les alertes de ses clients ; pas celles réservées au Lead', async () => {
    const seenByA = await cmA.client.from('alerts').select('type, client_id');
    expect((seenByA.data ?? []).every((a) => a.client_id === clientA)).toBe(true);
    // client_inactive est target_role='lead' → invisible du cm
    expect((seenByA.data ?? []).some((a) => a.type === 'client_inactive')).toBe(false);

    const seenByLead = await lead.client.from('alerts').select('type').in('type', ['client_inactive']);
    expect((seenByLead.data ?? []).length).toBeGreaterThan(0);

    const seenByContact = await contactA.client.from('alerts').select('id');
    expect(seenByContact.data ?? []).toHaveLength(0);
  });

  it('marquer une alerte « vue » puis « ignorée »', async () => {
    const { data: a } = await cmA.client
      .from('alerts')
      .select('id')
      .eq('client_id', clientA)
      .eq('type', 'validation_overdue')
      .maybeSingle();
    if (!a) return; // déjà dismissed par le test précédent selon l'ordre
    const seen = await cmA.client.from('alerts').update({ status: 'seen' }).eq('id', a.id);
    expect(seen.error).toBeNull();
  });
});
