-- 0030 — marronniers classiques (calendrier de référence, portée « global »).
--
-- `created_by` devient nullable : NULL = fourni par le système (comme
-- `post_history.actor_id`). Les dates mobiles (Pâques, fête des mères…) sont
-- posées sur une date nominale `recurring_annually = true` avec la règle en
-- description ; le CM ajuste le jour exact.

alter table public.key_dates alter column created_by drop not null;
comment on column public.key_dates.created_by is 'NULL = marronnier fourni par le système (seed 0030).';

-- Dé-doublonnage des marronniers globaux par nom (idempotence du seed).
create unique index if not exists key_dates_global_name_uniq
  on public.key_dates (lower(name)) where scope = 'global';

-- La garde d'écriture exigeait `created_by = auth.uid()` — ce qui empêchait un
-- Lead/Admin de modifier un marronnier système (`created_by is null`). On lève
-- cette exigence pour les portées global/sector (déjà réservées lead+admin).
drop policy if exists key_dates_write on public.key_dates;
create policy key_dates_write on public.key_dates
  for all to authenticated
  using (
    case scope
      when 'client' then public.has_client_access(client_id)
      else public.auth_role() in ('lead','admin')
    end
  )
  with check (
    case scope
      when 'client' then public.has_client_access(client_id) and created_by = auth.uid()
      else public.auth_role() in ('lead','admin')
    end
  );

insert into public.key_dates (name, event_date, recurring_annually, scope, description) values
  -- ── Janvier ──
  ('Jour de l''an', date '2025-01-01', true, 'global', ''),
  ('Épiphanie / galette des rois', date '2025-01-06', true, 'global', ''),
  ('Journée mondiale du Braille', date '2025-01-04', true, 'global', ''),
  ('Blue Monday', date '2025-01-20', true, 'global', 'Le 3e lundi de janvier — « jour le plus déprimant de l''année ».'),
  ('Soldes d''hiver', date '2025-01-08', true, 'global', 'Début : 2e mercredi de janvier (France).'),
  -- ── Février ──
  ('Chandeleur (crêpes)', date '2025-02-02', true, 'global', ''),
  ('Journée mondiale contre le cancer', date '2025-02-04', true, 'global', ''),
  ('Safer Internet Day', date '2025-02-11', true, 'global', 'Le 2e mardi de février.'),
  ('Saint-Valentin', date '2025-02-14', true, 'global', ''),
  ('Mardi Gras / Carnaval', date '2025-02-17', true, 'global', 'Date mobile (47 jours avant Pâques).'),
  ('Journée internationale de la langue maternelle', date '2025-02-21', true, 'global', ''),
  -- ── Mars ──
  ('Journée internationale des droits des femmes', date '2025-03-08', true, 'global', ''),
  ('Saint-Patrick', date '2025-03-17', true, 'global', ''),
  ('Journée mondiale du bonheur', date '2025-03-20', true, 'global', ''),
  ('Journée internationale de la Francophonie', date '2025-03-20', true, 'global', ''),
  ('Printemps', date '2025-03-20', true, 'global', 'Équinoxe.'),
  ('Journée mondiale de la trisomie 21', date '2025-03-21', true, 'global', ''),
  ('Journée mondiale de l''eau', date '2025-03-22', true, 'global', ''),
  ('Earth Hour', date '2025-03-29', true, 'global', 'Dernier samedi de mars, 20h30.'),
  -- ── Avril ──
  ('Poisson d''avril', date '2025-04-01', true, 'global', ''),
  ('Pâques', date '2025-04-20', true, 'global', 'Date mobile (1er dimanche après la pleine lune de printemps).'),
  ('Lundi de Pâques', date '2025-04-21', true, 'global', 'Date mobile.'),
  ('Journée mondiale de la Terre', date '2025-04-22', true, 'global', ''),
  ('Journée mondiale du livre', date '2025-04-23', true, 'global', ''),
  ('Journée mondiale de la sécurité et de la santé au travail', date '2025-04-28', true, 'global', ''),
  ('Journée internationale de la danse', date '2025-04-29', true, 'global', ''),
  -- ── Mai ──
  ('Fête du travail / muguet', date '2025-05-01', true, 'global', ''),
  ('Star Wars Day', date '2025-05-04', true, 'global', '« May the 4th be with you ».'),
  ('Victoire du 8 mai 1945', date '2025-05-08', true, 'global', ''),
  ('Journée de l''Europe', date '2025-05-09', true, 'global', ''),
  ('Ascension', date '2025-05-29', true, 'global', 'Date mobile (jeudi, 39 jours après Pâques).'),
  ('Fête des mères', date '2025-05-25', true, 'global', 'France : dernier dimanche de mai (ou 1er juin si coïncide avec Pentecôte).'),
  ('Journée mondiale de la biodiversité', date '2025-05-22', true, 'global', ''),
  ('Journée mondiale sans tabac', date '2025-05-31', true, 'global', ''),
  -- ── Juin ──
  ('Journée mondiale de l''environnement', date '2025-06-05', true, 'global', ''),
  ('Journée mondiale des océans', date '2025-06-08', true, 'global', ''),
  ('Pentecôte', date '2025-06-08', true, 'global', 'Date mobile (49 jours après Pâques).'),
  ('Fête des pères', date '2025-06-15', true, 'global', 'France : 3e dimanche de juin.'),
  ('Journée internationale du yoga', date '2025-06-21', true, 'global', ''),
  ('Fête de la musique', date '2025-06-21', true, 'global', ''),
  ('Été', date '2025-06-21', true, 'global', 'Solstice.'),
  ('Marche des fiertés / Pride', date '2025-06-28', true, 'global', 'Tout le mois de juin ; dates de marche variables selon les villes.'),
  ('Soldes d''été', date '2025-06-25', true, 'global', 'Début : dernier mercredi de juin (France).'),
  -- ── Juillet ──
  ('Fête nationale', date '2025-07-14', true, 'global', ''),
  ('Journée mondiale de l''émoji', date '2025-07-17', true, 'global', ''),
  -- ── Août ──
  ('Assomption', date '2025-08-15', true, 'global', ''),
  ('Journée mondiale de la photographie', date '2025-08-19', true, 'global', ''),
  -- ── Septembre ──
  ('Rentrée scolaire', date '2025-09-01', true, 'global', 'France : début septembre.'),
  ('Journées européennes du patrimoine', date '2025-09-20', true, 'global', '3e week-end de septembre.'),
  ('World Cleanup Day', date '2025-09-20', true, 'global', '3e samedi de septembre.'),
  ('Journée internationale de la paix', date '2025-09-21', true, 'global', ''),
  ('Automne', date '2025-09-22', true, 'global', 'Équinoxe.'),
  -- ── Octobre ──
  ('Journée internationale du café', date '2025-10-01', true, 'global', ''),
  ('Octobre rose', date '2025-10-01', true, 'global', 'Mois de sensibilisation au cancer du sein.'),
  ('Journée mondiale des enseignants', date '2025-10-05', true, 'global', ''),
  ('Journée mondiale de la santé mentale', date '2025-10-10', true, 'global', ''),
  ('Semaine du goût', date '2025-10-13', true, 'global', 'Mi-octobre (France).'),
  ('Journée mondiale de l''alimentation', date '2025-10-16', true, 'global', ''),
  ('Passage à l''heure d''hiver', date '2025-10-26', true, 'global', 'Dernier dimanche d''octobre.'),
  ('Halloween', date '2025-10-31', true, 'global', ''),
  -- ── Novembre ──
  ('Toussaint', date '2025-11-01', true, 'global', ''),
  ('Movember', date '2025-11-01', true, 'global', 'Mois de sensibilisation à la santé masculine.'),
  ('Armistice 1918', date '2025-11-11', true, 'global', ''),
  ('Singles'' Day', date '2025-11-11', true, 'global', 'Journée du célibat / e-commerce (Chine).'),
  ('Journée mondiale de la gentillesse', date '2025-11-13', true, 'global', ''),
  ('Beaujolais nouveau', date '2025-11-20', true, 'global', '3e jeudi de novembre.'),
  ('Journée internationale des droits de l''enfant', date '2025-11-20', true, 'global', ''),
  ('Black Friday', date '2025-11-28', true, 'global', 'Lendemain de Thanksgiving : 4e vendredi de novembre.'),
  ('Cyber Monday', date '2025-12-01', true, 'global', 'Lundi suivant le Black Friday.'),
  -- ── Décembre ──
  ('Journée mondiale de la lutte contre le sida', date '2025-12-01', true, 'global', ''),
  ('Téléthon', date '2025-12-05', true, 'global', '1er week-end de décembre (France).'),
  ('Saint-Nicolas', date '2025-12-06', true, 'global', 'Est et Nord de la France.'),
  ('Journée internationale des droits de l''homme', date '2025-12-10', true, 'global', ''),
  ('Hiver', date '2025-12-21', true, 'global', 'Solstice.'),
  ('Noël', date '2025-12-25', true, 'global', ''),
  ('Réveillon du Nouvel An', date '2025-12-31', true, 'global', 'Saint-Sylvestre.')
on conflict do nothing;

insert into public.app_meta (key, value)
values ('schema_version', jsonb_build_object('version', 30, 'applied_at', now()))
on conflict (key) do update set value = excluded.value, updated_at = now();
