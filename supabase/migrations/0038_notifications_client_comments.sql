-- 0038 — notifications : contacts client + commentaires.
--
--  1. `post_comments.kind` ('message' | 'system') pour distinguer les vrais
--     échanges des marqueurs d'action (approbation / demande de modif).
--  2. `post_change_status` notifie les contacts actifs à l'entrée en client_review.
--  3. trigger `post_comments_notify` : un nouvel échange notifie l'autre partie.

alter table public.post_comments
  add column if not exists kind text not null default 'message'
  check (kind in ('message', 'system'));

-- contacts actifs d'un client → user_id des profils liés
create or replace function public.client_contact_user_ids(p_client_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select auth_user_id from public.client_contacts
  where client_id = p_client_id and is_active and auth_user_id is not null
$$;

-- ──────────────────  post_change_status : + notif contacts  ──────────────────
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

  if not public.can_transition(v_from, p_to, v_role, v_post.client_id) then
    raise exception 'transition % -> % non autorisée pour le rôle %', v_from, p_to, v_role
      using errcode = '42501';
  end if;

  if public.transition_needs_comment(v_from, p_to) and coalesce(btrim(p_comment), '') = '' then
    raise exception 'un commentaire est obligatoire pour cette transition';
  end if;

  update public.posts set status = p_to where id = p_post_id returning * into v_post;

  insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
  values (p_post_id, auth.uid(), 'status_change', 'status', v_from::text, p_to::text);

  if coalesce(btrim(p_comment), '') <> '' then
    insert into public.post_history (post_id, actor_id, action, field, new_value)
    values (p_post_id, auth.uid(), 'comment', 'note', p_comment);
  end if;

  if p_to = 'internal_review' then
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

  -- Entrée en validation client : on prévient les contacts.
  if p_to = 'client_review' then
    perform public.notify(
      uid, 'post_awaiting_client',
      'Un post attend votre validation', v_post.id, v_post.client_id
    )
    from public.client_contact_user_ids(v_post.client_id) uid;
  end if;

  return v_post;
end $$;

grant execute on function public.post_change_status(uuid, public.post_status_t, text) to authenticated;

-- Les marqueurs d'action (approbation / demande de modif) sont des commentaires « system ».
create or replace function public.approve_post(p_post_id uuid)
returns public.posts language plpgsql security definer set search_path = public as $$
declare v_post public.posts; v_name text;
begin
  v_post := public._client_pending_post(p_post_id);
  v_name := coalesce(public._contact_display_name(v_post.client_id), 'Le client');
  update public.posts set status = 'approved' where id = p_post_id returning * into v_post;
  insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
  values (p_post_id, auth.uid(), 'status_change', 'status', 'client_review', 'approved');
  insert into public.post_comments (post_id, author_id, body, visibility, kind)
  values (p_post_id, auth.uid(), 'Approuvé par ' || v_name, 'client', 'system');
  perform public.notify(
    v_post.author_id, 'post_client_approved',
    v_name || ' a approuvé le post', v_post.id, v_post.client_id, auth.uid()
  );
  return v_post;
end $$;

create or replace function public.reject_post(p_post_id uuid, p_comment text)
returns public.posts language plpgsql security definer set search_path = public as $$
declare v_post public.posts; v_name text;
begin
  if coalesce(btrim(p_comment), '') = '' then
    raise exception 'un commentaire est obligatoire pour demander une modification';
  end if;
  v_post := public._client_pending_post(p_post_id);
  v_name := coalesce(public._contact_display_name(v_post.client_id), 'Le client');
  update public.posts set status = 'draft' where id = p_post_id returning * into v_post;
  insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
  values (p_post_id, auth.uid(), 'status_change', 'status', 'client_review', 'draft');
  insert into public.post_comments (post_id, author_id, body, visibility, kind)
  values (p_post_id, auth.uid(), btrim(p_comment), 'client', 'system');
  perform public.notify(
    v_post.author_id, 'post_client_rejected',
    v_name || ' a demandé une modification', v_post.id, v_post.client_id, auth.uid()
  );
  return v_post;
end $$;

-- ──────────────────  trigger : nouvel échange → notification  ──────────────────
create or replace function public.post_comments_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_post public.posts;
  v_role public.role_t := public.auth_role();
begin
  if new.kind <> 'message' then return new; end if;
  select * into v_post from public.posts where id = new.post_id;
  if not found then return new; end if;

  if v_role = 'client' then
    perform public.notify(
      v_post.author_id, 'comment_client',
      'Le client a laissé un commentaire', new.post_id, v_post.client_id, new.author_id
    );
    perform public.notify(
      uc.profile_id, 'comment_client',
      'Le client a laissé un commentaire', new.post_id, v_post.client_id, new.author_id
    )
    from public.user_clients uc
    join public.profiles pr on pr.id = uc.profile_id
    where uc.client_id = v_post.client_id and pr.is_active and pr.role in ('cm','lead')
      and uc.profile_id is distinct from v_post.author_id;

  elsif new.visibility = 'client' then
    perform public.notify(
      uid, 'comment_agency',
      'Votre agence a laissé un commentaire', new.post_id, v_post.client_id, new.author_id
    )
    from public.client_contact_user_ids(v_post.client_id) uid;

  else
    perform public.notify(
      v_post.author_id, 'comment_internal',
      'Nouveau commentaire interne', new.post_id, v_post.client_id, new.author_id
    );
  end if;

  return new;
end $$;

drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.post_comments_notify();

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 38, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
