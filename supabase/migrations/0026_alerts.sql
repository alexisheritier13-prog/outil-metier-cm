-- 0026 — alertes in-app (Stories 8.1 + 8.2).
--
-- Table `alerts` + moteur `generate_alerts()` implémentant FR36 a–g, idempotent via
-- `dedupe_key`, avec fermeture automatique des alertes devenues caduques. Les seuils sont
-- lus depuis `app_settings` clé `alert_thresholds` (défauts si absent) — l'UI de réglage
-- = Story 8.3. L'ordonnancement pg_cron = Story 8.4.

do $$ begin
  create type public.alert_type_t as enum (
    'validation_overdue',   -- a : en attente de validation depuis > X jours
    'deadline_unvalidated', -- b : date proche mais post non validé
    'calendar_gap',         -- c : moins de N posts planifiés sur la fenêtre à venir
    'missing_canva',        -- d : pas de lien Canva alors que la date approche
    'keydate_unplanned',    -- e : marronnier à venir sans post prévu
    'client_inactive',      -- f : client sans post planifié sur 2 semaines
    'publish_reminder'      -- g : post planifié aujourd'hui → publier manuellement
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_status_t as enum ('new', 'seen', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  type public.alert_type_t not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  client_id uuid references public.clients (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  target_role public.role_t,             -- restreint à ce rôle (+ admin) si renseigné
  target_user_id uuid references public.profiles (id) on delete cascade,
  message text not null,
  status public.alert_status_t not null default 'new',
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists alerts_open_idx on public.alerts (status) where status <> 'dismissed';
create index if not exists alerts_client_idx on public.alerts (client_id);

drop trigger if exists alerts_set_updated_at on public.alerts;
create trigger alerts_set_updated_at before update on public.alerts
  for each row execute function public.set_updated_at();

alter table public.alerts enable row level security;

-- Visibilité : lead/admin voient tout ; un cm voit celles de ses clients ou qui lui sont
-- adressées ; `target_role` restreint (admin passe outre).
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
  for select to authenticated
  using (
    public.auth_is_active()
    and (
      target_user_id = auth.uid()
      or (
        target_user_id is null
        and (target_role is null or target_role = public.auth_role() or public.auth_role() = 'admin')
        and (client_id is null or public.has_client_access(client_id))
      )
    )
  );

-- Mise à jour du statut (vue / ignorée) : même périmètre.
drop policy if exists alerts_update on public.alerts;
create policy alerts_update on public.alerts
  for update to authenticated
  using (
    public.auth_is_active()
    and (
      target_user_id = auth.uid()
      or (
        target_user_id is null
        and (target_role is null or target_role = public.auth_role() or public.auth_role() = 'admin')
        and (client_id is null or public.has_client_access(client_id))
      )
    )
  );
-- Pas d'insert/delete : géré par generate_alerts (SECURITY DEFINER).

-- ─────────────────────────  Seuils  ─────────────────────────
create or replace function public.alert_thresholds()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(
    (select value from public.app_settings where key = 'alert_thresholds'),
    '{}'::jsonb
  ) || '{}'::jsonb
$$;

create or replace function public._thr(p_key text, p_default int)
returns int language sql stable set search_path = public as $$
  select coalesce((public.alert_thresholds() ->> p_key)::int, p_default)
$$;

-- ─────────────────────────  generate_alerts()  ─────────────────────────
create or replace function public.generate_alerts()
returns public.job_runs language plpgsql security definer set search_path = public as $$
declare
  v_run public.job_runs;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_overdue int := public._thr('validation_overdue_days', 3);
  v_deadline int := public._thr('deadline_window_days', 3);
  v_gap_min int := public._thr('calendar_min_posts', 3);
  v_gap_win int := public._thr('calendar_window_days', 14);
  v_kd_win int := public._thr('keydate_window_days', 21);
  v_inactive int := public._thr('client_inactive_window_days', 14);
  v_created int := 0;
  v_dismissed int := 0;
  n int;
begin
  insert into public.job_runs (job_name) values ('generate_alerts') returning * into v_run;

  -- ── (a) en attente de validation depuis trop longtemps ──
  insert into public.alerts (type, severity, client_id, post_id, message, dedupe_key)
  select 'validation_overdue', 'warning', p.client_id, p.id,
    'En attente de validation depuis plus de ' || v_overdue || ' jours.',
    'a:' || p.id || ':' || v_today
  from public.posts p
  where p.deleted_at is null
    and p.status in ('internal_review', 'client_review')
    and p.status_changed_at < now() - make_interval(days => v_overdue)
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; v_created := v_created + n;

  -- ── (b) deadline proche, post non validé ──
  insert into public.alerts (type, severity, client_id, post_id, message, dedupe_key)
  select 'deadline_unvalidated',
    case when p.scheduled_at < now() + interval '2 days' then 'critical' else 'warning' end,
    p.client_id, p.id,
    'Publication prévue le ' || to_char(p.scheduled_at at time zone 'Europe/Paris', 'DD/MM') ||
      ' mais le post n''est pas validé.',
    'b:' || p.id || ':' || v_today
  from public.posts p
  where p.deleted_at is null
    and p.status not in ('approved', 'scheduled', 'published')
    and p.scheduled_at between now() and now() + make_interval(days => v_deadline)
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; v_created := v_created + n;

  -- ── (c) trou de calendrier : < N posts planifiés sur la fenêtre ──
  insert into public.alerts (type, severity, client_id, message, dedupe_key)
  select 'calendar_gap', 'warning', c.id,
    'Moins de ' || v_gap_min || ' posts planifiés sur les ' || v_gap_win || ' prochains jours.',
    'c:' || c.id || ':' || to_char(v_today, 'IYYY-IW')
  from public.clients c
  where c.deleted_at is null and c.is_archived = false
    and (
      select count(*) from public.posts p
      where p.client_id = c.id and p.deleted_at is null
        and p.status in ('approved', 'scheduled')
        and p.scheduled_at between now() and now() + make_interval(days => v_gap_win)
    ) < v_gap_min
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; v_created := v_created + n;

  -- ── (d) pas de lien Canva alors que la date approche ──
  insert into public.alerts (type, severity, client_id, post_id, message, dedupe_key)
  select 'missing_canva', 'warning', p.client_id, p.id,
    'Aucun lien Canva alors que la publication approche.',
    'd:' || p.id || ':' || v_today
  from public.posts p
  where p.deleted_at is null
    and coalesce(p.canva_url, '') = ''
    and p.status <> 'published'
    and p.scheduled_at between now() and now() + interval '3 days'
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; v_created := v_created + n;

  -- ── (e) marronnier à venir sans post prévu ──
  insert into public.alerts (type, severity, client_id, message, dedupe_key)
  select 'keydate_unplanned', 'info', c.id,
    'Marronnier « ' || k.name || ' » le ' || to_char(occ.d, 'DD/MM') || ' sans post prévu.',
    'e:' || c.id || ':' || k.id || ':' || extract(year from occ.d)::int
  from public.clients c
  cross join lateral (
    select k.*
    from public.key_dates k
    where k.scope = 'global'
       or (k.scope = 'sector' and k.sector is not distinct from c.sector)
       or (k.scope = 'client' and k.client_id = c.id)
  ) k
  cross join lateral (
    select make_date(
      extract(year from v_today)::int + case
        when make_date(extract(year from v_today)::int,
                       extract(month from k.event_date)::int,
                       extract(day from k.event_date)::int) < v_today then 1 else 0 end,
      extract(month from k.event_date)::int,
      extract(day from k.event_date)::int
    ) as d
  ) occ
  where c.deleted_at is null and c.is_archived = false
    and occ.d between v_today and v_today + v_kd_win
    and not exists (
      select 1 from public.posts p
      where p.client_id = c.id and p.deleted_at is null
        and p.scheduled_at::date between occ.d - 10 and occ.d + 3
    )
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; v_created := v_created + n;

  -- ── (f) client sans aucun post planifié sur la fenêtre (Lead/Admin) ──
  insert into public.alerts (type, severity, client_id, target_role, message, dedupe_key)
  select 'client_inactive', 'warning', c.id, 'lead',
    'Aucun post prévu sur les ' || v_inactive || ' prochains jours pour ce client.',
    'f:' || c.id || ':' || to_char(v_today, 'IYYY-IW')
  from public.clients c
  where c.deleted_at is null and c.is_archived = false
    and not exists (
      select 1 from public.posts p
      where p.client_id = c.id and p.deleted_at is null
        and p.scheduled_at between now() and now() + make_interval(days => v_inactive)
    )
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; v_created := v_created + n;

  -- ── (g) post planifié aujourd'hui → rappel de publication ──
  insert into public.alerts (type, severity, client_id, post_id, message, dedupe_key)
  select 'publish_reminder', 'info', p.client_id, p.id,
    'À publier aujourd''hui à ' || to_char(p.scheduled_at at time zone 'Europe/Paris', 'HH24:MI') || '.',
    'g:' || p.id || ':' || v_today
  from public.posts p
  where p.deleted_at is null
    and p.status = 'scheduled'
    and (p.scheduled_at at time zone 'Europe/Paris')::date = v_today
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; v_created := v_created + n;

  -- ── fermeture des alertes post-niveau devenues caduques ──
  update public.alerts a set status = 'dismissed'
  where a.status <> 'dismissed'
    and a.post_id is not null
    and a.type in ('validation_overdue', 'deadline_unvalidated', 'missing_canva', 'publish_reminder')
    and not exists (
      select 1 from public.posts p where p.id = a.post_id and p.deleted_at is null and (
        (a.type = 'validation_overdue' and p.status in ('internal_review', 'client_review'))
        or (a.type = 'deadline_unvalidated' and p.status not in ('approved', 'scheduled', 'published'))
        or (a.type = 'missing_canva' and coalesce(p.canva_url, '') = '' and p.status <> 'published')
        or (a.type = 'publish_reminder' and p.status = 'scheduled')
      )
    );
  get diagnostics v_dismissed = row_count;

  update public.job_runs
    set finished_at = now(), ok = true,
        stats = jsonb_build_object('created', v_created, 'dismissed', v_dismissed)
    where id = v_run.id returning * into v_run;
  return v_run;
exception when others then
  update public.job_runs set finished_at = now(), ok = false, error = sqlerrm
    where id = v_run.id;
  raise;
end $$;

-- Déclenchement manuel (Admin) — bouton « Lancer maintenant » (Story 8.3/8.4).
create or replace function public.trigger_generate_alerts()
returns public.job_runs language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role() not in ('lead', 'admin') then
    raise exception 'réservé au Lead / Admin' using errcode = '42501';
  end if;
  return public.generate_alerts();
end $$;

grant execute on function public.trigger_generate_alerts() to authenticated;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 26, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
