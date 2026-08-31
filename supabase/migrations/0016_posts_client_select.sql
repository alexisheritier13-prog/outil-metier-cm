-- 0016 — un contact client voit les posts de son client à partir de « à valider client ».
-- (Prérequis des commentaires visibles client ; l'espace client complet = Epic 6.)

drop policy if exists posts_select_client on public.posts;
create policy posts_select_client on public.posts
  for select to authenticated
  using (
    deleted_at is null
    and status in ('client_review', 'approved', 'scheduled', 'published')
    and client_id in (select public.contact_client_ids())
  );

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 16, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
