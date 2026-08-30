import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
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
import { POST_STATUSES } from '@/shared/constants/postStatus';
import { ROLES } from '@/shared/constants/roles';
import { canTransition, transitionNeedsComment } from '@/shared/utils/transitions';

const ready = hasDbTestEnv && (await tableExists('post_transitions'));
const maybe = ready ? describe : describe.skip;

/** Story 3.2 : parité SQL ↔ TS + RPC post_change_status. */
maybe('pipeline de statuts (3.2)', () => {
  let cm: TestUser;
  let lead: TestUser;
  let clientA = '';

  beforeAll(async () => {
    [cm, lead] = await Promise.all([createTestUser('cm'), createTestUser('lead')]);
    clientA = await createTestClient('TR ' + crypto.randomUUID());
    await assignUserToClient(cm.id, clientA);
  }, 30_000);

  afterAll(async () => {
    await admin().from('posts').delete().eq('client_id', clientA);
    await deleteTestClients([clientA]);
    await deleteTestUsers([cm.id, lead.id]);
  }, 30_000);

  it('la table SQL post_transitions correspond exactement au miroir TS', async () => {
    const { data, error } = await admin()
      .from('post_transitions')
      .select('from_status, to_status, roles, needs_comment');
    expect(error).toBeNull();

    for (const from of POST_STATUSES) {
      for (const to of POST_STATUSES) {
        for (const role of ROLES) {
          const sqlRow = (data ?? []).find(
            (r) => r.from_status === from && r.to_status === to && r.roles.includes(role),
          );
          const sqlAllowed = Boolean(sqlRow);
          const ts = canTransition(from, to, role);
          expect(
            ts.allowed,
            `${from}->${to} (${role}) : TS=${ts.allowed} SQL=${sqlAllowed}`,
          ).toBe(sqlAllowed);
          if (sqlAllowed) {
            expect(ts.needsComment).toBe(sqlRow!.needs_comment);
            expect(transitionNeedsComment(from, to)).toBe(sqlRow!.needs_comment);
          }
        }
      }
    }
  });

  it('post_change_status : parcours nominal cm → lead', async () => {
    const { data: p } = await cm.client
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram',
        scheduled_at: new Date().toISOString(),
        caption: 'x',
        author_id: cm.id,
      })
      .select('id')
      .single();

    const r1 = await cm.client.rpc('post_change_status', {
      p_post_id: p!.id,
      p_to: 'internal_review',
    });
    expect(r1.error).toBeNull();
    expect((r1.data as { status: string }).status).toBe('internal_review');

    // cm ne peut pas valider en interne
    const r2 = await cm.client.rpc('post_change_status', {
      p_post_id: p!.id,
      p_to: 'client_review',
    });
    expect(r2.error).not.toBeNull();

    // lead oui
    const r3 = await lead.client.rpc('post_change_status', {
      p_post_id: p!.id,
      p_to: 'client_review',
    });
    expect(r3.error).toBeNull();
  });

  it('post_change_status : renvoi en brouillon exige un commentaire', async () => {
    const { data: p } = await cm.client
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram',
        scheduled_at: new Date().toISOString(),
        caption: 'y',
        author_id: cm.id,
      })
      .select('id')
      .single();
    await cm.client.rpc('post_change_status', { p_post_id: p!.id, p_to: 'internal_review' });

    const noComment = await lead.client.rpc('post_change_status', {
      p_post_id: p!.id,
      p_to: 'draft',
    });
    expect(noComment.error).not.toBeNull();

    const withComment = await lead.client.rpc('post_change_status', {
      p_post_id: p!.id,
      p_to: 'draft',
      p_comment: 'Revoir l’accroche',
    });
    expect(withComment.error).toBeNull();

    // historique
    const { data: hist } = await admin()
      .from('post_history')
      .select('action, new_value')
      .eq('post_id', p!.id)
      .order('created_at');
    expect((hist ?? []).some((h) => h.action === 'status_change')).toBe(true);
    expect((hist ?? []).some((h) => h.action === 'comment')).toBe(true);
  });

  it('un rôle client ne peut pas appeler post_change_status', async () => {
    // On fabrique un contact client via l'Edge Function invite_contact.
    const email = `tr-contact-${crypto.randomUUID()}@example.test`;
    const inv = await lead.client.functions.invoke('admin-users', {
      body: { action: 'invite_contact', clientId: clientA, fullName: 'C', email },
    });
    const authUserId = (inv.data as { contact: { auth_user_id: string } }).contact.auth_user_id;
    await admin().auth.admin.updateUserById(authUserId, { password: 'Test-Passw0rd!' });

    const c = createClient(TEST_URL, TEST_ANON_KEY, {
      auth: { persistSession: false, storageKey: `tr-${crypto.randomUUID()}` },
    });
    await c.auth.signInWithPassword({ email, password: 'Test-Passw0rd!' });

    const { data: p } = await admin()
      .from('posts')
      .insert({
        client_id: clientA,
        network: 'instagram',
        scheduled_at: new Date().toISOString(),
        caption: 'z',
        author_id: cm.id,
        status: 'client_review',
      })
      .select('id')
      .single();

    const r = await c.rpc('post_change_status', { p_post_id: p!.id, p_to: 'approved' });
    expect(r.error).not.toBeNull();

    await admin().auth.admin.deleteUser(authUserId);
  });
});
