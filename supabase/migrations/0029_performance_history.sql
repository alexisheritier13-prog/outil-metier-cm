-- 0029 — Story 9.4 : le changement de visibilité de la note de performance
-- (`performance_visible_to_client`) est aussi journalisé dans `post_history`.
-- La note elle-même (`performance_note`) l'était déjà (0015).

create or replace function public.posts_log_field_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  f text;
begin
  -- statut / deleted_at : déjà journalisés par les RPC dédiés.
  foreach f in array array['caption','scheduled_at','network','canva_url','campaign_id',
                           'author_id','performance_note','performance_visible_to_client'] loop
    if to_jsonb(new) ->> f is distinct from to_jsonb(old) ->> f then
      insert into public.post_history (post_id, actor_id, action, field, old_value, new_value)
      values (new.id, auth.uid(), 'update', f, to_jsonb(old) ->> f, to_jsonb(new) ->> f);
    end if;
  end loop;
  return new;
end $$;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 29, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
