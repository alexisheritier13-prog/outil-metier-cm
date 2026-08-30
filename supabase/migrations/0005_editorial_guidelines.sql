-- 0005_editorial_guidelines — charte éditoriale par client (informatif)

create table if not exists public.editorial_guidelines (
  client_id uuid primary key references public.clients (id) on delete cascade,
  tone text not null default '',
  words_to_avoid text not null default '',
  words_to_prefer text not null default '',
  good_examples text not null default '',
  visual_guidelines text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
comment on table public.editorial_guidelines is 'Charte éditoriale d''un client : ton, mots, exemples, guidelines visuelles (texte/markdown).';

drop trigger if exists editorial_guidelines_set_updated_at on public.editorial_guidelines;
create trigger editorial_guidelines_set_updated_at before update on public.editorial_guidelines
  for each row execute function public.set_updated_at();

alter table public.editorial_guidelines enable row level security;

-- Lecture ET écriture : accès interne au client (cm assigné, lead, admin).
drop policy if exists editorial_guidelines_select on public.editorial_guidelines;
create policy editorial_guidelines_select on public.editorial_guidelines
  for select to authenticated
  using (public.has_client_access(client_id));

drop policy if exists editorial_guidelines_write on public.editorial_guidelines;
create policy editorial_guidelines_write on public.editorial_guidelines
  for all to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 5, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
