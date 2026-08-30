import { getSupabase } from '@/lib/supabase';
import { toProfile, toClient, type Profile, type Client } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';

export type InternalRole = Extract<Role, 'cm' | 'lead' | 'admin'>;

/** Tous les utilisateurs internes (hors contacts client). RLS : admin uniquement. */
export async function listInternalUsers(): Promise<Profile[]> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .in('role', ['cm', 'lead', 'admin'])
    .order('full_name');
  if (error) throw error;
  return data.map(toProfile);
}

/** Clients non supprimés, pour le sélecteur d'assignation. */
export async function listAssignableClients(): Promise<Client[]> {
  const { data, error } = await getSupabase()
    .from('clients')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data.map(toClient);
}

/** Ids des clients assignés à un utilisateur. */
export async function getUserClientIds(profileId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('user_clients')
    .select('client_id')
    .eq('profile_id', profileId);
  if (error) throw error;
  return data.map((r) => r.client_id);
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  role: InternalRole;
  activate: boolean;
}

export interface CreateUserResult {
  profile: Profile;
  /** Lien à transmettre à l'utilisateur pour définir son mot de passe (pas d'email en v1). */
  actionLink: string | null;
}

/** Crée un compte interne via l'Edge Function `admin-users` (service_role côté serveur). */
export async function createInternalUser(input: CreateUserInput): Promise<CreateUserResult> {
  const { data, error } = await getSupabase().functions.invoke('admin-users', {
    body: { action: 'create', ...input },
  });
  if (error) {
    // supabase-js renvoie une FunctionsHttpError ; on tente de lire le corps.
    const body = (await tryReadError(error)) as { error?: string } | null;
    throw new Error(mapCreateError(body?.error));
  }
  const res = data as { profile: unknown; actionLink: string | null };
  return { profile: toProfile(res.profile as never), actionLink: res.actionLink };
}

export async function updateUserRole(id: string, role: InternalRole): Promise<void> {
  const { error } = await getSupabase().from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function setUserActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await getSupabase().from('profiles').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

/** Remplace la liste des clients assignés à un utilisateur. */
export async function setUserClientIds(profileId: string, clientIds: string[]): Promise<void> {
  const supabase = getSupabase();
  const del = await supabase.from('user_clients').delete().eq('profile_id', profileId);
  if (del.error) throw del.error;
  if (clientIds.length === 0) return;
  const ins = await supabase
    .from('user_clients')
    .insert(clientIds.map((client_id) => ({ profile_id: profileId, client_id })));
  if (ins.error) throw ins.error;
}

async function tryReadError(error: unknown): Promise<unknown> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      return await ctx.json();
    } catch {
      return null;
    }
  }
  return null;
}

function mapCreateError(code: string | undefined): string {
  switch (code) {
    case 'email_taken':
      return 'Un compte existe déjà avec cet email.';
    case 'invalid_email':
      return 'Email invalide.';
    case 'invalid_role':
      return 'Rôle invalide.';
    case 'forbidden':
      return 'Action réservée à un administrateur.';
    default:
      return 'La création du compte a échoué.';
  }
}
