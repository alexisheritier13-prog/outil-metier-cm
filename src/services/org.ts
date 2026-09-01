import { getSupabase } from '@/lib/supabase';

/**
 * Organisation (locataire) de l'utilisateur connecté. La RLS scope déjà toutes
 * les tables métier sur cette organisation ; on n'en a besoin explicitement que
 * pour écrire dans `org_settings` (clé primaire composite, sans défaut).
 *
 * `null` = compte pas encore rattaché à une agence (avant `/rejoindre`).
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const { data, error } = await getSupabase().rpc('auth_org');
  if (error) throw error;
  return (data as string | null) ?? null;
}

export class NoOrganizationError extends Error {
  constructor() {
    super('Ce compte n’est rattaché à aucune organisation.');
    this.name = 'NoOrganizationError';
  }
}

/** Comme `getCurrentOrgId` mais lève si l'utilisateur n'a pas d'organisation. */
export async function requireOrgId(): Promise<string> {
  const id = await getCurrentOrgId();
  if (!id) throw new NoOrganizationError();
  return id;
}
