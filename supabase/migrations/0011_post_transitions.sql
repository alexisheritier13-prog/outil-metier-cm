-- 0011_post_transitions — pipeline de statuts : can_transition (SOURCE DE VÉRITÉ),
-- journal minimal post_history, RPC post_change_status.
--
-- Le miroir TS est src/shared/utils/transitions.ts ; un test compare les deux tables.

-- ─────────────────────  Journal minimal des posts  ─────────────────────
-- (L'historique complet champ par champ = Story 4.4 ; ici : changements de statut.)
create table if not exists public.post_history (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null,
  field text,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
create index if not exists post_history_post_idx on public.post_history (post_id, created_at);

alter table public.post_history enable row level security;

drop policy if exists post_history_select on public.post_history;
create policy post_history_select on public.post_history
  for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_history.post_id and public.has_client_access(p.client_id)
    )
  );
-- Pas de policy insert/update/delete : append-only via RPC SECURITY DEFINER.

-- ─────────────────────  Table de transitions  ─────────────────────
-- Une ligne par transition autorisée. `roles` = rôles permis. `needs_comment` = commentaire
-- obligatoire. `needs_client_contact` = réservé à un contact du client (via RPC dédié).
create table if not exists public.post_transitions (
  from_status public.post_status_t not null,
  to_status public.post_status_t not null,
  roles public.role_t[] not null,
  needs_comment boolean not null default false,
  needs_client_contact boolean not null default false,
  primary key (from_status, to_status)
);

alter table public.post_transitions enable row level security;
drop policy if exists post_transitions_read on public.post_transitions;
create policy post_transitions_read on public.post_transitions
  for select to authenticated using (public.auth_is_active());

insert into public.post_transitions (from_status, to_status, roles, needs_comment, needs_client_contact) values
  ('draft',           'internal_review', array['cm','lead','admin']::role_t[], false, false),
  ('internal_review', 'client_review',   array['lead','admin']::role_t[],      false, false),
  ('client_review',   'approved',        array['client']::role_t[],            false, true),
  ('approved',        'scheduled',       array['cm','lead','admin']::role_t[],  false, false),
  ('scheduled',       'published',       array['cm','lead','admin']::role_t[],  false, false),
  ('internal_review', 'draft',           array['lead','admin']::role_t[],       true,  false),
  ('client_review',   'draft',           array['cm','lead','admin']::role_t[],  false, false),
  ('client_review',   'internal_review', array['cm','lead','admin']::role_t[],  false, false),
  ('approved',        'draft',           array['lead','admin']::role_t[],       false, false),
  ('approved',        'internal_review', array['lead','admin']::role_t[],       false, false),
  ('approved',        'client_review',   array['lead','admin']::role_t[],       false, false),
  ('scheduled',       'approved',        array['lead','admin']::role_t[],       false, false),
  ('scheduled',       'draft',           array['lead','admin']::role_t[],       false, false),
  ('published',       'scheduled',       array['lead','admin']::role_t[],       false, false)
on conflict (from_status, to_status) do update
  set roles = excluded.roles,
      needs_comment = excluded.needs_comment,
      needs_client_contact = excluded.needs_client_contact;

-- Cas particulier : le contact client peut aussi refuser (client_review -> draft avec commentaire).
-- Modélisé comme une ligne distincte est impossible (PK from+to) : le RPC reject_post (Story 5.3)
-- porte cette règle. La ligne client_review->draft ci-dessus couvre le retour interne.

-- ─────────────────────  can_transition (source de vérité)  ─────────────────────
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
$$;

create or replace function public.transition_needs_comment(
  p_from public.post_status_t,
  p_to public.post_status_t
) returns boolean language sql stable as $$
  select coalesce(
    (select needs_comment from public.post_transitions
     where from_status = p_from and to_status = p_to),
    false)
$$;

grant execute on function
  public.can_transition(public.post_status_t, public.post_status_t, public.role_t),
  public.transition_needs_comment(public.post_status_t, public.post_status_t)
  to authenticated;

-- ─────────────────────  RPC post_change_status (rôles internes)  ─────────────────────
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

  -- Le commentaire éventuel sera rattaché quand post_comments existera (Story 4.5) ;
  -- pour l'instant on le journalise.
  if coalesce(btrim(p_comment), '') <> '' then
    insert into public.post_history (post_id, actor_id, action, field, new_value)
    values (p_post_id, auth.uid(), 'comment', 'note', p_comment);
  end if;

  return v_post;
end $$;

grant execute on function public.post_change_status(uuid, public.post_status_t, text) to authenticated;

-- Verrou : interdire les changements de statut par UPDATE direct (hors RPC).
-- Le RPC est SECURITY DEFINER (rôle postgres) → on autorise postgres, on bloque les autres.
create or replace function public.posts_guard_status_update()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and current_user <> 'postgres' then
    raise exception 'changez le statut via post_change_status()' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists posts_guard_status on public.posts;
create trigger posts_guard_status before update on public.posts
  for each row execute function public.posts_guard_status_update();

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 11, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
