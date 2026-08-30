// admin-users — opérations sur les comptes réservées à l'Admin agence.
//
// Le front ne peut pas créer d'utilisateur `auth.users` (clé service_role interdite côté
// navigateur). Cette fonction :
//   1. vérifie que l'appelant est un `admin` actif (via son JWT)
//   2. exécute l'action demandée avec la clé service_role
//
// Actions : "create" (créer un compte interne), "reset_password" (générer un lien).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ROLES = ['cm', 'lead', 'admin'] as const;
type InternalRole = (typeof ROLES)[number];

interface CreatePayload {
  action: 'create';
  email: string;
  fullName: string;
  role: InternalRole;
  activate: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'missing_token' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Identifier l'appelant et vérifier son rôle.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: 'invalid_token' });

  const { data: profile } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', userData.user.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    return json(403, { error: 'forbidden' });
  }

  // 2. Exécuter l'action.
  let payload: CreatePayload;
  try {
    payload = (await req.json()) as CreatePayload;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  if (payload.action !== 'create') return json(400, { error: 'unknown_action' });

  const email = (payload.email ?? '').trim().toLowerCase();
  const fullName = (payload.fullName ?? '').trim();
  if (!email || !email.includes('@')) return json(400, { error: 'invalid_email' });
  if (!ROLES.includes(payload.role)) return json(400, { error: 'invalid_role' });

  const tempPassword = crypto.randomUUID() + 'aA1!';
  const created = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? 'create_failed';
    const code = /already registered|exists/i.test(msg) ? 'email_taken' : 'create_failed';
    return json(422, { error: code, detail: msg });
  }

  const id = created.data.user.id;
  // Le trigger handle_new_user a créé le profil ; on applique nom / rôle / activation.
  const { data: updated, error: updErr } = await admin
    .from('profiles')
    .update({ full_name: fullName, role: payload.role, is_active: Boolean(payload.activate) })
    .eq('id', id)
    .select('*')
    .single();

  if (updErr) {
    await admin.auth.admin.deleteUser(id); // rollback
    return json(500, { error: 'profile_update_failed', detail: updErr.message });
  }

  // Lien de définition de mot de passe (à transmettre manuellement en v1, pas d'email).
  const { data: link } = await admin.auth.admin.generateLink({ type: 'recovery', email });

  return json(201, {
    profile: updated,
    actionLink: link?.properties?.action_link ?? null,
  });
});
