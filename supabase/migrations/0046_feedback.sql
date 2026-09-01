-- 0046 — retours des testeurs (beta).
--
-- N'importe quel utilisateur connecté (agence OU contact portail) peut envoyer
-- un retour via `submit_feedback()`. Seul un `platform_admin` voit l'ensemble
-- (tous locataires confondus) et gère le statut. L'auteur voit ses propres envois.

do $$ begin
  create type public.feedback_kind_t as enum ('bug', 'idea', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feedback_status_t as enum ('new', 'seen', 'done');
exception when duplicate_object then null; end $$;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  author_email text not null default '',
  kind public.feedback_kind_t not null default 'other',
  message text not null,
  path text not null default '',
  status public.feedback_status_t not null default 'new',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_idx on public.feedback (status, created_at desc);

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at before update on public.feedback
  for each row execute function public.set_updated_at();

alter table public.feedback enable row level security;

-- Lecture : le super-admin plateforme voit tout ; l'auteur voit les siens.
drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select to authenticated
  using (public.is_platform_admin() or author_id = auth.uid());

-- Mise à jour (statut / note) : super-admin plateforme uniquement.
drop policy if exists feedback_update on public.feedback;
create policy feedback_update on public.feedback
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
-- Pas d'insert / delete direct : l'envoi passe par submit_feedback().

-- ─────────────────────────  Envoi  ─────────────────────────
create or replace function public.submit_feedback(
  p_kind text,
  p_message text,
  p_path text default ''
) returns public.feedback
language plpgsql security definer set search_path = public as $$
declare v_row public.feedback;
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '42501';
  end if;
  if coalesce(btrim(p_message), '') = '' then
    raise exception 'le message est vide';
  end if;

  insert into public.feedback (organization_id, author_id, author_email, kind, message, path)
  values (
    public.auth_org(),
    auth.uid(),
    coalesce(
      nullif(auth.jwt() ->> 'email', ''),
      (select email from public.profiles where id = auth.uid()),
      ''
    ),
    coalesce(nullif(p_kind, ''), 'other')::public.feedback_kind_t,
    left(btrim(p_message), 4000),
    left(coalesce(p_path, ''), 300)
  )
  returning * into v_row;
  return v_row;
end $$;

grant execute on function public.submit_feedback(text, text, text) to authenticated;

-- ─────────────────────────  Gestion (super-admin plateforme)  ─────────────────────────
create or replace function public.set_feedback_status(
  p_id uuid,
  p_status text,
  p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'réservé à un administrateur plateforme' using errcode = '42501';
  end if;
  update public.feedback set
    status = coalesce(nullif(p_status, ''), status::text)::public.feedback_status_t,
    admin_note = coalesce(p_note, admin_note)
  where id = p_id;
end $$;

grant execute on function public.set_feedback_status(uuid, text, text) to authenticated;

create or replace function public.platform_list_feedback()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_platform_admin() then coalesce(
    (select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'kind', f.kind,
        'message', f.message,
        'path', f.path,
        'status', f.status,
        'adminNote', f.admin_note,
        'authorEmail', f.author_email,
        'orgName', (select name from public.organizations o where o.id = f.organization_id),
        'createdAt', f.created_at
      ) order by f.created_at desc)
     from public.feedback f),
    '[]'::jsonb)
  end
$$;

grant execute on function public.platform_list_feedback() to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 46, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
