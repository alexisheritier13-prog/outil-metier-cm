# outil-metier-cm

Outil métier de Community Management pour agence — planification multi-clients, workflow de
validation interne puis client, organisation du contenu. Application web hébergée
(SPA React + Vite + Supabase). Remplace Notion.

## État

Phase **planning BMad** terminée. Développement pas encore commencé.

- `docs/brief.md` — brief projet
- `docs/prd.md` — Product Requirements Document (9 epics, stories + critères d'acceptation)
- `docs/architecture.md` — architecture fullstack (Supabase, RLS, Edge Functions)
- `docs/architecture/coding-standards.md` · `tech-stack.md` · `source-tree.md` — socle dev

## Stack (voir `docs/architecture/tech-stack.md`)

React 18 + TypeScript + Vite + Tailwind + shadcn/ui · TanStack Query · Supabase
(PostgreSQL + RLS + Auth + Edge Functions) · pg_cron · Playwright / Vitest / pgTAP.

## Workflow BMad — prochaines étapes

1. (optionnel) `/ux-expert` → `docs/front-end-spec.md`
2. `/po` — exécuter la checklist maître, valider la cohérence PRD ↔ architecture
3. `/po` ou `/analyst` — `shard-doc` sur `docs/prd.md` et `docs/architecture.md` vers `docs/prd/` et `docs/architecture/`
4. `/sm` — `create-next-story` (Epic 1, Story 1.1) → `docs/stories/`
5. `/dev` — implémenter la story ; `/qa` — relire
6. répéter 4–5 story par story

Guide complet : `.bmad-core/user-guide.md`.

## Développement local (une fois le code initialisé)

```bash
npm install
cp .env.example .env.local        # renseigner VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
supabase start
supabase db reset
npm run dev
```
