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
- **Story 2.6** faite : liste clients avec indicateurs (vue `client_overview`, colonnes
  triables). **Epic 2 terminé** — 87 tests verts.
- Prochaine : Epic 3 (posts & calendrier multi-clients).

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
