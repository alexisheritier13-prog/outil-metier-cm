# Post-v1 — Outils d'administration plateforme

**Statut :** livré (migration 0049). Appliquée staging + prod (schema_version 49).

## Contexte

En corrigeant à la main le compte d'une testeuse bloquée (contact client créé
avec sa propre adresse — bug corrigé séparément dans `admin-users`), l'écran
`/app/plateforme` s'est révélé insuffisant : impossible de savoir qui dirige
une agence, si elle est encore active, de révoquer une invitation, ou de
réinitialiser une agence sans passer par du SQL direct en prod.

## Ce qui a été fait — migration 0049

- **`platform_list_organizations()`** enrichie : `ownerName` / `ownerEmail` (le
  Directeur, pour savoir qui contacter), `posts` (volume), `lastActivityAt`
  (dernière modification d'un post, repli sur la date de création).
- **`platform_revoke_invitation(token)`** : supprime un lien pas encore accepté.
- **`platform_reset_organization(org)`** : généralise le correctif manuel fait
  pour la testeuse — supprime les posts puis l'organisation (clients, campagnes…
  cascadent), et **détache + réinitialise ses membres** (`organization_id =
  null`, `role = 'cm'`, `is_active = false`) sans supprimer leurs comptes de
  connexion, prêts à être ré-invités.

Toutes réservées à `is_platform_admin()`.

## Front (`PlatformPage`)

- 3 tuiles de synthèse : agences, créées cette semaine, posts créés au total.
- Table Agences enrichie : colonne Directeur (nom + e-mail), Posts, Dernière
  activité (`relativeAge`), bouton **« Réinitialiser »** par ligne (confirmation
  native, nomme l'agence).
- Chaque invitation en attente a un bouton **« Révoquer »**.
- Fix associé : les 3 sections de la page (invitations / retours / agences)
  n'avaient aucun espacement entre elles (`<section>` frères sous `<Page>`, qui
  n'ajoute pas de `space-y-*`) — enveloppées dans `space-y-6`.

## Tests

Vérifié sur staging via script : `platform_list_organizations` renvoie les
nouveaux champs, `platform_revoke_invitation` supprime bien l'invitation,
`platform_reset_organization` supprime l'organisation et remet le profil du
propriétaire à l'état par défaut (`role='cm'`, `is_active=false`,
`organization_id=null`).
