# outil-metier-cm

Outil métier de Community Management pour agence — planification multi-clients, workflow de
validation interne puis client, organisation du contenu. Application web hébergée
(SPA React + Vite + Supabase). Remplace Notion.

## État

- Phase **planning BMad** terminée — voir `docs/`.
- **Story 1.1** faite : base technique (Vite + React + TS strict + Tailwind + shadcn/ui,
  ESLint/Prettier, Vitest, page canari, CI GitHub Actions).
- **Story 1.2** faite : couche Supabase (client typé, migration `0001`, services), vérifiée
  contre le projet cloud.
- **Story 1.3** faite : `profiles` / `clients` / `user_clients`, rôles, fonctions
  d'autorisation, **RLS d'isolation** + 9 tests d'isolation verts.
- **Story 1.4** faite : écran de connexion, gardes de routes par rôle, redirection,
  déconnexion, persistance de session.
- **Story 1.5** faite : Edge Function `admin-users`, écran `/app/parametres/utilisateurs`.
  **Epic 1 terminé.**
- **Spec UX** : `docs/front-end-spec.md` (IA, parcours, design system).
- **Design system** : palette monochrome (noir & blanc), Inter self-host, `StatusBadge` /
  `EmptyState` / `ClientAvatar` / `Tabs`.
- **Story 2.1** faite : référentiel clients — liste, fiche à onglets, création/édition,
  archivage.
- **Story 2.2** faite : comptes sociaux du client (table `networks` + onglet).
- **Story 2.3** faite : contacts de validation + invitation via Edge Function.
- **Story 2.4** faite : charte éditoriale par client (onglet « Charte »).
- **Story 2.5** faite : checklist d'onboarding (modèle par défaut, auto-seed à la création
  client, onglet « Onboarding », avancement `x/y`).
- **Story 2.6** faite : liste clients avec indicateurs. **Epic 2 terminé.**
- **Story 3.1** faite : modèle de post + CRUD, `PostForm` (heure de Paris), vue liste sur `/app`.
- **Story 3.2** faite : pipeline de statuts — table `post_transitions`, `can_transition`
  SQL + miroir TS (test de parité), RPC `post_change_status`.
- **Story 3.3** faite : calendrier `/app` — `PlanningPage` (Mois / Semaine / Liste),
  FullCalendar (lazy), panneau latéral `PostSheet`, drag & drop de re-planification. 101 tests.
- **Story 3.4** faite : vues Liste (triable, virtualisée) et Kanban (drag entre colonnes → `can_transition`). 102 tests.
- **Story 3.5** faite : barre de filtres transverse (client/statut/réseau/période/recherche), persistée dans l'URL + localStorage. 110 tests.
- **Story 3.6** faite : duplication de post, tags (à la volée), campagnes (`/app/campagnes`). 114 tests.
- **Story 3.7** faite : corbeille (`/app/corbeille`), règles FR45, `purge_trash()` 60j. **Epic 3 terminé** — 122 tests.
- **Stories 4.1 + 4.2** faites : Edge Function `canva-preview` (récupère l'og:image d'un lien Canva public) + `CanvaField` (auto + miniature manuelle + aperçu iframe). 137 tests.
- **Stories 4.3 à 4.5** faites : rappel des specs réseau, historique du post (triggers), fil de commentaires (interne / visible client). **Epic 4 terminé** — 141 tests.
- **Story 5.1** faite : validation interne (Lead) — actions nommées dans le panneau (`StatusActions` : « Soumettre à la validation interne », « Valider en interne », « Renvoyer au rédacteur » avec commentaire obligatoire), table `notifications` + émission aux étapes du workflow (`notify()`, RPC `post_change_status`). 146 tests.
- **Story 5.2** faite : envoi au client — rappel de visibilité dans le fil de commentaires ; RLS client + transitions de retour déjà en place (consolidation).
- **Story 5.3** faite : approbation / refus client — RPC `approve_post` / `reject_post` (contact du client, statut « à valider client » uniquement), commentaire système + notification au rédacteur. 151 tests. UI portail = Epic 6.
- **Story 5.4** faite : file « À valider » (`/app/a-valider`) — onglets interne / client, tri par ancienneté, actions rapides (ouvrir, valider en interne, relancer le client via `remind_client_review`), pastille de compteur dans la navigation. 157 tests.
- **Story 5.5** faite : journal d'activité par client — vue `client_activity`, onglet « Activité » de la fiche client (filtres type + période) ; `client_overview` recâblée sur les vrais compteurs `pending_*` / `last_activity_at`. **Epic 5 terminé** — 163 tests.
- **Stories 6.1 + 6.2** faites : espace client `/portail` — layout isolé (RLS `clients_select_contact`, migr 0021), sélecteur multi-clients, calendrier mois/liste (lecture), détail post client (`PortalPostDetail`, échanges `client` uniquement). Test d'isolation A≠B central. 171 tests.
- **Story 6.3** faite : approbation / refus + commentaires côté client — boutons Approuver / Demander une modification (RPC 5.3), fil de commentaires client, file `/portail/a-valider` + compteur nav. 175 tests. (E2E Playwright → Epic 9.)
- **Story 6.4** faite : historique des publiés côté client (`/portail/publies`) — recherche mot-clé + filtres réseau/période, note de perf masquée si non partagée (`redactClientPost`), accès maintenu après archivage. 181 tests.
- **Story 6.5** faite : espace brief client → agence — `client_requests` + commentaires (migr 0022), page client `/portail/briefs` (créer / modifier si nouvelle / suivre), page interne `/app/demandes` (statut + « Transformer en post » via RPC `request_to_post`). **Epic 6 terminé.**
- **Story 7.1** faite : banque d'idées (`/app/idees`) — `ideas` + `idea_tags` (migr 0023), filtres client/tag/mot-clé, création/édition/suppression définitive, « Transformer en post » (RPC `idea_to_post`). Idée sans client visible de tous les internes.
- **Story 7.2** faite : templates de posts (`/app/templates`) — `post_templates` (migr 0024, portée global/client), CRUD + aperçu, « Partir d'un template » dans l'éditeur (pré-remplit réseau/légende/tags).
- **Story 7.3** faite : marronniers (`/app/marronniers`) — `key_dates` (migr 0025, portée global/secteur/client), résolution `key_dates_for_client`, surimpression discrète sur le calendrier (case à cocher), « Planifier » (RPC `key_date_to_post`).
- **Story 7.4** faite : traçabilité origine ↔ post — `posts.origin_type`/`origin_id` exposés, ligne « Origine » dans le détail post + « Posts générés » côté idée/demande ; origine supprimée → « origine supprimée ». **Epic 7 terminé.**
- Prochaine : Epic 8 (alertes in-app + jobs planifiés).

### Tests

- `npm run test` — unitaires, rapides, exécutés en CI.
- `npm run test:rls` — intégration DB (un seul projet Supabase → **exécution en série**),
  auto-skip sans `.env.test.local`.

## Documentation

| Fichier | Contenu |
|---|---|
| `docs/brief.md` | Brief projet |
| `docs/prd.md` | PRD — 9 epics, stories + critères d'acceptation |
| `docs/architecture.md` | Architecture fullstack (Supabase, RLS, Edge Functions) |
| `docs/architecture/coding-standards.md` · `tech-stack.md` · `source-tree.md` | Socle dev |
| `docs/stories/` | Stories générées (SM) et implémentées (dev) |

## Stack

React 18 · TypeScript 5.5 (strict) · Vite 5 · Tailwind 3 · shadcn/ui (Radix) ·
React Router 6 · Vitest + Testing Library. Backend (à partir de la Story 1.2) : Supabase
(PostgreSQL + RLS + Auth + Edge Functions). Détail : `docs/architecture/tech-stack.md`.

## Développement local

```bash
npm install
cp .env.example .env.local        # VITE_SUPABASE_* seront nécessaires à partir de la Story 1.2
npm run dev                       # http://localhost:5173
```

### Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de dev Vite |
| `npm run build` | Typecheck (`tsc -b`) + build statique dans `dist/` |
| `npm run preview` | Sert le build de `dist/` |
| `npm run lint` | ESLint (flat config, jsx-a11y) |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run test` | Vitest (une passe) |
| `npm run test:watch` | Vitest en watch |
| `npm run format` | Prettier --write |

### Variables d'environnement

`.env.local` (préfixe `VITE_`, exposées au client) :

| Variable | Requis | Usage |
|---|---|---|
| `VITE_SUPABASE_URL` | dès Story 1.2 | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | dès Story 1.2 | Clé anon (publique) Supabase |
| `VITE_SENTRY_DSN` | non | Monitoring erreurs front |

## Base de données (Supabase)

Le schéma vit dans `supabase/migrations/` (fichiers SQL horodatés, additifs).

Appliquées sur le projet cloud via l'**API Management** (pas besoin du mot de passe DB) :

```bash
npm run db:apply          # applique supabase/migrations/*.sql (idempotent)
npm run db:apply 0004     # seulement les migrations préfixées 0004
npm run gen:types         # régénère src/shared/types/database.ts
```

Requiert dans `.env.test.local` (non versionné) : `SUPABASE_ACCESS_TOKEN` (jeton perso
Supabase) et `SUPABASE_PROJECT_REF`.

Alternative Docker (si installé) : `supabase start` + `supabase db reset`.

### Edge Functions

```bash
npm run functions:deploy              # déploie toutes les fonctions (sans Docker)
npm run functions:deploy admin-users  # une seule
```

`admin-users` : opérations sur les comptes réservées à l'Admin (création d'utilisateur
interne). Les variables `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
sont injectées automatiquement par la plateforme.

Tests d'intégration / RLS : `npm run test:rls` (`tests/integration/`) — ignorés
automatiquement si `.env.test.local` absent ou si la migration concernée n'est pas encore
appliquée. Nécessite `SUPABASE_TEST_SERVICE_ROLE_KEY` pour provisionner des utilisateurs de
test. Voir `tests/integration/README.md`.

## CI

`.github/workflows/ci.yaml` : sur chaque PR et push `main` → `npm ci` puis `lint`,
`typecheck`, `test`, `build`. Les tests RLS (pgTAP) seront câblés dès que les premières
tables réelles arrivent (Story 1.3).

## Déploiement (à faire — action manuelle)

Non automatisé pour l'instant (compte requis). Sur **Vercel** :

1. Importer le dépôt GitHub.
2. Framework preset : **Vite**. Build command : `npm run build`. Output directory : `dist`.
3. Rewrite SPA : ajouter `vercel.json` avec
   `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
4. `main` = production ; chaque PR génère une preview automatiquement.
5. Renseigner `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` dans les variables du projet
   Vercel une fois la Story 1.2 faite.

## Workflow BMad — suite

1. `/sm` → `create-next-story` (Story 1.2) dans `docs/stories/`
2. `/dev` implémente → `/qa` relit
3. répéter story par story

Guide : `.bmad-core/user-guide.md`.
