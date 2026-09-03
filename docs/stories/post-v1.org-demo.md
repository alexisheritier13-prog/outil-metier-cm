# Post-v1 — Jeu de démonstration par organisation

**Statut :** livré (migration 0048). Appliquée staging + prod (schema_version 48).

## Contexte

Une nouvelle agence qui rejoint Cadence tombe sur une page blanche. On veut
qu'elle ait tout de suite **un exemple concret** à explorer (un client, des
posts à tous les stades du circuit, une campagne, des rubriques), et un bouton
pour **tout supprimer d'un coup** quand elle n'en a plus besoin.

## Ce qui a été fait — migration 0048

- **`clients.is_demo`** (boolean, défaut false). Backfill : les clients existants
  nommés « … (démo) » sont marqués (couvre la démo de la prod).
- **`seed_org_demo(p_org, p_author)`** (SECURITY DEFINER, idempotent) : crée un
  client « Studio Lumen (démo) » (`is_demo = true`) + 3 rubriques (Produit /
  Coulisses / Inspiration) + 1 campagne + **7 posts** couvrant tous les statuts
  (`draft` → `published`). `organization_id` des enfants rempli par les triggers
  `tenant_fill_*`. Ne fait rien si l'organisation a déjà un client de démo.
- **`accept_org_invitation`** appelle `seed_org_demo` à la fin (dans un bloc
  `exception … null` : si le seed échoue, l'inscription aboutit quand même).
- **`delete_org_demo()`** (SECURITY DEFINER) : réservé au **Directeur** de
  l'organisation. Supprime les posts des clients de démo (FK `on delete restrict`)
  puis les clients de démo (le reste — rubriques, campagne, etc. — casse en
  cascade). Renvoie le nombre de clients supprimés.

## Front

- `Client.isDemo` + mapper. `deleteOrgDemo()` dans `services/clients.ts`.
- **`ClientsPage`** : bandeau (Directeur only, si un client de démo existe)
  « … est un client fictif pour explorer Cadence » + bouton **« Supprimer la
  démo »** (confirm). Puce « démo » à côté du nom dans le tableau.

## Tests

Vérifié sur staging via script : `seed_org_demo` (7 posts, org stampée,
idempotent) et `delete_org_demo` appelé par un admin authentifié (renvoie 1,
client + posts supprimés).

## Limites

- Le seed n'ajoute pas de contacts / d'utilisateur portail (créer un compte Auth
  depuis SQL est lourd) ni de visuels (upload Storage impossible en SQL).
