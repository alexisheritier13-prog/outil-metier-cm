# Post-v1 : Configuration du compte + assistant de bienvenue

## Status

Done.

## Story

As a Directeur (compte qui paie la solution),
I want prérégler l'outil selon l'organisation de l'agence dès la première
connexion,
so that le circuit de validation, les réseaux et l'espace client correspondent
à ma façon de travailler sans réglage manuel dispersé.

## Contexte

Complète le réglage global « CM seul » (`app_settings.workflow`) et l'option
par client « ne valide pas les posts » (`clients.skip_client_review`, migr 0034).

## Acceptance Criteria

1. Un compte non configuré (`app_settings.account.onboarded !== true`) redirige
   l'Admin vers `/bienvenue` (assistant 3 étapes). Les rôles non-Admin ne sont
   pas bloqués. ✅
2. Étape 1 « Organisation » : Seul / En équipe (solo ⇒ `workflow.skip_internal_review = true`),
   + « mes clients valident les posts par défaut » (⇒ `default_skip_client_review`). ✅
3. Étape 2 « Réseaux » : sélection des réseaux proposés dans l'app (tous cochés
   par défaut, au moins un requis). ✅
4. Étape 3 « Votre agence » : nom + logo affichés dans l'espace client. ✅
5. « Passer » marque `onboarded = true` sans rien changer d'autre. ✅
6. Re-modifiable dans Paramètres › Compte (`/app/parametres/compte`). ✅
7. Application des préréglages : ✅
   - `defaultSkipClientReview` ⇒ case pré-cochée à la création d'un client.
   - `activeNetworks` ⇒ filtre le `<select>` réseau du formulaire de post et le
     filtre réseau du planning (le réseau courant d'un post reste toujours listé).
   - `agencyName` / `agencyLogoUrl` ⇒ en-tête d'accueil + pied de l'espace client.

## Implémentation

- Pas de migration : `app_settings` clé `account` (lecture = tout utilisateur
  actif, y compris les contacts du portail ; écriture Admin — policies 0006).
  Le service renvoie les valeurs par défaut si la ligne est absente.
- `src/services/accountSettings.ts` : `AccountSettings`, `getAccountSettings`,
  `saveAccountSettings` (merge partiel), `resolveActiveNetworks` (pur, jamais vide).
- `src/app/account/useAccount.ts` : `useAccountSettings`, `useActiveNetworks`.
- `src/app/account/OnboardingWizard.tsx` (route top-level `/bienvenue`),
  `src/app/settings/AccountSettingsPage.tsx` (`/app/parametres/compte`).
- Garde dans `AppLayout` ; lien dans `SettingsHome`.
- `scripts/seed-demo.mjs` pose `account` avec `onboarded: true`, agence
  « Studio Lumen ».

## Tests

- `src/services/__tests__/accountSettings.test.ts` : `resolveActiveNetworks`
  (null/vide/sous-ensemble/inconnus/repli).

## Reste possible (non fait)

- `activeNetworks` non appliqué aux formulaires de la bibliothèque (idée →
  post, template, marronnier) ni aux filtres du portail — volontaire (un
  template peut viser n'importe quel réseau).
- Assistant de première connexion réel : dépend du flux d'inscription (beta
  multi-tenant).
