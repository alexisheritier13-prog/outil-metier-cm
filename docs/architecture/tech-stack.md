# Tech Stack — outil-metier-cm

Source de vérité des technologies et versions. Tout écart doit être décidé explicitement et
reporté ici **et** dans `docs/architecture.md`.

## Vue d'ensemble

SPA React (Vite) hébergée en statique + Supabase comme backend complet (PostgreSQL + RLS +
Auth + Edge Functions). Aucun serveur applicatif maison. Aucune API tierce payante.
Notifications in-app uniquement en v1.

## Frontend

| Rôle | Techno | Version | Notes |
|---|---|---|---|
| Langage | TypeScript | 5.5.x | `strict`, `noUncheckedIndexedAccess` |
| Framework UI | React | 18.3.x | |
| Build / bundler | Vite | 5.4.x | build statique `dist/`, pas de SSR |
| Routing | React Router | 6.26.x | `/app/*` interne, `/portail/*` client |
| État serveur | TanStack Query | 5.x | source unique des données serveur |
| État UI | Zustand | 4.x | filtres, sélection, vue calendrier |
| Formulaires | react-hook-form | 7.x | + resolver Zod |
| Validation | Zod | 3.23.x | schémas partagés `src/shared/schemas` |
| Styles | Tailwind CSS | 3.4.x | + prettier-plugin-tailwindcss |
| Primitives UI | shadcn/ui (Radix) | radix 1.x | dialog, popover, menu, tabs… |
| Calendrier | @fullcalendar/react | 6.1.x | vues mois/semaine, drag & drop, locale FR |
| Drag & drop | dnd-kit | 6.x | kanban, réordonnancements |
| Virtualisation | @tanstack/react-virtual | 3.x | listes longues |
| Dates | date-fns + date-fns-tz | 3.x | fuseau `Europe/Paris` explicite |
| i18n | i18next + react-i18next | 23.x | FR seul en v1, textes centralisés |
| Export ICS | `ics` | 3.x | génération côté client |
| Monitoring | @sentry/react | 8.x | tier gratuit, optionnel en dev |

## Backend (Supabase)

| Rôle | Techno | Version | Notes |
|---|---|---|---|
| Base de données | PostgreSQL (Supabase) | 15.x | RLS = toute l'autorisation |
| Accès données | PostgREST via `@supabase/supabase-js` | 2.45.x | CRUD borné RLS |
| Logique métier | Fonctions RPC SQL | — | `security definer`, transitions & validations |
| Auth | Supabase Auth (GoTrue) | plateforme | email/mot de passe, JWT |
| Serverless | Supabase Edge Functions (Deno) | Deno 1.4x | `canva-preview`, `export-pdf`, `run-job` |
| Ordonnancement | pg_cron + pg_net | extensions | jobs quotidiens/horaires |
| Extensions PG | `pgcrypto`, `citext`, `pg_trgm` | — | UUID, emails, recherche |
| PDF | `@react-pdf/renderer` (Deno) | 3.x | rendu côté Edge `export-pdf` |
| Parser HTML (Canva) | `deno-dom` ou regex `<meta>` | — | extraction `og:image` |

## Outillage / CI

| Rôle | Techno | Version |
|---|---|---|
| Tests unitaires | Vitest + React Testing Library | vitest 2.x / RTL 16.x |
| Tests RLS/DB | pgTAP (via Supabase CLI) | 1.3.x |
| Tests E2E | Playwright | 1.47.x |
| Lint | ESLint + typescript-eslint + eslint-plugin-jsx-a11y | 9.x |
| Format | Prettier | 3.3.x |
| CI/CD | GitHub Actions | — |
| Hébergement front | Vercel ou Netlify | — |
| CLI backend | supabase | ≥ 1.190 |

## Prérequis machine

- Node.js ≥ 20
- Docker (pour `supabase start`)
- `supabase` CLI (global ou `npx`)

## Interdits en v1 (rappel périmètre)

- Pas d'upload / stockage de fichiers (Supabase Storage non utilisé).
- Pas d'API réseaux sociaux (Meta / LinkedIn).
- Pas d'API Canva Connect (payante).
- Pas d'envoi d'email / Slack (notifications in-app seulement).
- Pas de génération de contenu IA.
- Pas d'outil de monorepo (Nx/Turborepo) : un seul `package.json` applicatif.
