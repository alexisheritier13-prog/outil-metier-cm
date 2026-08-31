-- 0031 — mode « CM seul » : la validation interne devient optionnelle.
--
-- Quand `app_settings.workflow.skip_internal_review = true`, un CM peut envoyer
-- un brouillon directement en « à valider client » (transition draft →
-- client_review), sans passer par un Lead. Le reste du circuit est inchangé.
-- Réglage réservé à l'Admin (RLS `app_settings_admin_write`).

insert into public.app_settings (key, value)
values ('workflow', jsonb_build_object('skip_internal_review', false))
on conflict (key) do nothing;

create or replace function public.workflow_skips_internal()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value ->> 'skip_internal_review')::boolean
     from public.app_settings where key = 'workflow'),
    false
  )
$$;

-- `can_transition` = table statique OR la règle dynamique du mode « CM seul ».
create or replace function public.can_transition(
  p_from public.post_status_t,
  p_to public.post_status_t,
  p_role public.role_t
) returns boolean language sql stable as $$
  select exists (
    select 1 from public.post_transitions t
    where t.from_status = p_from
      and t.to_status = p_to
      and p_role = any (t.roles)
  )
  or (
    public.workflow_skips_internal()
    and p_from = 'draft'
    and p_to = 'client_review'
    and p_role = any (array['cm','lead','admin']::public.role_t[])
  )
$$;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 31, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
