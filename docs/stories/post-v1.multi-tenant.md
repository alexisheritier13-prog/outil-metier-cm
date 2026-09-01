# Post-v1 — Multi-tenant (isolation par organisation) + inscription sur invitation

**Statut :** livré (migrations 0042 + 0043) — prérequis à la beta multi-agences.

## Contexte

Jusqu'ici Cadence est **mono-agence** : `has_client_access()` renvoie vrai pour
tout `lead` / `admin`, quel que soit le client, et `app_settings` est global. Pour
ouvrir la beta à **plusieurs agences / CM solo** sur la même instance, il faut une
isolation stricte des données par locataire (exigence n°1 de l'architecture).

## Ce qui a été fait

### Migration 0042 — socle multi-tenant

- **`organizations`** (nom, slug, plan, `owner_id`) + **`platform_admins`**
  (super-admin plateforme = nous ; hors RLS applicative).
- **`profiles.organization_id`** + helpers `auth_org()` (org de l'appelant) et
  `is_platform_admin()`.
- **`organization_id` sur les 25 tables métier**, avec un **défaut
  `public.auth_org()`** (colonne optionnelle côté client) et des **triggers
  BEFORE INSERT** (`tenant_fill_*`) qui dérivent l'organisation du parent
  (`post → client → organisation`, commentaire → post, etc.). Aucun corps de RPC
  ou de trigger métier existant n'a été modifié.
- **Policies RLS `RESTRICTIVE` `org_isolation`** sur chaque table :
  `organization_id = auth_org()`. Une policy restrictive s'ajoute en **AND** aux
  policies permissives existantes — l'isolation est ajoutée sans réécrire les
  règles métier. `alerts` et `key_dates` tolèrent aussi `organization_id is null`
  (lignes plateforme : marronniers pré-installés).
- **`org_settings`** (clé/valeur **par organisation**) : `account`, `workflow`,
  `onboarding_template` y migrent. `alert_thresholds` **reste global**
  (`app_settings`) pour la beta.
- `has_client_access()` gagne un contrôle `clients.organization_id = auth_org()`
  (défense en profondeur — la policy restrictive suffirait).
- Fonctions recâblées sur `org_settings` / le périmètre org :
  `workflow_skips_internal()`, `seed_onboarding_for_client()` (avec repli si pas
  de modèle), `auto_publish_due()` (drapeau lu par organisation),
  `key_dates_for_client()` (marronniers plateforme + ceux de l'org du client).
- **`tags`** : unicité passée de `(name)` à `(organization_id, name)`.
- **Backfill** : toutes les données existantes (démo) rejoignent une organisation
  **« Studio Lumen »**. Les profils des contacts portail héritent de l'org de leur
  client.

### Migration 0043 — inscription sur invitation

- **`org_invitations`** (e-mail, nom d'agence proposé, jeton, expiration 21 j).
- **`create_org_invitation()`** — réservée `is_platform_admin()`.
- **`accept_org_invitation(token, full_name, org_name)`** — appelée par l'invité
  connecté : crée l'organisation, ses `org_settings` par défaut, rattache le
  profil (rôle `admin`, actif) et marque l'invitation consommée. Vérifie que
  l'e-mail du jeton = l'e-mail du compte.
- **`org_invitation_by_token()`** — lecture publique (pré-remplit l'écran).
- Le super-admin plateforme est amorcé depuis `auth.users`
  (`alexis.heritier13@gmail.com`).

### Edge Function `admin-users`

- Charge l'`organization_id` de l'appelant + son statut `platform_admin`.
- `create` / `invite_contact` : **stampent `organization_id`** sur le profil créé
  et vérifient que le client ciblé appartient à l'organisation de l'appelant.
  `invite_contact` refuse un e-mail déjà rattaché à une autre organisation
  (`email_in_other_org`).
- `update_user` : ne peut agir que sur un compte de l'organisation de l'appelant.
- **Nouvelle action `invite_org`** (platform admin) : crée le compte auth + la
  ligne `org_invitations` + le lien de connexion (`<APP_URL>/rejoindre/<token>`),
  envoyé par e-mail (Resend) si configuré.

### Front

- `Profile.organizationId`, service `org.ts` (`getCurrentOrgId` / `requireOrgId`
  via RPC `auth_org`).
- `accountSettings.ts` / `workflowSettings.ts` lisent/écrivent `org_settings`.
- Service `orgInvitations.ts` + page **`/rejoindre/:token`** (`JoinOrgPage`) :
  consomme le lien Supabase, propose nom d'agence / nom / mot de passe, appelle
  `accept_org_invitation`, puis redirige vers l'assistant `/bienvenue`.

## Tests

- Helpers d'intégration (`_helpers.ts`) : `createTestOrg` / `defaultTestOrgId`
  (promesse mémoïsée → une organisation partagée par fichier de test) ;
  `createTestUser` / `createTestClient` acceptent un `orgId`.
- `auto-publish` / `workflow-skip-internal` écrivent désormais dans `org_settings`.
- `key-dates` : assertions par id (des marronniers plateforme homonymes existent).
- Unit : 146 verts. Build + lint + tsc verts.

## Limites connues (beta)

- `alert_thresholds` **partagé** entre toutes les organisations (défauts
  raisonnables ; personnalisation par org = post-beta).
- `job_runs` reste global (visible des Directeurs) — pas de donnée locataire
  sensible, juste des compteurs de jobs cron.
- Un marronnier `scope='global'` créé par un tenant appartient à **son** org (pas
  à la plateforme). Le moteur d'alertes rule (e) ne filtre pas encore par org sur
  ces marronniers tenant (fuite possible d'un **nom** de marronnier) — négligeable
  pour une beta de testeurs de confiance.

## Mise en production (jour du lancement)

1. Projet Supabase **prod neuf** (`rpiypshtjvloopmzsdce`) : `npm run db:apply`
   (toutes les migrations sur une base vierge → schéma multi-tenant d'emblée).
2. Déployer les Edge Functions (`admin-users`, `dispatch-emails`).
3. Secrets fonctions : `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` (URL Vercel).
4. Redirect URLs Supabase : `<APP_URL>/definir-mot-de-passe`,
   `<APP_URL>/rejoindre/*`, `<APP_URL>/valider/*`.
5. `.env` front (Vercel) : `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` du
   projet prod.
6. S'ajouter dans `platform_admins` (fait par la migration 0043 si le compte
   existe), puis inviter les agences beta via `invite_org`.
