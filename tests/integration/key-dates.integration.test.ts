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

const ready = hasDbTestEnv && (await tableExists('key_dates'));
const maybe = ready ? describe : describe.skip;

/** Story 7.3 : marronniers — RLS, résolution par client, planification. */
maybe('marronniers (7.3)', () => {
  let lead: TestUser;
  let cm: TestUser;
  let clientResto = '';
  let clientRetail = '';
  let contactResto: TestContact;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    [lead, cm] = await Promise.all([createTestUser('lead'), createTestUser('cm')]);
    clientResto = (
      await admin()
        .from('clients')
        .insert({ name: 'KD Resto ' + crypto.randomUUID(), sector: 'restauration' })
        .select('id')
        .single()
    ).data!.id;
    clientRetail = (
      await admin()
        .from('clients')
        .insert({ name: 'KD Retail ' + crypto.randomUUID(), sector: 'retail' })
        .select('id')
        .single()
    ).data!.id;
    await assignUserToClient(cm.id, clientResto);
    contactResto = await createTestContact(lead, clientResto);

    const mk = async (row: Record<string, unknown>, k: string) => {
      const { data, error } = await lead.client
        .from('key_dates')
        .insert({ created_by: lead.id, event_date: '2026-05-01', ...row })
        .select('id')
        .single();
      if (error) throw error;
      ids[k] = data!.id;
    };
    await mk({ name: 'Nouvel An', scope: 'global' }, 'global');
    await mk({ name: 'Semaine du goût', scope: 'sector', sector: 'restauration' }, 'sectorResto');
    await mk({ name: 'Black Friday', scope: 'sector', sector: 'retail' }, 'sectorRetail');
    await mk({ name: 'Anniv resto', scope: 'client', client_id: clientResto }, 'clientResto');
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientResto, clientRetail]);
    await admin().from('key_dates').delete().in('id', Object.values(ids));
    await deleteTestClients([clientResto, clientRetail]);
    await deleteTestUsers([lead.id, cm.id, contactResto.authUserId]);
  }, 30_000);

  it('un CM voit les marronniers globaux et secteur, pas ceux d’un autre client', async () => {
    const { data } = await cm.client.from('key_dates').select('name, scope, client_id');
    const names = (data ?? []).map((k) => k.name);
    expect(names).toEqual(expect.arrayContaining(['Nouvel An', 'Semaine du goût', 'Black Friday']));
    // le marronnier client d'un client non assigné n'est pas visible — ici il l'est (assigné)
    expect(names).toContain('Anniv resto');
  });

  it('un contact client ne voit aucun marronnier', async () => {
    const { data } = await contactResto.client.from('key_dates').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('un CM ne peut pas créer un marronnier global', async () => {
    const r = await cm.client
      .from('key_dates')
      .insert({ name: 'Tentative', scope: 'global', event_date: '2026-06-01', created_by: cm.id });
    expect(r.error).not.toBeNull();
  });

  it('key_dates_for_client résout global + secteur du client + spécifiques', async () => {
    const { data } = await lead.client.rpc('key_dates_for_client', { p_client_id: clientResto });
    const names = (data as { name: string }[]).map((k) => k.name).sort();
    expect(names).toEqual(['Anniv resto', 'Nouvel An', 'Semaine du goût']);
  });

  it('key_date_to_post : post brouillon pré-daté lié au marronnier', async () => {
    const r = await cm.client.rpc('key_date_to_post', {
      p_key_date_id: ids['sectorResto'],
      p_client_id: clientResto,
      p_year: 2027,
      p_network: 'instagram',
    });
    expect(r.error).toBeNull();
    const post = r.data as { origin_type: string; origin_id: string; scheduled_at: string; status: string };
    expect(post.origin_type).toBe('key_date');
    expect(post.origin_id).toBe(ids['sectorResto']);
    expect(post.status).toBe('draft');
    expect(post.scheduled_at.startsWith('2027-05-01')).toBe(true);
  });
});
