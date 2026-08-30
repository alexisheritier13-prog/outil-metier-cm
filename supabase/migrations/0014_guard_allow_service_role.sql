-- 0014 — la garde anti-UPDATE direct (statut / deleted_at) ne vise que les rôles clients
-- (anon / authenticated). `service_role` et `postgres` (RPC SECURITY DEFINER, jobs, back-office)
-- sont de confiance.

create or replace function public.posts_guard_status_update()
returns trigger language plpgsql as $$
begin
  if current_user not in ('postgres', 'service_role') then
    if new.status is distinct from old.status then
      raise exception 'changez le statut via post_change_status()' using errcode = '42501';
    end if;
    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'utilisez post_trash() / post_restore()' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 14, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
