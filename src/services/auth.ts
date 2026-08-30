import { getSupabase } from '@/lib/supabase';
import { toProfile, type Profile } from '@/shared/types';

export class AccountDisabledError extends Error {
  constructor() {
    super('Ce compte est désactivé. Contactez un administrateur.');
    this.name = 'AccountDisabledError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Email ou mot de passe incorrect.');
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Connexion. Vérifie aussi que le profil est actif : un compte désactivé est
 * déconnecté immédiatement et l'appel échoue avec `AccountDisabledError`.
 */
export async function signIn(email: string, password: string): Promise<Profile> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    throw new InvalidCredentialsError();
  }

  const profile = await fetchProfile(data.user.id);
  if (!profile || !profile.isActive) {
    await supabase.auth.signOut();
    throw new AccountDisabledError();
  }
  return profile;
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

/** Session courante (ou null). */
export async function getSessionUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.user.id ?? null;
}

/** Profil applicatif d'un utilisateur (RLS : chacun lit le sien). */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toProfile(data) : null;
}

/** Profil de l'utilisateur connecté, ou null si pas de session / profil inactif. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const profile = await fetchProfile(userId);
  if (!profile || !profile.isActive) {
    await getSupabase().auth.signOut();
    return null;
  }
  return profile;
}
