import { getSupabase } from '@/lib/supabase';

/**
 * Invitations d'agence (inscription sur invitation, beta multi-tenant).
 * L'émission passe par l'Edge Function `admin-users` action `invite_org`
 * (réservée aux administrateurs plateforme). L'acceptation crée l'organisation
 * et rattache le compte de l'invité comme Directeur.
 */

export interface OrgInvitation {
  email: string;
  orgName: string;
  fullName: string;
  expired: boolean;
  accepted: boolean;
}

/** Lit une invitation par jeton (RPC publique, pré-remplit l'écran /rejoindre). */
export async function fetchOrgInvitation(token: string): Promise<OrgInvitation | null> {
  const { data, error } = await getSupabase().rpc('org_invitation_by_token', { p_token: token });
  if (error) throw error;
  if (!data) return null;
  const v = data as {
    email: string;
    orgName: string;
    fullName: string;
    expired: boolean;
    accepted: boolean;
  };
  return {
    email: v.email,
    orgName: v.orgName,
    fullName: v.fullName ?? '',
    expired: Boolean(v.expired),
    accepted: Boolean(v.accepted),
  };
}

export interface AcceptOrgResult {
  organizationId: string;
  organizationName: string;
}

/** Accepte l'invitation : crée l'organisation + rattache le compte connecté. */
export async function acceptOrgInvitation(
  token: string,
  fullName: string,
  orgName: string,
): Promise<AcceptOrgResult> {
  const { data, error } = await getSupabase().rpc('accept_org_invitation', {
    p_token: token,
    p_full_name: fullName.trim() || undefined,
    p_org_name: orgName.trim() || undefined,
  });
  if (error) throw error;
  const v = data as { organizationId: string; organizationName: string };
  return { organizationId: v.organizationId, organizationName: v.organizationName };
}

export interface InviteOrgResult {
  token: string;
  actionLink: string | null;
  emailed: boolean;
}

/** Émet une invitation d'agence (administrateur plateforme uniquement). */
export async function inviteOrganization(
  email: string,
  orgName: string,
  fullName = '',
): Promise<InviteOrgResult> {
  const { data, error } = await getSupabase().functions.invoke('admin-users', {
    body: { action: 'invite_org', email, orgName, fullName },
  });
  if (error) throw new Error('Émission de l’invitation impossible.');
  const v = data as { token: string; actionLink: string | null; emailed?: boolean };
  return { token: v.token, actionLink: v.actionLink, emailed: Boolean(v.emailed) };
}
