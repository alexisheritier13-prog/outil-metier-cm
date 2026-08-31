-- 0018 — approbation / refus d'un post par un contact client (Story 5.3).
--
-- Deux RPC SECURITY DEFINER, exécutables seulement par un contact (`role = 'client'`)
-- du client propriétaire du post, et seulement si le post est « à valider client ».
-- L'UI côté espace client = Epic 6 (Story 6.3).

-- Garde commune : charge le post s'il est validable par le contact courant, sinon lève.
create or replace function public._client_pending_post(p_post_id uuid)
returns public.posts language plpgsql security definer set search_path = public as $$
declare
  v_post public.posts;
begin
  if public.auth_role() is distinct from 'client' then
    raise exception 'réservé aux contacts client' using errcode = '42501';
  end if;

  select * into v_post from public.posts
    where id = p_post_id and deleted_at is null for update;
  if not found then raise exception 'post introuvable'; end if;

  if v_post.client_id not in (select public.contact_client_ids()) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;

  if v_post.status <> 'client_review' then
    raise exception 'ce post n''est pas en attente de votre validation';
  end if;

  return v_post;
end $$;

-- Nom lisible du contact courant pour un client donné.
create or replace function public._contact_display_name(p_client_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(full_name), ''), email)
  from public.client_contacts
  where auth_user_id = auth.uid() and client_id = p_client_id
  limit 1
$$;

-- ─────────────────────────────  approve_post  ─────────────────────────────
create or replace function public.approve_post(p_post_id uuid)
returns public.posts language plpgsql security definer set search_path = public as $$
declare
  v_post public.posts;
  v_name text;
begin
  v_post := public._client_pending_post(p_post_id);
  v_name := coalesce(public._contact_display_name(v_post.client_id), 'le client');

  update public.posts set status = 'approved' where id = p_post_id returning * into v_post;

  insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
  values (p_post_id, auth.uid(), 'status_change', 'status', 'client_review', 'approved');

  insert into public.post_comments (post_id, author_id, body, visibility)
  values (p_post_id, auth.uid(), 'Approuvé par ' || v_name, 'client');

  perform public.notify(
    v_post.author_id, 'post_client_approved',
    v_name || ' a approuvé le post', v_post.id, v_post.client_id, auth.uid()
  );

  return v_post;
end $$;

-- ─────────────────────────────  reject_post  ─────────────────────────────
create or replace function public.reject_post(p_post_id uuid, p_comment text)
returns public.posts language plpgsql security definer set search_path = public as $$
declare
  v_post public.posts;
  v_name text;
begin
  if coalesce(btrim(p_comment), '') = '' then
    raise exception 'un commentaire est obligatoire pour demander une modification';
  end if;

  v_post := public._client_pending_post(p_post_id);
  v_name := coalesce(public._contact_display_name(v_post.client_id), 'Le client');

  update public.posts set status = 'draft' where id = p_post_id returning * into v_post;

  insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
  values (p_post_id, auth.uid(), 'status_change', 'status', 'client_review', 'draft');

  insert into public.post_comments (post_id, author_id, body, visibility)
  values (p_post_id, auth.uid(), btrim(p_comment), 'client');

  perform public.notify(
    v_post.author_id, 'post_client_rejected',
    v_name || ' a demandé une modification', v_post.id, v_post.client_id, auth.uid()
  );

  return v_post;
end $$;

grant execute on function public.approve_post(uuid), public.reject_post(uuid, text) to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 18, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
