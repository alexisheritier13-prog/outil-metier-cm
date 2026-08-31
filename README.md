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
- **Spec UX** : `docs/front-end-spec.md` (IA, parcours). `PRODUCT.md` / `DESIGN.md`
  (racine) : contexte produit + système visuel pour l'agent design (`impeccable`).
- **Design system** : neutres monochromes (noir & blanc) + **couleur strictement
  sémantique** (vert succès · ambre attention · rouge danger · bleu info — tokens OKLCH
  dans `globals.css`, jamais la couleur seule). Inter self-host. `StatusBadge` (ton par
  statut), `EmptyState`, `Tabs`.
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
- **Stories 8.1 + 8.2** faites : alertes in-app — table `alerts` + page `/app/alertes` + badge nav (migr 0026), moteur `generate_alerts()` (FR36 a–g, idempotent via `dedupe_key`, fermeture auto des alertes caduques, trace `job_runs`), bouton « Lancer la détection » (Lead/Admin).
- **Story 8.3** faite : seuils configurables (`app_settings.alert_thresholds`, migr 0027), page `/app/parametres/alertes` (Admin, bornes de validation) ; index `/app/parametres`.
- **Story 8.4** faite : `pg_cron` planifie `generate_alerts` (nuit + horaire) et `purge_trash` (nuit) (migr 0028), page `/app/parametres/jobs` (journal `job_runs`), notification d'échec aux Admins. **Epic 8 terminé.**
- **Passe couleur sémantique** faite (`impeccable colorize`) : tokens `--success` / `--warning` / `--danger` / `--info` (OKLCH), statuts de post et sévérité d'alertes colorés, boutons `success` / `destructive`, badge « Alertes » rouge. Le reste reste noir & blanc. `PRODUCT.md` + `DESIGN.md` ajoutés.
- **Refonte coquille « SaaS »** faite : barre latérale (`AppSidebar`, groupes repliables), dashboard d'accueil (`/app`), calendrier déplacé sur `/app/planning`, accent indigo, portail client réaligné, dates lisibles FR (`10 sept. 2026`).
- **Story 9.1** faite : sélection multiple + actions en masse (Liste et Kanban) — barre flottante `BulkActionBar` (dupliquer / statut / réassigner / corbeille), exécution atomique par post avec récapitulatif des échecs (`useBulkActions`). Aucune migration (réutilise les RPC unitaires). 16 tests unitaires + 3 d'intégration.
- **Story 9.2** faite : export `.ics` du calendrier filtré (bouton dans `/app/planning`) — générateur pur `postsToIcs` conforme RFC 5545 (VTIMEZONE Europe/Paris, échappement, pliage), `downloadTextFile`. 10 tests unitaires, zéro dépendance ajoutée.
- **Story 9.3** faite : export PDF du calendrier client — route imprimable autonome `/app/clients/:id/export` (période dans l'URL) + « Enregistrer en PDF » du navigateur, bouton sur la fiche client. Décision (ni Edge Function ni `react-pdf`) documentée dans `docs/architecture.md`. 2 tests composant.
- **Story 9.4** faite : note de performance éditable sur les posts publiés (panneau de détail), visibilité client explicite (interne par défaut), filtre « Avec note de perf » (`?perf=1`) + affichage dans la vue liste, note reprise dans l'espace client. Migration 0029 (journalisation de la visibilité). 10 tests unit + 4 intégration.
- Prochaine : Story 9.5 — passe a11y AA + polish (tables, skeletons, E2E).

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
| `npm run seed:demo` | Recrée le jeu de démo « Studio Lumen » (voir ci-dessous) |
| `npm run format` | Prettier --write |

### Jeu de démo

`npm run seed:demo` (nécessite `.env.test.local`) purge et recrée toutes les données du
client **« Studio Lumen (démo) »** : comptes sociaux, charte, onboarding, campagnes, tags,
~17 posts à tous les statuts (dont un parcours de validation complet, un refus client, un
renvoi rédacteur), commentaires internes/client, corbeille, 3 briefs client, 4 idées,
3 templates, 5 marronniers, et 3 posts issus d'une idée / demande / marronnier.

Comptes créés (mot de passe commun **`PleinSoleil-2026!`**) :

| Email | Rôle | Vue |
|---|---|---|
| `alexis.heritier13@gmail.com` | admin | `/app` (tout) |
| `lead.demo@studiolumen.test` | lead CM | `/app` |
| `cm.demo@studiolumen.test` | CM | `/app` (client démo assigné) |
| `client.demo@studiolumen.test` | contact client | `/portail` |

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
