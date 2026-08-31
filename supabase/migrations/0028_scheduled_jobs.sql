-- 0028 — ordonnancement des jobs (Story 8.4).
--
-- pg_cron : generate_alerts chaque nuit (règles a–f) + toutes les heures en journée
-- (règle g, rappel jour J), purge_trash chaque nuit. Un échec de job notifie les Admins.

create extension if not exists pg_cron;

do $$
declare j text;
begin
  foreach j in array array['generate-alerts', 'generate-alerts-hourly', 'purge-trash'] loop
    begin perform cron.unschedule(j); exception when others then null; end;
  end loop;
end $$;

select cron.schedule('generate-alerts', '15 2 * * *', $$select public.generate_alerts();$$);
select cron.schedule('generate-alerts-hourly', '5 7-20 * * *', $$select public.generate_alerts();$$);
select cron.schedule('purge-trash', '30 3 * * *', $$select public.purge_trash();$$);

-- ─────────────  Échec de job → notification aux Admins  ─────────────
create or replace function public.job_runs_notify_failure()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ok is false and old.ok is distinct from new.ok then
    insert into public.notifications (user_id, type, body)
    select p.id, 'job_failed',
      'Le job « ' || new.job_name || ' » a échoué : ' || coalesce(new.error, 'erreur inconnue')
    from public.profiles p
    where p.role = 'admin' and p.is_active;
  end if;
  return new;
end $$;

drop trigger if exists job_runs_notify_failure_trg on public.job_runs;
create trigger job_runs_notify_failure_trg after update on public.job_runs
  for each row execute function public.job_runs_notify_failure();

-- Déclenchement manuel de la purge (Admin) — bouton « Purger maintenant ».
create or replace function public.trigger_purge_trash()
returns public.job_runs language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role() <> 'admin' then
    raise exception 'réservé à l''Admin' using errcode = '42501';
  end if;
  return public.purge_trash();
end $$;

grant execute on function public.trigger_purge_trash() to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 28, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
