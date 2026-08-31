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
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const INTERNAL_ROLES = ['cm', 'lead', 'admin'] as const;

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
    .select('role, is_active')
    .eq('id', userData.user.id)
    .single();
  if (!me || !me.is_active) return json(403, { error: 'forbidden' });

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
      .update({ full_name: fullName, role, is_active: activate })
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
    return json(201, { profile: updated, actionLink: link?.properties?.action_link ?? null });
  }

  // ───────────────────────── update_user (email / mot de passe) ─────────────────────────
  if (action === 'update_user') {
    if (me.role !== 'admin') return json(403, { error: 'forbidden' });

    const userId = String(payload.userId ?? '');
    if (!userId) return json(400, { error: 'missing_user' });
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

    const clientId = String(payload.clientId ?? '');
    const email = String(payload.email ?? '').trim().toLowerCase();
    const fullName = String(payload.fullName ?? '').trim();
    if (!clientId) return json(400, { error: 'missing_client' });
    if (!email.includes('@')) return json(400, { error: 'invalid_email' });

    const { data: client } = await admin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!client) return json(404, { error: 'client_not_found' });

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

    // Le profil doit être 'client' + actif.
    await admin
      .from('profiles')
      .update({ role: 'client', is_active: true, full_name: fullName })
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
    return json(201, {
      contact,
      isNewAccount: isNew,
      actionLink: link?.properties?.action_link ?? null,
    });
  }

  return json(400, { error: 'unknown_action' });
});
