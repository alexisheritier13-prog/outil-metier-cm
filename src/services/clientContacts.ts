import { getSupabase } from '@/lib/supabase';
import { setPasswordRedirectUrl } from '@/lib/authRedirect';
import { toClientContact, type ClientContact } from '@/shared/types';

export async function listClientContacts(clientId: string): Promise<ClientContact[]> {
  const { data, error } = await getSupabase()
    .from('client_contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('full_name');
  if (error) throw error;
  return data.map(toClientContact);
}

export async function addClientContact(
  clientId: string,
  fullName: string,
  email: string,
): Promise<ClientContact> {
  const { data, error } = await getSupabase()
    .from('client_contacts')
    .insert({ client_id: clientId, full_name: fullName.trim(), email: email.trim().toLowerCase() })
    .select('*')
    .single();
  if (error) throw error;
  return toClientContact(data);
}

export async function updateClientContact(
  id: string,
  patch: { fullName?: string; email?: string },
): Promise<void> {
  const { error } = await getSupabase()
    .from('client_contacts')
    .update({
      full_name: patch.fullName?.trim(),
      email: patch.email?.trim().toLowerCase(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function setClientContactActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('client_contacts')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function removeClientContact(id: string): Promise<void> {
  const { error } = await getSupabase().from('client_contacts').delete().eq('id', id);
  if (error) throw error;
}

export interface InviteContactResult {
  contact: ClientContact;
  isNewAccount: boolean;
  actionLink: string | null;
  emailed?: boolean;
}

/** Crée (ou lie) un compte de connexion pour un contact, via l'Edge Function. */
export async function inviteClientContact(
  clientId: string,
  fullName: string,
  email: string,
): Promise<InviteContactResult> {
  const { data, error } = await getSupabase().functions.invoke('admin-users', {
    body: {
      action: 'invite_contact',
      clientId,
      fullName,
      email: email.trim().toLowerCase(),
      redirectTo: setPasswordRedirectUrl(),
    },
  });
  if (error) {
    const body = (await readFnError(error)) as { error?: string } | null;
    throw new Error(mapInviteError(body?.error));
  }
  const res = data as {
    contact: unknown;
    isNewAccount: boolean;
    actionLink: string | null;
    emailed?: boolean;
  };
  return {
    contact: toClientContact(res.contact as never),
    isNewAccount: res.isNewAccount,
    actionLink: res.actionLink,
    emailed: res.emailed,
  };
}

async function readFnError(error: unknown): Promise<unknown> {
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

function mapInviteError(code: string | undefined): string {
  switch (code) {
    case 'forbidden':
      return 'Action réservée à un chef de projet ou un directeur.';
    case 'invalid_email':
      return 'Email invalide.';
    case 'client_not_found':
      return 'Client introuvable.';
    case 'email_is_internal_user':
      return 'Cette adresse est déjà celle d’un compte interne (CM, chef de projet ou directeur) : elle ne peut pas aussi servir de contact client. Utilisez une autre adresse pour ce contact.';
    case 'email_in_other_org':
      return 'Cette adresse est déjà utilisée par un compte rattaché à une autre agence.';
    default:
      return "L'invitation a échoué.";
  }
}
