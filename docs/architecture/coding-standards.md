# Coding Standards — outil-metier-cm

Standards minimaux mais impératifs pour les agents dev. En cas de doute, `docs/architecture.md`
fait foi.

## Règles critiques (à ne jamais enfreindre)

1. **Autorisation en base.** Toute table métier a RLS activé + policies. Une nouvelle table
   arrive dans la même PR que ses policies **et** un test pgTAP d'isolation
   (`tests/rls/`). Pas de policy = PR bloquée.
2. **Transitions de statut via RPC.** Jamais `update posts set status = …` depuis le front.
   Utiliser `post_change_status` ou les RPC dédiées (`approve_post`, `reject_post`,
   `post_schedule`, …).
3. **Accès données uniquement via `src/services/`.** Aucun composant, page ou hook n'importe
   `@/lib/supabase` directement. Les composants ne manipulent que des types de
   `src/shared/types`.
4. **Fuseau horaire explicite.** `scheduled_at` = `timestamptz` en UTC. Affichage/saisie en
   `Europe/Paris` via `src/shared/utils/tz.ts`. Interdit : `new Date(str)` pour une valeur
   métier affichée, `toLocaleString` sans timezone.
5. **Types partagés générés.** Après toute migration : `npm run gen:types`. Les formes de
   données viennent de `src/shared/types` (dont `database.ts`).
6. **Zod à chaque frontière.** Formulaires (react-hook-form + resolver Zod) et réponses
   d'Edge Functions validés par un schéma de `src/shared/schemas/`.
7. **La miniature Canva ne bloque jamais.** L'enregistrement d'un post n'attend pas
   `canva-preview`. L'échec est un état d'UI (message + champ manuel + iframe), pas une
   exception.
8. **Jobs idempotents.** `generate_alerts` / `purge_trash` doivent pouvoir tourner deux fois
   de suite sans doublon ni effet de bord (clé `dedupe_key`).
9. **Soft delete respecté.** Toute liste filtre `deleted_at is null` (ou passe par une vue
   qui le fait). La restauration rétablit l'état exact d'avant suppression.
10. **Aucun secret côté client.** Seules `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
    sont dans le bundle. `SERVICE_ROLE_KEY` : Edge Functions et CI uniquement.
11. **Accessibilité par défaut.** Élément interactif = rôle + label. Le statut est porté par
    texte + icône (jamais la couleur seule). `eslint-plugin-jsx-a11y` sans erreur.
12. **`can_transition` a deux implémentations qui doivent rester synchrones :** la version
    SQL (source de vérité, dans une migration) et le miroir TS
    (`src/shared/utils/transitions.ts`, pour griser les boutons). Un test unitaire compare
    les deux tables.

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`. Pas de `any` (préférer `unknown` +
  narrowing). `as` seulement avec justification en commentaire.
- Exports nommés uniquement (pas de `export default`), sauf exigence d'outil.
- Imports via alias `@/…` (configuré dans `vite.config.ts` + `tsconfig.json`).
- Pas de logique métier dans les composants : la mettre dans `src/shared/utils/` (pur,
  testé) ou dans un hook.

## React

- Composants fonctionnels. Un composant = un fichier PascalCase.
- Données serveur : `useQuery`/`useMutation` (TanStack Query) via un hook `src/hooks/`.
  Jamais de `useEffect` + `fetch` maison.
- État UI transverse (filtres, sélection, vue calendrier) : store Zustand `src/lib/uiStore.ts`.
  État local simple : `useState`.
- Pas de duplication d'état : une valeur vient de l'URL, du store ou d'une query — pas d'une
  copie locale non dérivée.
- Mutations optimistes obligatoires pour : drag & drop calendrier, changement de statut,
  cases onboarding. Toujours prévoir le rollback `onError`.
- Listes longues (liste posts, kanban) : virtualisation (`@tanstack/react-virtual`).

## Styles

- Tailwind uniquement ; pas de CSS module ni styled-components. Classes ordonnées
  (prettier-plugin-tailwindcss).
- Primitives via `src/components/ui/` (shadcn). Ne pas réimplémenter un dialog/popover/menu
  à la main (accessibilité).
- Vues liste/calendrier : **pas** de `max-w-*` étroit ni `mx-auto` centré — exploiter la
  largeur de l'écran (préférence utilisateur, écran 32").

## SQL / Supabase

- Migrations additives, horodatées (`supabase migration new <nom>`). Jamais d'édition d'une
  migration déjà mergée.
- Nommage : tables `snake_case` pluriel, colonnes `snake_case`, enums `snake_case_t`,
  fonctions `snake_case` en verbe.
- RPC métier : `security definer`, `set search_path = public`, `for update` sur la ligne
  cible, journalisation `post_history` quand pertinent, `raise exception … using errcode`.
- `post_history` et `job_runs` sont append-only (pas de policy update/delete).
- Chaque migration qui touche une policy ou une RPC ajoute/complète un test dans
  `tests/rls/`.

## Nommage (rappel)

| Élément | Convention | Exemple |
|---|---|---|
| Composant | PascalCase | `ReviewQueue.tsx` |
| Hook | camelCase `use…` | `usePostsQuery.ts` |
| Service | camelCase | `services/alerts.ts` |
| Table | snake_case pluriel | `client_requests` |
| Fonction SQL | snake_case verbe | `generate_alerts` |
| Edge Function | kebab-case | `export-pdf` |
| Type partagé | PascalCase | `ClientContact` |

## Tests (attendu par story)

- Toute logique métier pure (transitions, règles d'alertes, parser Canva, export ICS) : test
  Vitest.
- Toute policy RLS nouvelle ou modifiée : test pgTAP d'isolation (client A vs B, cm assigné
  vs non).
- Toute RPC : test du chemin nominal + au moins un rejet (mauvais rôle ou mauvais état).
- Les 3 specs Playwright (`auth-and-calendar`, `validation-cycle`, `client-approval`) doivent
  rester vertes.

## Git / PR

- Branche par story : `epicN/storyN.M-slug`. Commits en français, impératif.
- Une PR = une story. La PR liste les AC couvertes et coche celles vérifiées.
- CI verte obligatoire (lint + typecheck + test + test:rls) avant merge.
- Message de commit terminé par : `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
