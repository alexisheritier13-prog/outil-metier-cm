# Source Tree — outil-metier-cm

Structure cible du dépôt. Les agents dev créent les fichiers à ces emplacements ; ne pas
inventer d'autre organisation sans mettre à jour ce document et `docs/architecture.md`.

```plaintext
outil-metier-cm/
├── .github/workflows/
│   ├── ci.yaml                     # PR : lint + typecheck + test + test:rls
│   └── db-migrate.yaml             # main : supabase db push + functions deploy
├── public/                         # favicon, assets statiques
├── index.html
├── src/
│   ├── main.tsx                    # bootstrap React + providers
│   ├── router.tsx                  # routes /app/* et /portail/*
│   ├── app/                        # === APPLICATION INTERNE (cm / lead / admin) ===
│   │   ├── calendar/               # vues month/week/list/kanban, FiltersBar
│   │   ├── post/                   # PanneauDetail, EditeurPost, Historique, Commentaires
│   │   ├── review-queue/           # file "À valider" (onglets interne / client)
│   │   ├── clients/                # liste + fiche (SocialAccounts, Contacts, Charte, Onboarding, Activité)
│   │   ├── content/                # ideas/ templates/ key-dates/ campaigns/
│   │   ├── alerts/                 # page Alertes + badge
│   │   ├── settings/               # users/ alerts/ networks/ onboarding/ jobs/
│   │   └── trash/                  # corbeille (posts + clients)
│   ├── portal/                     # === ESPACE CLIENT (role client) ===
│   │   ├── calendar/               # calendrier + liste (lecture)
│   │   ├── post/                   # détail post vue client (commentaires 'client' only)
│   │   ├── review/                 # file "à valider" côté client
│   │   ├── published/              # historique des publiés
│   │   └── briefs/                 # espace brief (client_requests)
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (button, dialog, popover, tabs, …)
│   │   ├── PostCard.tsx  StatusBadge.tsx  NetworkIcon.tsx  ClientAvatar.tsx
│   │   └── CanvaPreview.tsx  CommentThread.tsx  BulkActionBar.tsx
│   ├── services/                   # SEULE couche qui importe @/lib/supabase
│   │   ├── posts.ts  clients.ts  contacts.ts  socialAccounts.ts  guidelines.ts
│   │   ├── onboarding.ts  campaigns.ts  tags.ts  comments.ts  history.ts
│   │   ├── ideas.ts  templates.ts  keyDates.ts  clientRequests.ts
│   │   ├── alerts.ts  settings.ts  users.ts  trash.ts  exports.ts  canva.ts
│   │   └── mappers.ts              # snake_case (DB) <-> camelCase (front)
│   ├── hooks/                      # TanStack Query : usePostsQuery, useChangeStatusMutation, …
│   ├── auth/
│   │   ├── SessionProvider.tsx  useCurrentProfile.ts  RequireRole.tsx  LoginPage.tsx
│   ├── shared/                     # importable par le front ET (par copie) les functions
│   │   ├── types/
│   │   │   ├── index.ts            # Post, Client, ClientContact, Alert, …
│   │   │   └── database.ts         # GÉNÉRÉ : supabase gen types (ne pas éditer à la main)
│   │   ├── schemas/                # Zod : postSchema, clientSchema, clientRequestSchema, …
│   │   ├── constants/              # networks, statuts, libellés FR, couleurs statut
│   │   └── utils/
│   │       ├── tz.ts               # conversions Europe/Paris <-> UTC
│   │       ├── transitions.ts      # miroir TS de can_transition (SQL = source de vérité)
│   │       ├── canva-parser.ts     # extraction og:image (pur, testé)
│   │       ├── alerts-rules.ts     # calcul des cibles d'alertes (pur, testé)
│   │       └── ics.ts              # génération .ics
│   ├── lib/
│   │   ├── supabase.ts             # createClient<Database>
│   │   ├── queryClient.ts          # config TanStack Query
│   │   ├── uiStore.ts              # Zustand (filtres, sélection, vue)
│   │   ├── i18n.ts
│   │   └── errors.ts               # toAppError, ErrorBoundary
│   └── styles/
│       └── globals.css             # directives Tailwind + tokens
├── supabase/
│   ├── config.toml
│   ├── seed.sql                    # networks + specs, modèle onboarding, seuils d'alertes
│   ├── migrations/                 # 0001_init.sql, 0002_posts.sql, … (additif, horodaté)
│   └── functions/
│       ├── _shared/                # cors.ts, auth-guard.ts, canva-parser.ts (copie)
│       ├── canva-preview/index.ts
│       ├── export-pdf/index.ts
│       └── run-job/index.ts        # repli HTTP pour generate_alerts / purge_trash
├── tests/
│   ├── unit/                       # Vitest : transitions, canva-parser, alerts-rules, ics
│   ├── rls/                        # pgTAP / SQL : isolation par table + RPC
│   │   └── rpc/
│   └── e2e/                        # Playwright : auth-and-calendar, validation-cycle, client-approval
├── docs/
│   ├── brief.md
│   ├── prd.md
│   ├── architecture.md
│   ├── architecture/
│   │   ├── coding-standards.md
│   │   ├── tech-stack.md
│   │   └── source-tree.md
│   ├── prd/                        # (généré par shard-doc)
│   ├── architecture/               # (shards additionnels éventuels)
│   └── stories/                    # (généré par l'agent SM, une story par fichier)
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Conventions d'emplacement

- **Un accès Supabase = un fichier `src/services/`.** Les composants importent des hooks
  (`src/hooks/`), les hooks importent des services, les services importent `@/lib/supabase`.
- **Types :** toujours depuis `@/shared/types`. `database.ts` est régénéré après chaque
  migration, jamais édité à la main.
- **Logique métier pure et testable :** `src/shared/utils/` (aucun import React/Supabase).
- **Écrans internes** sous `src/app/…`, **écrans client** sous `src/portal/…`. Un composant
  partagé va dans `src/components/`.
- **Migrations :** `supabase/migrations/`, créées via `supabase migration new`, jamais
  modifiées après merge.
- **Edge Functions :** un dossier par fonction sous `supabase/functions/`, code Deno
  (imports URL), pas d'accès au `node_modules` du front.
- **Stories BMad :** générées dans `docs/stories/` par l'agent SM à partir des epics du PRD.
