-- 0039 — publication automatique des posts arrivés à échéance.
--
-- Optionnel : `app_settings.account -> auto_publish`. Quand actif, un job
-- `pg_cron` (toutes les 10 min) passe les posts `scheduled` dont l'heure est
-- passée en `published`. Le passage manuel reste possible dans tous les cas.

create or replace function public.auto_publish_due()
returns public.job_runs language plpgsql security definer set search_path = public as $$
declare
  v_run public.job_runs;
  v_on boolean;
  v_count int := 0;
begin
  insert into public.job_runs (job_name) values ('auto_publish') returning * into v_run;

  select coalesce((value ->> 'auto_publish')::boolean, false)
  into v_on
  from public.app_settings where key = 'account';

  if coalesce(v_on, false) then
    update public.posts
      set status = 'published'
    where status = 'scheduled'
      and deleted_at is null
      and scheduled_at <= now();
    get diagnostics v_count = row_count;
  end if;

  update public.job_runs
    set finished_at = now(), ok = true,
        stats = jsonb_build_object('published', v_count, 'enabled', coalesce(v_on, false))
    where id = v_run.id returning * into v_run;
  return v_run;
end $$;

do $$
begin
  begin perform cron.unschedule('auto-publish'); exception when others then null; end;
end $$;
select cron.schedule('auto-publish', '*/10 * * * *', $$select public.auto_publish_due();$$);

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 39, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
