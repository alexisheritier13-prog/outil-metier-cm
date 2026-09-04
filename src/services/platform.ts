import { getSupabase } from '@/lib/supabase';

/**
 * Fonctions « super-admin plateforme » : lister les agences, générer des liens
 * d'invitation. Toutes gardées côté SQL par `is_platform_admin()`.
 */

export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_platform_admin');
  if (error) return false;
  return Boolean(data);
}

export interface PlatformOrg {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  members: number;
  clients: number;
  posts: number;
  lastActivityAt: string;
}

export async function listPlatformOrgs(): Promise<PlatformOrg[]> {
  const { data, error } = await getSupabase().rpc('platform_list_organizations');
  if (error) throw error;
  return ((data as PlatformOrg[] | null) ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    plan: o.plan,
    createdAt: o.createdAt,
    ownerName: o.ownerName || null,
    ownerEmail: o.ownerEmail || null,
    members: Number(o.members ?? 0),
    clients: Number(o.clients ?? 0),
    posts: Number(o.posts ?? 0),
    lastActivityAt: o.lastActivityAt,
  }));
}

/**
 * Supprime tout le contenu d'une agence et détache ses membres, qui repassent
 * à un état « jamais rien fait » (comptes conservés, ré-invitables).
 */
export async function resetOrganization(orgId: string): Promise<void> {
  const { error } = await getSupabase().rpc('platform_reset_organization', { p_org: orgId });
  if (error) throw error;
}

/** Révoque un lien d'invitation pas encore accepté. */
export async function revokeInvitation(token: string): Promise<void> {
  const { error } = await getSupabase().rpc('platform_revoke_invitation', { p_token: token });
  if (error) throw error;
}

export interface PlatformInvitation {
  token: string;
  orgName: string;
  email: string | null;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  accepted: boolean;
}

export async function listPlatformInvitations(): Promise<PlatformInvitation[]> {
  const { data, error } = await getSupabase().rpc('platform_list_invitations');
  if (error) throw error;
  return ((data as PlatformInvitation[] | null) ?? []).map((i) => ({
    token: i.token,
    orgName: i.orgName,
    email: i.email ?? null,
    createdAt: i.createdAt,
    expiresAt: i.expiresAt,
    expired: Boolean(i.expired),
    accepted: Boolean(i.accepted),
  }));
}

/** Génère une invitation. `email` optionnel : sans lui, n'importe qui avec le lien crée son agence. */
export async function createInvitation(
  orgName: string,
  email?: string,
  fullName?: string,
): Promise<{ token: string }> {
  const { data, error } = await getSupabase().rpc('create_org_invitation', {
    p_org_name: orgName.trim(),
    p_email: email?.trim() || undefined,
    p_full_name: fullName?.trim() || undefined,
  });
  if (error) throw error;
  return { token: (data as { token: string }).token };
}

/** URL complète du lien d'invitation à transmettre. */
export function invitationUrl(token: string): string {
  return `${window.location.origin}/rejoindre/${token}`;
}
