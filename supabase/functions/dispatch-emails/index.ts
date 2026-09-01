// dispatch-emails — envoie un e-mail pour les notifications non encore notifiées.
//
// Appelée toutes les minutes par pg_cron (déployée avec --no-verify-jwt). Sans
// `RESEND_API_KEY` configurée, la fonction ne fait rien (les notifications
// in-app restent la source de vérité). Variables d'environnement :
//   RESEND_API_KEY   clé API Resend
//   EMAIL_FROM       ex. "Cadence <no-reply@votre-domaine.fr>"
//   APP_URL          ex. "https://app.votre-domaine.fr" (sans / final)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'Cadence <onboarding@resend.dev>';
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');

const SUBJECTS: Record<string, string> = {
  post_submitted: 'Un post est à valider en interne',
  post_internal_approved: 'Votre post a été validé en interne',
  post_returned: 'Votre post a été renvoyé pour correction',
  post_client_approved: 'Un post a été approuvé',
  post_client_rejected: 'Une modification a été demandée',
  post_awaiting_client: 'Un post attend votre validation',
  comment_client: 'Nouveau commentaire du client',
  comment_agency: 'Nouveau commentaire de votre agence',
  comment_internal: 'Nouveau commentaire interne',
  job_failed: 'Un job a échoué',
};

async function sendEmail(to: string, subject: string, body: string, link: string) {
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1c22">
      <p style="font-size:15px;line-height:1.5">${body}</p>
      ${
        link
          ? `<p style="margin:24px 0"><a href="${link}" style="background:#2f5fe0;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Ouvrir</a></p>`
          : ''
      }
      <p style="color:#6b6b78;font-size:12px;margin-top:32px">Cadence</p>
    </div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!RESEND_API_KEY) return json(200, { skipped: 'no RESEND_API_KEY', sent: 0 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from('notifications')
    .select('id, user_id, type, post_id, client_id, body')
    .is('email_sent_at', null)
    .gte('created_at', since)
    .in('type', Object.keys(SUBJECTS))
    .limit(50);
  if (error) return json(500, { error: error.message });

  let sent = 0;
  for (const n of rows ?? []) {
    const { data: prof } = await admin
      .from('profiles')
      .select('email, role, is_active')
      .eq('id', n.user_id)
      .single();
    const email = prof?.email;

    // On marque traité même si on ne peut pas envoyer (compte inactif, pas d'email).
    let ok = false;
    if (email && prof?.is_active && APP_URL) {
      let link = `${APP_URL}/app`;
      if (prof.role === 'client') {
        if (n.type === 'post_awaiting_client' && n.post_id) {
          const { data: tok } = await admin
            .from('post_approval_tokens')
            .select('token')
            .eq('post_id', n.post_id)
            .maybeSingle();
          link = tok ? `${APP_URL}/valider/${tok.token}` : `${APP_URL}/portail/a-valider`;
        } else {
          link = `${APP_URL}/portail`;
        }
      } else if (n.post_id) {
        link = `${APP_URL}/app/planning?post=${n.post_id}`;
      } else if (n.type === 'job_failed') {
        link = `${APP_URL}/app/parametres/jobs`;
      }
      try {
        ok = await sendEmail(email, SUBJECTS[n.type] ?? 'Cadence', n.body, link);
      } catch {
        ok = false;
      }
    }
    await admin
      .from('notifications')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', n.id);
    if (ok) sent += 1;
  }

  return json(200, { processed: rows?.length ?? 0, sent });
});
