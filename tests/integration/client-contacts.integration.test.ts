import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  admin,
  assignUserToClient,
  createTestClient,
  createTestUser,
  deleteTestClients,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  TEST_ANON_KEY,
  TEST_URL,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('client_contacts'));
const maybe = ready ? describe : describe.skip;

/** Story 2.3 : contacts de validation + invitation (Edge Function) + isolation. */
maybe('client_contacts & invite_contact', () => {
  let lead: TestUser;
  let cm: TestUser;
  let clientA = '';
  let clientB = '';
  const invitedUserIds: string[] = [];

  beforeAll(async () => {
    [lead, cm] = await Promise.all([createTestUser('lead'), createTestUser('cm')]);
    clientA = await createTestClient('CC-A ' + crypto.randomUUID());
    clientB = await createTestClient('CC-B ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await admin().from('client_contacts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([lead.id, cm.id, ...invitedUserIds]);
  }, 30_000);

  it('un lead ajoute un contact ; un CM ne peut pas', async () => {
    const ok = await lead.client
      .from('client_contacts')
      .insert({ client_id: clientA, full_name: 'Client A', email: `a-${crypto.randomUUID()}@example.test` })
      .select('id')
      .single();
    expect(ok.error).toBeNull();

    const ko = await cm.client
      .from('client_contacts')
      .insert({ client_id: clientA, full_name: 'x', email: `x-${crypto.randomUUID()}@example.test` });
    expect(ko.error).not.toBeNull();
  });

  it('un CM assigné voit les contacts de son client (lecture seule)', async () => {
    const { data, error } = await cm.client
      .from('client_contacts')
      .select('id')
      .eq('client_id', clientA);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("invite_contact crée un compte client et le lie ; le contact ne voit que son client", async () => {
    const email = `contact-${crypto.randomUUID()}@example.test`;
    const { data, error } = await lead.client.functions.invoke('admin-users', {
      body: { action: 'invite_contact', clientId: clientB, fullName: 'Contact B', email },
    });
    expect(error).toBeNull();
    const contact = (data as { contact: { id: string; auth_user_id: string } }).contact;
    expect(contact.auth_user_id).toBeTruthy();
    invitedUserIds.push(contact.auth_user_id);

    // Profil = client
    const { data: prof } = await admin()
      .from('profiles')
      .select('role, is_active')
      .eq('id', contact.auth_user_id)
      .single();
    expect(prof).toMatchObject({ role: 'client', is_active: true });

    // Le contact se connecte et ne voit que sa propre ligne (client B), pas celles de A.
    const c: SupabaseClient = createClient(TEST_URL, TEST_ANON_KEY, {
      auth: { persistSession: false, storageKey: `t-${crypto.randomUUID()}` },
    });
    // mot de passe inconnu → on récupère via un lien admin : on force un mot de passe.
    await admin().auth.admin.updateUserById(contact.auth_user_id, { password: 'Test-Passw0rd!' });
    const signIn = await c.auth.signInWithPassword({ email, password: 'Test-Passw0rd!' });
    expect(signIn.error).toBeNull();

    const seen = await c.from('client_contacts').select('client_id');
    expect(error).toBeNull();
    const clientIds = (seen.data ?? []).map((r) => r.client_id);
    expect(clientIds).toEqual([clientB]);
    expect(clientIds).not.toContain(clientA);
  });

  it('un CM ne peut pas appeler invite_contact', async () => {
    const { error } = await cm.client.functions.invoke('admin-users', {
      body: { action: 'invite_contact', clientId: clientA, fullName: 'x', email: 'x@example.test' },
    });
    expect(error).not.toBeNull();
  });
});
