# outil-metier-cm

Outil métier de Community Management pour agence — planification multi-clients, workflow de
validation interne puis client, organisation du contenu. Application web hébergée
(SPA React + Vite + Supabase). Remplace Notion.

## État

- Phase **planning BMad** terminée — voir `docs/`.
- **Story 1.1** faite : base technique (Vite + React + TS strict + Tailwind + shadcn/ui,
  ESLint/Prettier, Vitest, page canari, CI GitHub Actions).
- Prochaine : Story 1.2 (Supabase + migrations).

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

## CI

`.github/workflows/ci.yaml` : sur chaque PR et push `main` → `npm ci` puis `lint`,
`typecheck`, `test`, `build`. (Les tests RLS `test:rls` seront ajoutés en Story 1.2.)

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
