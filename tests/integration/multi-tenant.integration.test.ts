import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  admin,
  anon,
  assignUserToClient,
  createTestClient,
  createTestOrg,
  createTestUser,
  deleteTestClients,
  deleteTestOrgs,
  deleteTestUsers,
  hasDbTestEnv,
  tableExists,
  type TestUser,
} from './_helpers';

const ready = hasDbTestEnv && (await tableExists('organizations'));
const maybe = ready ? describe : describe.skip;

/** 0042 / 0043 : isolation par organisation + inscription sur invitation. */
maybe('multi-tenant — isolation & invitation', () => {
  let orgA = '';
  let orgB = '';
  let adminA: TestUser;
  let adminB: TestUser;
  let clientA = '';
  let clientB = '';
  const invitees: string[] = [];

  beforeAll(async () => {
    [orgA, orgB] = await Promise.all([createTestOrg('MT A'), createTestOrg('MT B')]);
    [adminA, adminB] = await Promise.all([
      createTestUser('admin', { orgId: orgA }),
      createTestUser('admin', { orgId: orgB }),
    ]);
    clientA = await createTestClient('MT client A ' + crypto.randomUUID(), orgA);
    clientB = await createTestClient('MT client B ' + crypto.randomUUID(), orgB);
  }, 40_000);

  afterAll(async () => {
    await admin().from('posts').delete().in('client_id', [clientA, clientB]);
    await deleteTestClients([clientA, clientB]);
    await deleteTestUsers([adminA.id, adminB.id, ...invitees]);
    await deleteTestOrgs([orgA, orgB]);
  }, 30_000);

  it("un Directeur ne voit que les clients de son organisation", async () => {
    const seenByA = await adminA.client.from('clients').select('id');
    const idsA = (seenByA.data ?? []).map((c) => c.id);
    expect(idsA).toContain(clientA);
    expect(idsA).not.toContain(clientB);
  });

  it('un Directeur ne peut pas créer de post pour un client d’une autre organisation', async () => {
    const res = await adminA.client.from('posts').insert({
      client_id: clientB,
      network: 'instagram',
      scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      caption: 'intrusion',
      author_id: adminA.id,
    });
    expect(res.error).not.toBeNull();
  });

  it('les réglages org_settings sont cloisonnés par organisation', async () => {
    await admin()
      .from('org_settings')
      .upsert(
        { organization_id: orgA, key: 'account', value: { agency_name: 'Studio A' } },
        { onConflict: 'organization_id,key' },
      );
    const fromB = await adminB.client.from('org_settings').select('value').eq('key', 'account');
    const names = (fromB.data ?? []).map((r) => (r.value as { agency_name?: string }).agency_name);
    expect(names).not.toContain('Studio A');
  });

  it('un post d’un client est stampé avec l’organisation du client', async () => {
    await assignUserToClient(adminA.id, clientA);
    const { data, error } = await adminA.client
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram',
        scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
        caption: 'ok',
        author_id: adminA.id,
      })
      .select('organization_id')
      .single();
    expect(error).toBeNull();
    expect(data?.organization_id).toBe(orgA);
  });

  it("accept_org_invitation crée l'organisation et fait de l'invité un Directeur actif", async () => {
    const email = `mt-invitee-${crypto.randomUUID()}@example.test`;
    const created = await admin().auth.admin.createUser({
      email,
      password: 'Test-Passw0rd!',
      email_confirm: true,
    });
    const uid = created.data.user!.id;
    invitees.push(uid);
    const { data: inv } = await admin()
      .from('org_invitations')
      .insert({ email, org_name: 'Agence Invitée' })
      .select('token')
      .single();

    const client = anon();
    await client.auth.signInWithPassword({ email, password: 'Test-Passw0rd!' });
    const { data: acc, error } = await client.rpc('accept_org_invitation', {
      p_token: inv!.token,
      p_org_name: 'Agence Finale',
    });
    expect(error).toBeNull();
    const orgId = (acc as { organizationId: string }).organizationId;

    const { data: prof } = await admin()
      .from('profiles')
      .select('role, is_active, organization_id')
      .eq('id', uid)
      .single();
    expect(prof).toMatchObject({ role: 'admin', is_active: true, organization_id: orgId });

    // deuxième acceptation refusée
    const again = await client.rpc('accept_org_invitation', { p_token: inv!.token });
    expect(again.error).not.toBeNull();

    await admin().from('organizations').delete().eq('id', orgId);
    await admin().from('org_invitations').delete().eq('token', inv!.token);
  });

  it('invitation « lien seul » (sans e-mail) : create_org_invitation réservé au platform admin, accepté par n\'importe qui', async () => {
    // adminA n'est pas platform admin → refusé
    const denied = await adminA.client.rpc('create_org_invitation', { p_org_name: 'X' });
    expect(denied.error).not.toBeNull();

    // on fait de adminB un platform admin le temps du test
    await admin().from('platform_admins').insert({ user_id: adminB.id });
    try {
      const { data: inv, error } = await adminB.client.rpc('create_org_invitation', {
        p_org_name: 'Agence Ouverte',
      });
      expect(error).toBeNull();
      const token = (inv as { token: string }).token;

      // un compte tout neuf, sans lien avec l'e-mail de l'invitation
      const email = `mt-open-${crypto.randomUUID()}@example.test`;
      const c = await admin().auth.admin.createUser({
        email,
        password: 'Test-Passw0rd!',
        email_confirm: true,
      });
      invitees.push(c.data.user!.id);
      const client = anon();
      await client.auth.signInWithPassword({ email, password: 'Test-Passw0rd!' });
      const acc = await client.rpc('accept_org_invitation', { p_token: token, p_org_name: 'Mon agence' });
      expect(acc.error).toBeNull();
      const orgId = (acc.data as { organizationId: string }).organizationId;
      await admin().from('organizations').delete().eq('id', orgId);
      await admin().from('org_invitations').delete().eq('token', token);
    } finally {
      await admin().from('platform_admins').delete().eq('user_id', adminB.id);
    }
  });
});
