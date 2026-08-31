-- 0019 — « relancer le client » depuis la file « À valider » (Story 5.4).
--
-- Émet une notification in-app à chaque contact actif du client pour un post en
-- attente de validation client. Pas d'email en v1 (l'AC dit « marque l'alerte »).

create or replace function public.remind_client_review(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_post public.posts;
begin
  if public.auth_role() not in ('cm','lead','admin') then
    raise exception 'réservé aux rôles internes' using errcode = '42501';
  end if;

  select * into v_post from public.posts where id = p_post_id and deleted_at is null;
  if not found then raise exception 'post introuvable'; end if;

  if not public.has_client_access(v_post.client_id) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;

  if v_post.status <> 'client_review' then
    raise exception 'ce post n''est pas en attente du client';
  end if;

  perform public.notify(
    cc.auth_user_id, 'client_review_reminder',
    'Un post attend votre validation', v_post.id, v_post.client_id
  )
  from public.client_contacts cc
  where cc.client_id = v_post.client_id
    and cc.is_active
    and cc.auth_user_id is not null;

  insert into public.post_history (post_id, actor_id, action, field, new_value)
  values (p_post_id, auth.uid(), 'comment', 'note', 'Relance envoyée au client');
end $$;

grant execute on function public.remind_client_review(uuid) to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 19, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
