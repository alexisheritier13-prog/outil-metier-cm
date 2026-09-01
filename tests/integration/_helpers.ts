import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const TEST_URL = process.env.SUPABASE_TEST_URL ?? '';
export const TEST_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY ?? '';
export const TEST_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? '';

/** Les tests d'intégration DB ne tournent que si l'instance ET la clé service_role sont fournies. */
export const hasDbTestEnv = Boolean(TEST_URL && TEST_ANON_KEY && TEST_SERVICE_KEY);

/** Client service_role : contourne la RLS. Réservé au setup/teardown des tests. */
export function admin(): SupabaseClient {
  return createClient(TEST_URL, TEST_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `test-admin-${crypto.randomUUID()}`,
    },
  });
}

/** Client anonyme (comme le navigateur). Chaque instance a sa propre clé de stockage. */
export function anon(): SupabaseClient {
  return createClient(TEST_URL, TEST_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `test-${crypto.randomUUID()}`,
    },
  });
}

/**
 * Vrai si la table `public.<name>` existe (via service_role).
 * Sert à n'activer une suite de tests qu'une fois la migration correspondante appliquée.
 */
export async function tableExists(name: string): Promise<boolean> {
  if (!hasDbTestEnv) return false;
  const { error } = await admin().from(name).select('*').limit(1);
  // PGRST205 = table absente du cache de schéma.
  return !error || error.code !== 'PGRST205';
}

const PASSWORD = 'Test-Passw0rd!';

/**
 * Organisation partagée par défaut du fichier de test courant (multi-tenant).
 * Chaque fichier de test = un module vitest neuf → sa propre organisation, dans
 * laquelle tous les utilisateurs / clients créés sans `orgId` explicite sont
 * placés (cas courant : une agence, plusieurs clients). Les tests d'isolation
 * inter-organisations passent un `orgId` explicite.
 */
let _defaultOrgPromise: Promise<string> | null = null;
export function defaultTestOrgId(): Promise<string> {
  // Promesse mémoïsée : des appels concurrents (Promise.all sur createTestUser…)
  // partagent la même organisation au lieu d'en créer plusieurs.
  if (!_defaultOrgPromise) _defaultOrgPromise = createTestOrg('Test Org');
  return _defaultOrgPromise;
}

/** Crée une organisation via service_role, renvoie son id. */
export async function createTestOrg(name = 'Test Org'): Promise<string> {
  const { data, error } = await admin()
    .from('organizations')
    .insert({ name, plan: 'beta' })
    .select('id')
    .single();
  if (error) throw new Error(`createTestOrg a échoué : ${error.message}`);
  return data.id as string;
}

export async function deleteTestOrgs(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await admin().from('organizations').delete().in('id', ids);
}

export interface TestUser {
  id: string;
  email: string;
  organizationId: string;
  /** Client authentifié en tant que cet utilisateur (JWT réel, RLS active). */
  client: SupabaseClient;
}

/**
 * Crée un utilisateur auth confirmé, force son `profiles.role` / `is_active` /
 * `organization_id`, et renvoie un client Supabase connecté en tant que lui.
 */
export async function createTestUser(
  role: 'cm' | 'lead' | 'admin' | 'client',
  opts: { isActive?: boolean; prefix?: string; orgId?: string } = {},
): Promise<TestUser> {
  const isActive = opts.isActive ?? true;
  const orgId = opts.orgId ?? (await defaultTestOrgId());
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

  // Le trigger handle_new_user a créé le profil (role cm, inactif, sans org) — on l'ajuste.
  const upd = await a
    .from('profiles')
    .update({ role, is_active: isActive, organization_id: orgId })
    .eq('id', id);
  if (upd.error) throw new Error(`update profile a échoué : ${upd.error.message}`);

  const client = anon();
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw new Error(`signIn a échoué : ${signIn.error.message}`);

  return { id, email, organizationId: orgId, client };
}

/** Supprime des utilisateurs auth (cascade → profiles, user_clients). */
export async function deleteTestUsers(ids: string[]): Promise<void> {
  const a = admin();
  await Promise.all(ids.map((id) => a.auth.admin.deleteUser(id)));
}

/** Crée un client (table clients) via service_role, renvoie son id. */
export async function createTestClient(name: string, orgId?: string): Promise<string> {
  const organization_id = orgId ?? (await defaultTestOrgId());
  const { data, error } = await admin()
    .from('clients')
    .insert({ name, organization_id })
    .select('id')
    .single();
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

export interface TestContact {
  authUserId: string;
  email: string;
  /** Client Supabase connecté en tant que ce contact (role 'client', RLS active). */
  client: SupabaseClient;
}

/**
 * Crée un contact client via l'Edge Function `invite_contact` (appelée par `inviter`,
 * un lead/admin), lui fixe un mot de passe et renvoie un client Supabase connecté.
 */
export async function createTestContact(
  inviter: TestUser,
  clientId: string,
  fullName = 'Contact',
): Promise<TestContact> {
  const email = `test+contact-${crypto.randomUUID()}@example.test`;
  const inv = await inviter.client.functions.invoke('admin-users', {
    body: { action: 'invite_contact', clientId, fullName, email },
  });
  const authUserId = (inv.data as { contact: { auth_user_id: string } } | null)?.contact
    ?.auth_user_id;
  if (!authUserId) throw new Error(`invite_contact a échoué : ${JSON.stringify(inv.error)}`);
  await admin().auth.admin.updateUserById(authUserId, { password: PASSWORD });

  const client = createClient(TEST_URL, TEST_ANON_KEY, {
    auth: { persistSession: false, storageKey: `test-contact-${crypto.randomUUID()}` },
  });
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw new Error(`signIn contact a échoué : ${signIn.error.message}`);

  return { authUserId, email, client };
}
