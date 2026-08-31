-- 0024 — templates de posts (Story 7.2).
--
-- Modèles réutilisables. `client_id` null = template global (visible de tous les internes),
-- sinon rattaché à un client (suit l'accès client). Suppression définitive (FR44).

create table if not exists public.post_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  network public.network_t,
  caption_template text not null default '',
  default_tags text[] not null default '{}',
  client_id uuid references public.clients (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists post_templates_client_idx on public.post_templates (client_id);

drop trigger if exists post_templates_set_updated_at on public.post_templates;
create trigger post_templates_set_updated_at before update on public.post_templates
  for each row execute function public.set_updated_at();

-- Visibilité générique « interne si global, accès client sinon » (même logique que
-- can_see_idea, nom neutre pour la réutilisation).
create or replace function public.can_see_scoped(p_client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_client_id is null
      then public.auth_is_active() and public.auth_role() in ('cm','lead','admin')
    else public.has_client_access(p_client_id)
  end
$$;
grant execute on function public.can_see_scoped(uuid) to authenticated;

alter table public.post_templates enable row level security;

drop policy if exists post_templates_select on public.post_templates;
create policy post_templates_select on public.post_templates
  for select to authenticated using (public.can_see_scoped(client_id));

drop policy if exists post_templates_insert on public.post_templates;
create policy post_templates_insert on public.post_templates
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_see_scoped(client_id));

drop policy if exists post_templates_update on public.post_templates;
create policy post_templates_update on public.post_templates
  for update to authenticated
  using (created_by = auth.uid() or public.auth_role() in ('lead','admin'))
  with check (public.can_see_scoped(client_id));

drop policy if exists post_templates_delete on public.post_templates;
create policy post_templates_delete on public.post_templates
  for delete to authenticated
  using (created_by = auth.uid() or public.auth_role() in ('lead','admin'));

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 24, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
