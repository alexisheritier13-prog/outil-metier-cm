// admin-users — opérations sur les comptes qui nécessitent la clé service_role.
//
// Le front ne peut pas créer d'utilisateur `auth.users`. Cette fonction :
//   1. vérifie le rôle de l'appelant (via son JWT)
//   2. exécute l'action demandée avec la clé service_role
//
// Actions :
//   - "create"          : créer un compte interne (cm/lead/admin) — appelant = admin
//   - "invite_contact"  : créer/lier un compte pour un contact client — appelant = lead/admin
//   - "update_user"     : changer l'email et/ou le mot de passe d'un compte — appelant = admin
//                         (option `sendLink` : renvoie un lien de définition de mot de passe)
//   - "invite_org"      : inviter une agence (crée le compte + l'invitation) — appelant = platform_admin
//
// Multi-tenant : chaque compte est rattaché à une `organization_id`. Un Directeur
// n'agit que sur sa propre organisation ; la création d'organisation passe par
// "invite_org" (réservé aux administrateurs plateforme).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'Cadence <onboarding@resend.dev>';
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');

const INTERNAL_ROLES = ['cm', 'lead', 'admin'] as const;

/** Envoie le lien d'accès par e-mail si Resend est configuré. Best-effort. */
async function sendInviteEmail(to: string, link: string): Promise<boolean> {
  if (!RESEND_API_KEY || !link) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject: 'Votre accès à Cadence',
        html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1c22">
          <p style="font-size:15px;line-height:1.5">Un accès a été créé pour vous sur Cadence.</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#2f5fe0;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Définir mon mot de passe</a></p>
          <p style="color:#6b6b78;font-size:12px;margin-top:32px">Cadence</p>
        </div>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'missing_token' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: 'invalid_token' });

  const { data: me } = await admin
    .from('profiles')
    .select('role, is_active, organization_id')
    .eq('id', userData.user.id)
    .single();
  if (!me || !me.is_active) return json(403, { error: 'forbidden' });

  const { data: platformRow } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  const isPlatformAdmin = Boolean(platformRow);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const action = payload.action;

  // ─────────────────────────── create (interne) ───────────────────────────
  if (action === 'create') {
    if (me.role !== 'admin') return json(403, { error: 'forbidden' });
    if (!me.organization_id) return json(403, { error: 'no_organization' });

    const email = String(payload.email ?? '').trim().toLowerCase();
    const fullName = String(payload.fullName ?? '').trim();
    const role = payload.role as string;
    const activate = Boolean(payload.activate);
    if (!email.includes('@')) return json(400, { error: 'invalid_email' });
    if (!INTERNAL_ROLES.includes(role as never)) return json(400, { error: 'invalid_role' });

    const created = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + 'aA1!',
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (created.error || !created.data.user) {
      const msg = created.error?.message ?? '';
      return json(422, {
        error: /already registered|exists/i.test(msg) ? 'email_taken' : 'create_failed',
        detail: msg,
      });
    }
    const id = created.data.user.id;
    const { data: updated, error: updErr } = await admin
      .from('profiles')
      .update({
        full_name: fullName,
        role,
        is_active: activate,
        organization_id: me.organization_id,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updErr) {
      await admin.auth.admin.deleteUser(id);
      return json(500, { error: 'profile_update_failed', detail: updErr.message });
    }
    const redirectTo = payload.redirectTo ? String(payload.redirectTo) : undefined;
    const { data: link } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    const createdLink = link?.properties?.action_link ?? null;
    const emailed = createdLink ? await sendInviteEmail(email, createdLink) : false;
    return json(201, { profile: updated, actionLink: createdLink, emailed });
  }

  // ───────────────────────── update_user (email / mot de passe) ─────────────────────────
  if (action === 'update_user') {
    if (me.role !== 'admin') return json(403, { error: 'forbidden' });

    const userId = String(payload.userId ?? '');
    if (!userId) return json(400, { error: 'missing_user' });

    // Le Directeur n'agit que sur des comptes de sa propre organisation.
    const { data: target } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();
    if (!target) return json(404, { error: 'user_not_found' });
    if (!isPlatformAdmin && target.organization_id !== me.organization_id) {
      return json(403, { error: 'forbidden' });
    }
    const email =
      payload.email != null ? String(payload.email).trim().toLowerCase() : undefined;
    const password = payload.password != null ? String(payload.password) : undefined;
    const sendLink = Boolean(payload.sendLink);
    const redirectTo = payload.redirectTo ? String(payload.redirectTo) : undefined;

    if (email !== undefined && !email.includes('@')) return json(400, { error: 'invalid_email' });
    if (password !== undefined && password.length < 8) return json(400, { error: 'weak_password' });

    const patch: Record<string, unknown> = {};
    if (email !== undefined) {
      patch.email = email;
      patch.email_confirm = true;
    }
    if (password !== undefined) patch.password = password;

    if (Object.keys(patch).length > 0) {
      const upd = await admin.auth.admin.updateUserById(userId, patch);
      if (upd.error) {
        const msg = upd.error.message ?? '';
        return json(422, {
          error: /already registered|exists|been registered/i.test(msg)
            ? 'email_taken'
            : 'update_failed',
          detail: msg,
        });
      }
      if (email !== undefined) {
        await admin.from('profiles').update({ email }).eq('id', userId);
        await admin.from('client_contacts').update({ email }).eq('auth_user_id', userId);
      }
    }

    let actionLink: string | null = null;
    if (sendLink) {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const targetEmail = email ?? u.user?.email ?? '';
      if (targetEmail) {
        const { data: link } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: targetEmail,
          options: redirectTo ? { redirectTo } : undefined,
        });
        actionLink = link?.properties?.action_link ?? null;
      }
    }
    return json(200, { ok: true, actionLink });
  }

  // ───────────────────────── invite_contact (client) ─────────────────────────
  if (action === 'invite_contact') {
    if (me.role !== 'admin' && me.role !== 'lead') return json(403, { error: 'forbidden' });
    if (!me.organization_id) return json(403, { error: 'no_organization' });

    const clientId = String(payload.clientId ?? '');
    const email = String(payload.email ?? '').trim().toLowerCase();
    const fullName = String(payload.fullName ?? '').trim();
    if (!clientId) return json(400, { error: 'missing_client' });
    if (!email.includes('@')) return json(400, { error: 'invalid_email' });

    const { data: client } = await admin
      .from('clients')
      .select('id, organization_id')
      .eq('id', clientId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!client) return json(404, { error: 'client_not_found' });
    if (client.organization_id !== me.organization_id) return json(403, { error: 'forbidden' });

    // Trouver un compte auth existant pour cet email, sinon en créer un.
    const existing = await admin.auth.admin.listUsers({ perPage: 200 });
    let authUserId = existing.data.users.find(
      (u) => (u.email ?? '').toLowerCase() === email,
    )?.id;
    let isNew = false;

    if (!authUserId) {
      const created = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + 'aA1!',
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (created.error || !created.data.user) {
        return json(422, { error: 'create_failed', detail: created.error?.message ?? '' });
      }
      authUserId = created.data.user.id;
      isNew = true;
    }

    // Un compte déjà rattaché à une autre organisation ne peut pas être réutilisé.
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', authUserId)
      .maybeSingle();
    if (
      existingProfile?.organization_id &&
      existingProfile.organization_id !== client.organization_id
    ) {
      return json(409, { error: 'email_in_other_org' });
    }
    // Cette adresse est déjà celle d'un compte interne (CM / chef de projet /
    // directeur) — même dans la même organisation. La transformer en contact
    // client écraserait son rôle interne et le bloquerait côté agence.
    if (
      existingProfile &&
      (INTERNAL_ROLES as readonly string[]).includes(existingProfile.role ?? '')
    ) {
      return json(409, { error: 'email_is_internal_user' });
    }

    // Le profil doit être 'client' + actif + rattaché à l'organisation du client.
    await admin
      .from('profiles')
      .update({
        role: 'client',
        is_active: true,
        full_name: fullName,
        organization_id: client.organization_id,
      })
      .eq('id', authUserId);

    // Upsert du contact.
    const { data: contact, error: cErr } = await admin
      .from('client_contacts')
      .upsert(
        {
          client_id: clientId,
          email,
          full_name: fullName,
          auth_user_id: authUserId,
          is_active: true,
        },
        { onConflict: 'client_id,email' },
      )
      .select('*')
      .single();
    if (cErr) return json(500, { error: 'contact_upsert_failed', detail: cErr.message });

    const redirectTo = payload.redirectTo ? String(payload.redirectTo) : undefined;
    const { data: link } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    const contactLink = link?.properties?.action_link ?? null;
    const emailed = contactLink ? await sendInviteEmail(email, contactLink) : false;
    return json(201, {
      contact,
      isNewAccount: isNew,
      actionLink: contactLink,
      emailed,
    });
  }

  // ───────────────────────── invite_org (agence — platform admin) ─────────────────────────
  if (action === 'invite_org') {
    if (!isPlatformAdmin) return json(403, { error: 'forbidden' });

    const email = String(payload.email ?? '').trim().toLowerCase();
    const orgName = String(payload.orgName ?? '').trim();
    const fullName = String(payload.fullName ?? '').trim();
    if (!email.includes('@')) return json(400, { error: 'invalid_email' });
    if (!orgName) return json(400, { error: 'missing_org_name' });

    // Compte auth (créé si absent). On ne rattache aucune organisation :
    // `accept_org_invitation` le fera à l'acceptation.
    const existing = await admin.auth.admin.listUsers({ perPage: 200 });
    let authUserId = existing.data.users.find(
      (u) => (u.email ?? '').toLowerCase() === email,
    )?.id;
    if (!authUserId) {
      const created = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + 'aA1!',
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (created.error || !created.data.user) {
        return json(422, { error: 'create_failed', detail: created.error?.message ?? '' });
      }
      authUserId = created.data.user.id;
    } else {
      const { data: p } = await admin
        .from('profiles')
        .select('organization_id')
        .eq('id', authUserId)
        .maybeSingle();
      if (p?.organization_id) return json(409, { error: 'already_in_org' });
    }

    const { data: invite, error: invErr } = await admin
      .from('org_invitations')
      .insert({
        email,
        org_name: orgName,
        full_name: fullName,
        invited_by: userData.user.id,
      })
      .select('token')
      .single();
    if (invErr || !invite) return json(500, { error: 'invite_failed', detail: invErr?.message });

    const redirectTo = APP_URL ? `${APP_URL}/rejoindre/${invite.token}` : undefined;
    const { data: link } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    const actionLink = link?.properties?.action_link ?? null;

    let emailed = false;
    if (actionLink && RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: email,
            subject: `Votre espace Cadence pour ${orgName}`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1c22">
              <p style="font-size:15px;line-height:1.5">Bonjour${fullName ? ' ' + fullName : ''},</p>
              <p style="font-size:15px;line-height:1.5">Votre espace Cadence pour <strong>${orgName}</strong> est prêt. Cliquez pour choisir votre mot de passe et finaliser la configuration.</p>
              <p style="margin:24px 0"><a href="${actionLink}" style="background:#2f5fe0;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Activer mon compte</a></p>
              <p style="color:#6b6b78;font-size:12px;margin-top:32px">Cadence</p>
            </div>`,
          }),
        });
        emailed = res.ok;
      } catch {
        emailed = false;
      }
    }

    return json(201, { token: invite.token, actionLink, emailed });
  }

  return json(400, { error: 'unknown_action' });
});
