-- 0034 — option « ce client ne valide pas les posts ».
--
-- Quand `clients.skip_client_review = true`, l'étape `client_review` est sautée
-- pour ce client : un rôle interne envoie un post directement de
-- `internal_review` (ou `client_review`) vers `approved`. Combiné au mode
-- « CM seul » (0031), un brouillon peut aller droit en `approved`.
--
-- `can_transition` gagne un 4e paramètre optionnel `p_client_id` ; les appels à
-- 3 arguments (test de parité) restent valides et gardent le comportement de base.

alter table public.clients
  add column if not exists skip_client_review boolean not null default false;
comment on column public.clients.skip_client_review is
  'Ce client ne valide pas les posts : l''étape client_review est sautée.';

drop function if exists public.can_transition(
  public.post_status_t, public.post_status_t, public.role_t
);

create or replace function public.can_transition(
  p_from public.post_status_t,
  p_to public.post_status_t,
  p_role public.role_t,
  p_client_id uuid default null
) returns boolean language sql stable as $$
  with f as (
    select
      public.workflow_skips_internal() as skip_internal,
      coalesce(
        (select skip_client_review from public.clients where id = p_client_id),
        false
      ) as skip_client
  )
  select
    exists (
      select 1 from public.post_transitions t
      where t.from_status = p_from and t.to_status = p_to and p_role = any (t.roles)
    )
    or (
      -- mode « CM seul » : draft -> client_review (ou -> approved si le client ne valide pas)
      (select skip_internal from f)
      and p_from = 'draft'
      and p_role = any (array['cm','lead','admin']::public.role_t[])
      and (
        p_to = 'client_review'
        or (p_to = 'approved' and (select skip_client from f))
      )
    )
    or (
      -- client sans validation : (internal|client)_review -> approved par un rôle interne
      (select skip_client from f)
      and p_to = 'approved'
      and p_from in ('internal_review', 'client_review')
      and p_role = any (array['cm','lead','admin']::public.role_t[])
    )
$$;

grant execute on function
  public.can_transition(public.post_status_t, public.post_status_t, public.role_t, uuid)
  to authenticated;

-- `post_change_status` : passe le client du post à `can_transition`.
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

  update public.posts
    set status = p_to
  where id = p_post_id
  returning * into v_post;

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

  return v_post;
end $$;

grant execute on function public.post_change_status(uuid, public.post_status_t, text) to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 34, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
