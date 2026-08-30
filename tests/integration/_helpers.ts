import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const TEST_URL = process.env.SUPABASE_TEST_URL ?? '';
export const TEST_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY ?? '';
export const TEST_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? '';

/** Les tests d'intégration DB ne tournent que si l'instance ET la clé service_role sont fournies. */
export const hasDbTestEnv = Boolean(TEST_URL && TEST_ANON_KEY && TEST_SERVICE_KEY);

/** Client service_role : contourne la RLS. Réservé au setup/teardown des tests. */
export function admin(): SupabaseClient {
  return createClient(TEST_URL, TEST_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Client anonyme (comme le navigateur). */
export function anon(): SupabaseClient {
  return createClient(TEST_URL, TEST_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const PASSWORD = 'Test-Passw0rd!';

export interface TestUser {
  id: string;
  email: string;
  /** Client authentifié en tant que cet utilisateur (JWT réel, RLS active). */
  client: SupabaseClient;
}

/**
 * Crée un utilisateur auth confirmé, force son `profiles.role` / `is_active`,
 * et renvoie un client Supabase connecté en tant que lui.
 */
export async function createTestUser(
  role: 'cm' | 'lead' | 'admin' | 'client',
  opts: { isActive?: boolean; prefix?: string } = {},
): Promise<TestUser> {
  const isActive = opts.isActive ?? true;
  const email = `test+${opts.prefix ?? role}-${crypto.randomUUID()}@example.test`;
  const a = admin();

  const created = await a.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(`createUser a échoué : ${created.error?.message}`);
  }
  const id = created.data.user.id;

  // Le trigger handle_new_user a créé le profil (role cm, inactif) — on l'ajuste.
  const upd = await a
    .from('profiles')
    .update({ role, is_active: isActive })
    .eq('id', id);
  if (upd.error) throw new Error(`update profile a échoué : ${upd.error.message}`);

  const client = anon();
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw new Error(`signIn a échoué : ${signIn.error.message}`);

  return { id, email, client };
}

/** Supprime des utilisateurs auth (cascade → profiles, user_clients). */
export async function deleteTestUsers(ids: string[]): Promise<void> {
  const a = admin();
  await Promise.all(ids.map((id) => a.auth.admin.deleteUser(id)));
}

/** Crée un client (table clients) via service_role, renvoie son id. */
export async function createTestClient(name: string): Promise<string> {
  const { data, error } = await admin().from('clients').insert({ name }).select('id').single();
  if (error) throw new Error(`createTestClient a échoué : ${error.message}`);
  return data.id as string;
}

/** Supprime des clients (hard delete) via service_role. */
export async function deleteTestClients(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await admin().from('clients').delete().in('id', ids);
}

export async function assignUserToClient(profileId: string, clientId: string): Promise<void> {
  const { error } = await admin()
    .from('user_clients')
    .insert({ profile_id: profileId, client_id: clientId });
  if (error) throw new Error(`assignUserToClient a échoué : ${error.message}`);
}
