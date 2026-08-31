-- 0017 — notifications in-app (fondation) + émission aux étapes du workflow de validation.
--
-- La page Alertes, le badge de navigation, les seuils configurables et le job
-- `generate_alerts` = Epic 8. Ici on crée seulement la table + le helper `notify()`,
-- et on émet une entrée aux moments clés (Story 5.1 : soumission / validation interne /
-- renvoi au rédacteur). Les RPC client (Story 5.3) émettront à leur tour.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- post_submitted | post_internal_approved | post_returned
  -- | post_client_approved | post_client_rejected (Story 5.3)
  type text not null,
  post_id uuid references public.posts (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Lecture / mise à jour (marquer lu) : sa propre notification uniquement.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Pas d'insert / delete direct : l'émission passe par des fonctions SECURITY DEFINER.

-- ─────────────────────────  Helper d'émission  ─────────────────────────
create or replace function public.notify(
  p_user_id uuid,
  p_type text,
  p_body text,
  p_post_id uuid default null,
  p_client_id uuid default null,
  p_actor_id uuid default null
) returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, body, post_id, client_id, actor_id)
  select p_user_id, p_type, p_body, p_post_id, p_client_id, coalesce(p_actor_id, auth.uid())
  where p_user_id is not null
    -- on ne se notifie jamais soi-même
    and p_user_id is distinct from coalesce(p_actor_id, auth.uid());
$$;

-- ─────────────  post_change_status : + émission de notifications  ─────────────
create or replace function public.post_change_status(
  p_post_id uuid,
  p_to public.post_status_t,
  p_comment text default null
) returns public.posts language plpgsql security definer set search_path = public as $$
declare
  v_post public.posts;
  v_role public.role_t := public.auth_role();
  v_from public.post_status_t;
begin
  if v_role not in ('cm','lead','admin') then
    raise exception 'transition réservée aux rôles internes' using errcode = '42501';
  end if;

  select * into v_post from public.posts where id = p_post_id and deleted_at is null for update;
  if not found then raise exception 'post introuvable'; end if;
  if not public.has_client_access(v_post.client_id) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;

  v_from := v_post.status;
  if v_from = p_to then raise exception 'statut inchangé'; end if;

  if not public.can_transition(v_from, p_to, v_role) then
    raise exception 'transition % -> % non autorisée pour le rôle %', v_from, p_to, v_role
      using errcode = '42501';
  end if;

  if public.transition_needs_comment(v_from, p_to) and coalesce(btrim(p_comment), '') = '' then
    raise exception 'un commentaire est obligatoire pour cette transition';
  end if;

  update public.posts
    set status = p_to  -- status_changed_* renseignés par le trigger posts_track_status_change
  where id = p_post_id
  returning * into v_post;

  insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
  values (p_post_id, auth.uid(), 'status_change', 'status', v_from::text, p_to::text);

  if coalesce(btrim(p_comment), '') <> '' then
    insert into public.post_history (post_id, actor_id, action, field, new_value)
    values (p_post_id, auth.uid(), 'comment', 'note', p_comment);
  end if;

  -- ── notifications (a minima l'entrée ; page + badge = Epic 8) ──
  if p_to = 'internal_review' then
    -- soumission : on prévient les leads/admins qui suivent ce client
    perform public.notify(
      uc.profile_id, 'post_submitted',
      'Un post est à valider en interne', v_post.id, v_post.client_id
    )
    from public.user_clients uc
    join public.profiles pr on pr.id = uc.profile_id
    where uc.client_id = v_post.client_id and pr.role in ('lead','admin') and pr.is_active;

  elsif v_from = 'internal_review' and p_to = 'client_review' then
    perform public.notify(
      v_post.author_id, 'post_internal_approved',
      'Votre post a été validé en interne', v_post.id, v_post.client_id
    );

  elsif v_from = 'internal_review' and p_to = 'draft' then
    perform public.notify(
      v_post.author_id, 'post_returned',
      'Votre post a été renvoyé pour correction', v_post.id, v_post.client_id
    );
  end if;

  return v_post;
end $$;

grant execute on function public.post_change_status(uuid, public.post_status_t, text) to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 17, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
