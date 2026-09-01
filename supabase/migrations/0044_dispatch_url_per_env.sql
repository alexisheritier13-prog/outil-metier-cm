-- 0044 — le cron `dispatch-emails` lit l'URL des Edge Functions dans un réglage
-- (au lieu de l'URL de staging codée en dur dans 0041).
--
-- Après `db:apply` sur un NOUVEAU projet, poser l'URL du projet :
--   insert into public.app_settings (key, value)
--   values ('edge_base_url', jsonb_build_object('url', 'https://<ref>.supabase.co'))
--   on conflict (key) do update set value = excluded.value;
-- Sans cette ligne, le tick d'envoi d'e-mails ne fait rien (notifications in-app
-- toujours complètes).

create or replace function public.dispatch_emails_tick()
returns void language plpgsql security definer set search_path = public as $$
declare v_url text;
begin
  select value ->> 'url' into v_url from public.app_settings where key = 'edge_base_url';
  if coalesce(v_url, '') = '' then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/dispatch-emails',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end $$;

do $$
begin
  begin perform cron.unschedule('dispatch-emails'); exception when others then null; end;
end $$;

select cron.schedule('dispatch-emails', '* * * * *', $$select public.dispatch_emails_tick();$$);

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 44, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
