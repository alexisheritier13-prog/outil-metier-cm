# Post-v1 : Gestion de l'e-mail et du mot de passe

## Status

Done.

## Story

As a Directeur,
I want gérer l'e-mail et le mot de passe des comptes internes et des contacts
client, et permettre à chacun de définir son mot de passe,
so that les accès sont utilisables sans dépendre d'un envoi d'e-mail encore
absent.

## Contexte

Il n'y a pas encore d'e-mail transactionnel ni d'auto-inscription. Les liens
d'invitation étaient générés mais aucune page ne permettait de poser un mot de
passe, et rien ne permettait de changer un e-mail.

## Acceptance Criteria

1. **Directeur** — par utilisateur interne (Paramètres › Utilisateurs) et par
   contact ayant un compte (fiche client › Contacts) : ✅
   - changer l'e-mail (appliqué immédiatement, `email_confirm`, synchronisé sur
     `profiles.email` et `client_contacts.email`) ;
   - définir un mot de passe (8 caractères min) ;
   - « Générer un lien » : URL de définition de mot de passe à transmettre.
   - Réservé au rôle `admin` (l'Edge Function refuse les autres → 403).
2. **Chacun** — `/app/mon-compte` (interne) et `/portail/mon-compte` (contact) :
   nom, photo, **changement de son mot de passe** (session active, sans
   e-mail). Accès via le bloc utilisateur de la sidebar / le nom dans l'en-tête
   du portail. ✅
3. **Atterrissage des liens** — `/definir-mot-de-passe` : consomme le jeton
   `recovery`, propose « choisir un mot de passe » puis redirige selon le rôle ;
   message clair si le lien est invalide / expiré. ✅
4. **Connexion** — « Mot de passe oublié ? » ouvre un mini-formulaire e-mail
   (`resetPasswordForEmail`, redirect vers `/definir-mot-de-passe`), message
   neutre (pas d'énumération de comptes). ✅

## Implémentation

- Edge Function `admin-users` — nouvelle action `update_user`
  (`email?` / `password?` / `sendLink?` / `redirectTo?`) ; `create` et
  `invite_contact` acceptent désormais `redirectTo` transmis à `generateLink`.
  **Redéployée.**
- `src/services/users.ts` : `updateUserCredentials`. `src/services/auth.ts` :
  `updateMyPassword`, `requestPasswordReset`. `src/lib/authRedirect.ts` :
  `SET_PASSWORD_PATH` + `setPasswordRedirectUrl()`.
- `src/app/settings/CredentialsSheet.tsx` (partagé Utilisateurs / Contacts),
  `src/app/account/MyAccountPage.tsx`, `src/auth/SetPasswordPage.tsx`.
- Routes : `/definir-mot-de-passe` (public), `/app/mon-compte`,
  `/portail/mon-compte`.

## Tests

- `tests/integration/admin-users.integration.test.ts` : `update_user` change
  e-mail + mot de passe et permet la reconnexion ; un CM est refusé (403).

## Config Supabase requise (action utilisateur)

- **Redirect URLs** autorisées : ajouter `<domaine>/definir-mot-de-passe`
  (+ `http://localhost:5173/definir-mot-de-passe` en dev). Sinon les liens
  retombent sur la Site URL.
- « Mot de passe oublié ? » n'envoie un e-mail que si un SMTP est configuré
  (Auth › Email). Sans SMTP : le Directeur passe par « Générer un lien ».
