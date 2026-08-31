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

const ready = hasDbTestEnv && (await tableExists('client_requests'));
const maybe = ready ? describe : describe.skip;

/** Story 6.5 : espace brief client → agence. */
maybe('demandes clients (6.5)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';
  let clientB = '';
  let contactA: TestContact;
  let contactB: TestContact;
  let reqId = '';

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    [clientA, clientB] = await Promise.all([
      createTestClient('REQ-A ' + crypto.randomUUID()),
      createTestClient('REQ-B ' + crypto.randomUUID()),
    ]);
    await assignUserToClient(cm.id, clientA);
    contactA = await createTestContact(lead, clientA);
    contactB = await createTestContact(lead, clientB);

    const { data } = await contactA.client
      .from('client_requests')
      .insert({
        client_id: clientA,
        created_by: contactA.authUserId,
        title: 'Post pour les soldes',
        description: 'Mettre en avant -30%',
        wanted_network: 'instagram',
      })
      .select('id')
      .single();
    reqId = data!.id;
  }, 60_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await admin().from('client_requests').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([cm.id, lead.id, contactA.authUserId, contactB.authUserId]);
  }, 30_000);

  it('la demande est visible du CM assigné et du lead, pas d’un autre client', async () => {
    const seenByCm = await cm.client.from('client_requests').select('id').eq('id', reqId);
    expect(seenByCm.data ?? []).toHaveLength(1);

    const seenByB = await contactB.client.from('client_requests').select('id').eq('id', reqId);
    expect(seenByB.data ?? []).toHaveLength(0);
  });

  it('le contact modifie sa demande tant qu’elle est « nouvelle », jamais son statut', async () => {
    const edit = await contactA.client
      .from('client_requests')
      .update({ description: 'Mettre en avant -40%' })
      .eq('id', reqId);
    expect(edit.error).toBeNull();

    const statusChange = await contactA.client
      .from('client_requests')
      .update({ status: 'traitee' })
      .eq('id', reqId);
    expect(statusChange.error).not.toBeNull();
  });

  it('l’agence change le statut ; le contact ne peut plus modifier', async () => {
    const s = await lead.client
      .from('client_requests')
      .update({ status: 'prise_en_compte' })
      .eq('id', reqId);
    expect(s.error).toBeNull();

    const late = await contactA.client
      .from('client_requests')
      .update({ description: 'trop tard' })
      .eq('id', reqId);
    // policy update : plus de match (status != nouvelle) → 0 ligne, pas d'erreur
    const { data } = await admin()
      .from('client_requests')
      .select('description')
      .eq('id', reqId)
      .single();
    expect(data!.description).toBe('Mettre en avant -40%');
    expect(late.error).toBeNull();
  });

  it('request_to_post : crée un post brouillon lié ; interdit au contact', async () => {
    const ko = await contactA.client.rpc('request_to_post', { p_request_id: reqId });
    expect(ko.error).not.toBeNull();

    const ok = await cm.client.rpc('request_to_post', { p_request_id: reqId });
    expect(ok.error).toBeNull();
    const post = ok.data as { origin_type: string; origin_id: string; status: string; client_id: string };
    expect(post.origin_type).toBe('client_request');
    expect(post.origin_id).toBe(reqId);
    expect(post.status).toBe('draft');
    expect(post.client_id).toBe(clientA);
  });

  it('les commentaires de demande sont partagés client ↔ agence', async () => {
    await contactA.client
      .from('client_request_comments')
      .insert({ request_id: reqId, author_id: contactA.authUserId, body: 'Merci !' });
    await cm.client
      .from('client_request_comments')
      .insert({ request_id: reqId, author_id: cm.id, body: 'On s’en occupe.' });

    const seenByContact = await contactA.client
      .from('client_request_comments')
      .select('body')
      .eq('request_id', reqId)
      .order('created_at');
    expect((seenByContact.data ?? []).map((c) => c.body)).toEqual(['Merci !', 'On s’en occupe.']);
  });
});
