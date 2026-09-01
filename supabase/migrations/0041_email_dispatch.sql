-- 0041 — envoi d'e-mails pour les notifications (via Edge Function `dispatch-emails`).
--
-- `pg_net` déclenche la fonction toutes les minutes. Tant que `RESEND_API_KEY`
-- n'est pas configurée côté Supabase, la fonction ne fait rien (les
-- notifications in-app restent complètes).
--
-- ⚠️ Après avoir appliqué : déployer la fonction et configurer les secrets
--   supabase functions deploy dispatch-emails --no-verify-jwt
--   supabase secrets set RESEND_API_KEY=... EMAIL_FROM='Cadence <no-reply@dom>' APP_URL=https://app.dom

create extension if not exists pg_net;

alter table public.notifications add column if not exists email_sent_at timestamptz;

do $$
begin
  begin perform cron.unschedule('dispatch-emails'); exception when others then null; end;
end $$;

select cron.schedule(
  'dispatch-emails',
  '* * * * *',
  $$select net.http_post(
      url := 'https://vevdhfyyjwntxvajtlud.supabase.co/functions/v1/dispatch-emails',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := '{}'::jsonb
  );$$
);

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 41, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
