# Outil métier Community Management — Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Remplacer Notion pour toute la planification de contenu social multi-clients de l'agence.
- Donner une vue calendrier réellement pensée pour le multi-clients (mensuel / semaine / liste / kanban).
- Structurer et tracer le workflow de validation interne puis client, poste par poste.
- Offrir au client un espace isolé et simple pour approuver, commenter et briefer.
- Standardiser les statuts de post sur un pipeline unique pour tous les clients.
- Outiller l'organisation du contenu : idées, templates, marronniers, tags, duplication.
- Prévenir les ratés via des alertes in-app (validation en retard, deadline sans validation, trou de calendrier, visuel manquant).
- Rester une appli web hébergée, sans installation, sans stockage de fichiers visuels, sans coût d'API tierce.

### Background Context

L'agence gère aujourd'hui la planification dans Notion (bases + vue calendrier). Au-delà de
quelques clients, Notion devient lent et confus, les statuts divergent d'un client à
l'autre, et surtout il n'existe aucun workflow de validation structuré : les allers-retours
de relecture passent par email et Slack, ce qui détruit la traçabilité et fait perdre du
temps. Il n'y a pas non plus d'espace cadré pour la validation par le client.

Ce PRD décrit un outil métier sur-mesure qui reprend le quotidien complet du CM en agence —
planifier, faire valider, organiser, suivre — sur un modèle de données propre et un pipeline
de statuts unique, avec un espace client à isolation stricte. La v1 se concentre sur la
planification et la validation ; la publication reste manuelle avec rappel le jour J.

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-30 | v1.0 | PRD initial dérivé de `docs/brief.md` et des décisions de cadrage | PM (BMad) |

## Requirements

### Functional

- **FR1:** Le système gère l'authentification par email/mot de passe et distingue quatre rôles : CM, Lead CM, Admin agence, Client.
- **FR2:** Un Admin peut créer, modifier, activer/désactiver des utilisateurs internes (CM, Lead, Admin) et leur assigner un ou plusieurs clients.
- **FR3:** Un utilisateur désactivé ne peut plus se connecter et n'apparaît plus dans les sélecteurs d'assignation, mais son historique d'actions reste conservé.
- **FR4:** Un CM ne voit que les clients qui lui sont assignés ; Lead et Admin voient tous les clients.
- **FR5:** Le système permet de créer, modifier, archiver et réactiver un client (nom, logo par lien, secteur d'activité, statut actif/archivé).
- **FR6:** Un client archivé n'apparaît plus dans les vues de travail par défaut mais son historique de posts reste consultable.
- **FR7:** On peut ajouter/retirer des comptes sociaux à un client (réseau + identifiant/nom du compte), indépendamment de la fiche client.
- **FR8:** On peut ajouter/modifier/supprimer plusieurs contacts de validation par client (nom, email), indépendamment de la fiche client.
- **FR9:** Chaque client porte une charte éditoriale : ton de voix, mots/expressions à éviter ou privilégier, exemples de bons posts, guidelines de style visuel (texte informatif, sans fichiers).
- **FR10:** Chaque client dispose d'une checklist d'onboarding : liste d'étapes cochables, avec suivi de l'avancement affiché sur la fiche et la liste clients.
- **FR11:** Le système permet de créer, modifier et supprimer un post avec : réseau social, date et heure de publication prévues, texte/légende, lien Canva, statut, client, rédacteur (CM), campagne optionnelle, tags.
- **FR12:** Le statut d'un post suit le pipeline : brouillon → à valider interne → à valider client → validé → planifié → publié ; un utilisateur autorisé peut forcer un retour en arrière de statut.
- **FR13:** À partir d'un lien Canva de partage public, le système récupère et stocke automatiquement une miniature de preview (parsing `og:image` de la page), rafraîchissable à la demande.
- **FR14:** Si la miniature ne peut pas être récupérée, le système le signale et permet de saisir/coller manuellement une URL de miniature, et propose un aperçu par embed iframe du lien Canva.
- **FR15:** Le système affiche, à titre indicatif, un rappel des specs (dimensions/formats attendus) pour le réseau du post.
- **FR16:** Chaque post porte un fil de commentaires ; un commentaire peut être marqué « interne » (invisible du client) ou « visible client » ; chaque auteur peut modifier/supprimer ses propres commentaires.
- **FR17:** Le système enregistre un historique horodaté de chaque post : création, modifications de champs, changements de statut, suppression/restauration, avec l'auteur de l'action.
- **FR18:** Workflow de validation interne : le Lead CM peut passer un post de « à valider interne » à « validé interne » (implicitement « à valider client ») ou le renvoyer en brouillon avec un commentaire.
- **FR19:** Workflow de validation client : un contact client peut approuver ou refuser un post à l'état « à valider client » ; un refus exige un commentaire et repasse le post en brouillon ; une approbation le passe en « validé ».
- **FR20:** Un utilisateur autorisé peut passer un post « validé » à « planifié », puis à « publié » manuellement.
- **FR21:** L'espace client affiche uniquement les données du client du contact connecté : calendrier de ses posts, détail d'un post, historique des posts publiés.
- **FR22:** Dans l'espace client, le contact peut approuver/refuser et commenter poste par poste (mêmes règles que FR19), sans accéder aux commentaires internes.
- **FR23:** L'espace client fournit un espace de brief : le contact crée des demandes (titre, description, éventuellement réseau/échéance souhaités) visibles par l'agence, avec un statut (nouvelle / prise en compte / traitée).
- **FR24:** Une demande de brief client peut être transformée en post ou en idée par un utilisateur interne, en conservant le lien vers la demande d'origine.
- **FR25:** Le système fournit une vue calendrier mensuelle (vue par défaut) affichant les posts, filtrable par client, avec code couleur par statut et/ou par client.
- **FR26:** Le système fournit une vue semaine et une vue liste des posts, avec les mêmes filtres.
- **FR27:** Le système fournit une vue kanban des posts par statut (usage interne uniquement).
- **FR28:** Le système fournit une vue liste des clients actifs avec indicateurs : nombre de posts en attente de validation (interne + client), avancement onboarding, date de dernière activité.
- **FR29:** Recherche et filtres transverses sur les posts : par client, statut, réseau, période, mot-clé (texte/titre), tag ; combinables.
- **FR30:** Le système gère une banque d'idées de post (titre/description, client optionnel, tags) non liées à une date, transformables en post.
- **FR31:** Le système gère des templates de post réutilisables (nom, structure/légende type, réseau, tags par défaut) utilisables pour créer un nouveau post.
- **FR32:** Un post existant peut être dupliqué en un clic (copie des champs, statut remis à « brouillon », date à redéfinir).
- **FR33:** Le système gère un calendrier de temps forts / marronniers : événements datés (nom, date, récurrence annuelle optionnelle, portée globale ou par client, secteur).
- **FR34:** Le système gère des tags libres réutilisables, applicables aux posts et aux idées, utilisables comme filtre.
- **FR35:** Le système gère des campagnes (nom, client, période de début/fin, description) ; un post peut être rattaché à zéro ou une campagne ; une vue liste les posts d'une campagne.
- **FR36:** Le système génère des alertes in-app pour : (a) post en attente de validation interne ou client depuis plus de X jours ; (b) deadline de publication proche alors que le post n'est pas validé ; (c) trou de calendrier : moins de N posts planifiés sur la période à venir pour un client ; (d) post sans lien Canva alors que la date approche ; (e) marronnier à venir sans post prévu pour le client concerné ; (f) client sans aucun post planifié sur les 2 prochaines semaines (Lead/Admin) ; (g) post validé et planifié pour aujourd'hui → rappel de publication manuelle.
- **FR37:** Les seuils des alertes (X jours, N posts, fenêtre de jours) sont configurables par l'Admin dans les paramètres.
- **FR38:** Les alertes sont présentées dans une page « Alertes » dédiée, avec un badge de compteur dans la navigation ; une alerte peut être marquée « vue » / « ignorée ».
- **FR39:** Actions en masse sur une sélection de posts : dupliquer, changer de statut, supprimer (corbeille), réassigner à un autre CM.
- **FR40:** Export du calendrier (posts filtrés) au format `.ics` compatible Google Calendar / Outlook.
- **FR41:** Export PDF du calendrier d'un client sur une période, incluant pour chaque post la date, le réseau, la légende, la miniature et le statut.
- **FR42:** Chaque post porte un champ libre « performance » pour des notes manuelles post-publication (aucun calcul, aucun connecteur).
- **FR43:** La suppression d'un post ou d'un client le place en corbeille avec possibilité de restauration ; purge automatique définitive après 60 jours en corbeille.
- **FR44:** La suppression d'une idée, d'un tag ou d'un template est définitive et immédiate (pas de corbeille).
- **FR45:** Règles de droits de suppression : un CM peut mettre en corbeille ses propres posts en statut « brouillon » ; la mise en corbeille d'un post ayant atteint « validé » ou plus, ou d'un client entier, est réservée au Lead CM et à l'Admin ; seul l'Admin peut purger définitivement avant les 60 jours.
- **FR46:** Toutes les entités créables (post, client, compte social, contact, campagne, charte, idée, template, tag, utilisateur, marronnier, demande de brief) sont modifiables ; leur suppression suit les règles corbeille/définitif ci-dessus.
- **FR47:** Le système journalise un historique d'actions au niveau client (créations, modifications, validations, suppressions/restaurations) consultable par Lead et Admin.

### Non Functional

- **NFR1:** Application web responsive, accessible via navigateur récent (Chrome, Firefox, Safari, Edge — 2 dernières versions majeures), sans installation.
- **NFR2:** Isolation stricte des données entre clients : un contact client ne peut en aucun cas lire ou deviner les données d'un autre client ; l'isolation est appliquée au niveau base de données (Row Level Security), pas seulement dans l'UI.
- **NFR3:** Les utilisateurs internes n'accèdent qu'aux clients autorisés par leur rôle et leurs assignations ; contrôle appliqué côté base.
- **NFR4:** Dimensionnement cible : jusqu'à 50 clients, 20 utilisateurs internes, ~10 000 posts sur 2 ans, sans dégradation perceptible (chargement de vue < 1,5 s en conditions normales).
- **NFR5:** Coût d'infrastructure minimal : rester dans les paliers gratuits/à faible coût (Supabase, hébergement statique) tant que la volumétrie le permet ; aucune API tierce payante.
- **NFR6:** La preview Canva ne doit jamais bloquer l'enregistrement d'un post : récupération asynchrone, échec géré proprement, fallback manuel (FR14).
- **NFR7:** Les jobs planifiés (génération d'alertes, purge corbeille) s'exécutent automatiquement au moins une fois par jour, de façon idempotente.
- **NFR8:** Sécurité : mots de passe gérés par le fournisseur d'auth (hash), sessions via jetons, HTTPS obligatoire, en-têtes de sécurité de base (CSP, HSTS), pas de secret côté client.
- **NFR9:** Sauvegarde : la base bénéficie des sauvegardes automatiques quotidiennes du fournisseur ; aucune donnée métier uniquement en mémoire.
- **NFR10:** Historique et corbeille conservés de façon fiable : une restauration doit rétablir le post/client dans l'état exact précédant la suppression.
- **NFR11:** RGPD : les contacts client et utilisateurs peuvent être supprimés/anonymisés sur demande ; les données personnelles se limitent au nom et à l'email professionnels.
- **NFR12:** Le code suit un socle de standards (TypeScript strict, lint, tests unitaires sur la logique métier) défini dans `docs/architecture/coding-standards.md`.
- **NFR13:** Accessibilité cible WCAG AA sur les parcours critiques (connexion, calendrier, validation d'un post).
- **NFR14:** Internationalisation : interface en français uniquement en v1, mais textes centralisés pour permettre une traduction ultérieure.
- **NFR15:** Observabilité minimale : journal des erreurs applicatives et des échecs de jobs planifiés consultable par l'Admin ou l'équipe technique.

## User Interface Design Goals

### Overall UX Vision

Un outil dense mais lisible, orienté « calendrier d'abord ». L'écran d'accueil interne est
le calendrier multi-clients ; tout le reste (détail post, validation, organisation) se fait
en panneaux latéraux ou modales sans quitter le contexte. L'espace client est une
application distincte, volontairement minimaliste : un calendrier, une file « à valider »,
un bouton Approuver, un champ commentaire, un espace brief. Objectif : un client valide une
semaine de posts en moins de deux minutes.

### Key Interaction Paradigms

- Calendrier interactif : glisser-déposer pour re-planifier, clic pour ouvrir le détail en panneau latéral.
- Panneau latéral de détail post : édition inline, changement de statut, commentaires, historique, miniature Canva, le tout au même endroit.
- Filtres persistants en haut de page (client, statut, réseau, période, tag), mémorisés par utilisateur.
- Sélection multiple + barre d'actions en masse qui apparaît en bas d'écran.
- File de travail « À valider » (interne et client) comme point d'entrée alternatif au calendrier.
- Page « Alertes » avec badge compteur ; chaque alerte est cliquable vers l'objet concerné.

### Core Screens and Views

- Écran de connexion (commun, redirige selon rôle).
- Calendrier multi-clients (interne) — vue par défaut, bascule mensuel / semaine / liste / kanban.
- Panneau / page de détail d'un post.
- File « À valider » (interne).
- Liste des clients + fiche client (comptes sociaux, contacts, charte, onboarding, historique).
- Banque d'idées.
- Templates de posts.
- Calendrier des marronniers.
- Campagnes (liste + détail).
- Page Alertes.
- Paramètres (utilisateurs, rôles, seuils d'alertes, tags, réseaux/specs).
- **Espace client** : calendrier client, détail post (vue client), file « À valider », historique publiés, espace brief.

### Accessibility: WCAG AA

Sur les parcours critiques : connexion, navigation calendrier au clavier, ouverture et
validation d'un post, soumission d'un commentaire. Contrastes conformes, focus visibles,
labels explicites, pas d'information portée uniquement par la couleur (le statut a aussi un
libellé/icône).

### Branding

Pas de charte imposée. Direction : interface sobre et professionnelle, neutre, qui met en
valeur les logos clients (affichés sur les cartes de post et les fiches). Palette calme,
un accent unique, densité maîtrisée. Le style pourra être affiné par l'agent UX / la skill
design ; aucun engagement visuel fort en v1.

### Target Device and Platforms: Web Responsive

Cible principale : desktop (usage agence, écrans larges). Le calendrier interne est optimisé
pour grand écran (voir mémoire projet : éviter les conteneurs étroits `max-w` sur les vues
liste/calendrier). L'espace client doit rester utilisable sur tablette et mobile
(approbation en déplacement).

## Technical Assumptions

### Repository Structure: Monorepo (léger, mono-package)

Un seul dépôt Git contenant l'application web (Vite) et le dossier `supabase/` (migrations
SQL + Edge Functions). Pas d'outil de monorepo (Nx/Turborepo) : un seul `package.json`
applicatif. Les types partagés entre front et fonctions vivent dans `src/shared/`.

### Service Architecture

**Serverless / BaaS.** Frontend SPA React statique + Supabase comme backend :
PostgreSQL (avec Row Level Security pour toute l'autorisation), Supabase Auth, Supabase
Edge Functions (Deno) pour la logique qui ne peut pas vivre en RLS/SQL (récupération de la
miniature Canva, génération d'export PDF, jobs planifiés). Ordonnancement via `pg_cron` +
`pg_net` (ou Scheduled Edge Functions). Aucune API serveur maison à maintenir hors de
Supabase.

Rationale : correspond à la stack habituelle de l'équipe, isolation client robuste et
centralisée par RLS, coût quasi nul à cette échelle, pas de serveur à opérer.

### Testing Requirements

**Unit + Integration.** Tests unitaires (Vitest) sur la logique métier pure : transitions
de statut, calcul des alertes, règles de droits, parsing de la miniature Canva. Tests
d'intégration sur les policies RLS (un client ne voit pas les données d'un autre) via un
harnais Supavisor/pgTAP ou scripts SQL. Un petit socle E2E (Playwright) sur 3 parcours :
connexion + calendrier, cycle de validation d'un post, approbation côté client. Pas de
pyramide complète en v1.

### Additional Technical Assumptions and Requests

- **Frontend** : React 18 + TypeScript (strict), Vite, Tailwind CSS, shadcn/ui (Radix) pour les primitives accessibles.
- **Données & état serveur** : TanStack Query sur le client Supabase ; pas de store global lourd (Zustand seulement si besoin ponctuel).
- **Formulaires** : react-hook-form + Zod ; les schémas Zod servent aussi de validation partagée.
- **Calendrier** : FullCalendar (react) pour les vues mois/semaine ; vue liste et kanban maison (dnd-kit).
- **Dates** : date-fns + gestion explicite du fuseau (Europe/Paris) pour les heures de publication.
- **Miniature Canva** : Edge Function `canva-preview` qui `fetch` l'URL de partage, extrait `og:image`/`twitter:image`, met en cache l'URL et la date de récupération sur le post ; jamais bloquant (NFR6) ; fallback iframe + champ manuel (FR14).
- **Export PDF** : génération côté Edge Function (rendu HTML → PDF) ou côté client (react-pdf) — à trancher en phase archi selon la fidélité voulue.
- **Auth & rôles** : Supabase Auth ; table `profiles` (role, actif) liée à `auth.users` ; table `user_clients` (assignations) ; table `client_contacts` (contact client ↔ client, avec `auth_user_id`). Toutes les policies RLS s'appuient sur ces tables.
- **Jobs planifiés** : `generate_alerts` (quotidien + horaire pour le rappel jour J), `purge_trash` (quotidien, > 60 jours). Idempotents.
- **Hébergement front** : Vercel ou Netlify (build statique), `main` = production, preview par PR.
- **CI** : GitHub Actions — lint + typecheck + tests unitaires sur chaque PR ; migrations Supabase appliquées via CLI.
- **Pas de** : upload de fichiers, stockage d'images, worker/serveur Node maison, API réseaux sociaux, service d'email (v1 in-app only).

## Epic List

1. **Epic 1 — Fondations, authentification et rôles** : mettre en place le dépôt, l'app déployée, Supabase, le modèle d'auth (4 rôles), la gestion des utilisateurs internes et leurs assignations clients, et une page d'accueil « canari » protégée par rôle.
2. **Epic 2 — Clients, comptes sociaux, contacts et charte** : CRUD clients avec archivage, comptes sociaux, contacts de validation multiples, charte éditoriale, checklist d'onboarding, liste clients avec indicateurs.
3. **Epic 3 — Posts et calendrier multi-clients** : modèle de post complet, CRUD, pipeline de statuts, vues calendrier mensuel/semaine/liste/kanban, filtres transverses, duplication, tags, campagnes, corbeille + purge.
4. **Epic 4 — Miniature Canva et détail post enrichi** : Edge Function de preview Canva, fallback manuel/iframe, rappel des specs par réseau, historique des modifications du post, fil de commentaires interne.
5. **Epic 5 — Workflow de validation interne puis client** : transitions de validation, file « À valider », commentaires visibles client, règles de droits fines, historique des validations.
6. **Epic 6 — Espace client** : application client isolée (RLS), calendrier + détail, approbation/refus + commentaires poste par poste, historique des publiés, espace brief et transformation d'une demande en post/idée.
7. **Epic 7 — Organisation du contenu** : banque d'idées, templates de posts, calendrier des marronniers, rattachement idée/marronnier ↔ post.
8. **Epic 8 — Alertes in-app et jobs planifiés** : job `generate_alerts`, page Alertes + badge, seuils configurables, job `purge_trash`, journal des jobs.
9. **Epic 9 — Actions en masse, exports et finitions** : sélection multiple + actions en masse, export `.ics`, export PDF client, champ performance, accessibilité AA des parcours critiques, passe de polish UI.

## Epic 1 — Fondations, authentification et rôles

Établir toute l'infrastructure : dépôt Git, app React/Vite déployée en continu, projet
Supabase avec migrations versionnées, modèle d'authentification à 4 rôles avec RLS, et la
gestion des utilisateurs internes. À la fin de l'epic, un Admin peut se connecter, créer des
utilisateurs, leur attribuer un rôle et des clients, et chaque rôle atterrit sur une page
d'accueil adaptée. Livre un incrément déployé et testable de bout en bout.

### Story 1.1 — Initialisation du dépôt et de l'app web

As a développeur,
I want un dépôt Git avec une app React + TypeScript + Vite + Tailwind qui build et se déploie,
so that toute évolution ultérieure part d'une base saine et déployée en continu.

#### Acceptance Criteria

1: Le dépôt contient une app Vite + React 18 + TypeScript strict + Tailwind + shadcn/ui initialisée, avec ESLint et Prettier configurés.
2: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck` et `npm run test` fonctionnent ; `test` exécute au moins un test trivial via Vitest.
3: Une route `/` affiche une page « canari » indiquant la version et l'environnement.
4: Le projet est déployé sur Vercel ou Netlify ; `main` déclenche un déploiement de production, chaque PR une preview.
5: Un workflow GitHub Actions exécute lint + typecheck + tests unitaires sur chaque PR et échoue si l'un échoue.
6: Le `README.md` décrit l'installation locale, les variables d'environnement et les commandes.

### Story 1.2 — Mise en place de Supabase et des migrations

As a développeur,
I want un projet Supabase relié au dépôt avec des migrations SQL versionnées,
so that le schéma de base est reproductible et évolue de façon contrôlée.

#### Acceptance Criteria

1: Le dépôt contient un dossier `supabase/` avec la config CLI et un dossier `migrations/`.
2: Une première migration crée une table `app_meta` (ou équivalent) et active les extensions nécessaires (`pg_cron`, `pg_net`, `pgcrypto`).
3: Le client Supabase est configuré dans l'app via des variables d'environnement (URL, clé anon), jamais de clé service côté client.
4: La procédure d'application des migrations (local + CI/prod via `supabase db push`) est documentée.
5: Un test d'intégration de base se connecte à une instance Supabase locale et lit `app_meta`.

### Story 1.3 — Modèle de profils, rôles et assignations

As a Admin agence,
I want que chaque compte ait un rôle et, pour les internes, une liste de clients assignés,
so that l'outil peut restreindre l'accès selon le rôle et le périmètre.

#### Acceptance Criteria

1: Migration créant `profiles` (id = `auth.users.id`, nom, email, `role` parmi `cm|lead|admin|client`, `is_active` booléen, timestamps).
2: Migration créant `clients` (minimal : id, nom, `is_archived`, timestamps) — suffisant pour les assignations, enrichi en Epic 2.
3: Migration créant `user_clients` (profile_id, client_id, unique) pour les assignations des rôles internes.
4: Un trigger crée automatiquement une ligne `profiles` à l'inscription d'un `auth.users`, avec `role` par défaut `cm` et `is_active = false`.
5: RLS activé sur les trois tables ; une fonction SQL `current_role()` et `has_client_access(client_id)` sont définies et testées.
6: Tests d'intégration : un `cm` ne lit que les `clients` présents dans ses `user_clients` ; un `lead`/`admin` lit tous les `clients` non supprimés.

### Story 1.4 — Connexion et redirection par rôle

As a utilisateur,
I want me connecter avec email/mot de passe et arriver sur l'écran correspondant à mon rôle,
so that je n'ai accès qu'à ce qui me concerne.

#### Acceptance Criteria

1: Écran de connexion (email + mot de passe) utilisant Supabase Auth, avec gestion des erreurs (identifiants invalides, compte désactivé).
2: Un utilisateur avec `is_active = false` est refusé avec un message explicite, même si l'authentification réussit.
3: Après connexion : `cm`/`lead`/`admin` sont redirigés vers `/app` (placeholder calendrier), `client` vers `/portail` (placeholder espace client).
4: Les routes `/app/*` sont protégées (rôles internes) et `/portail/*` réservées au rôle `client` ; tout accès non autorisé redirige.
5: Un bouton de déconnexion invalide la session et renvoie à `/login`.
6: Le rafraîchissement de page conserve la session et la protection des routes.

### Story 1.5 — Gestion des utilisateurs internes

As a Admin agence,
I want créer, modifier, activer/désactiver des utilisateurs internes et gérer leurs clients assignés,
so that je contrôle qui utilise l'outil et sur quel périmètre.

#### Acceptance Criteria

1: Page `/app/parametres/utilisateurs` visible uniquement par l'Admin, listant les utilisateurs internes (nom, email, rôle, statut, nb de clients assignés).
2: L'Admin peut inviter/créer un utilisateur (nom, email, rôle) ; le compte est créé désactivé jusqu'à première connexion + activation, ou activé directement selon le choix.
3: L'Admin peut changer le rôle, activer/désactiver, et éditer la liste des clients assignés (multi-sélection) d'un utilisateur.
4: La désactivation empêche la connexion (cf. 1.4) et retire l'utilisateur des sélecteurs d'assignation de post, sans effacer son historique.
5: Toutes ces opérations sont refusées côté base (RLS/policies) pour les rôles `cm`, `lead`, `client`.
6: Tests d'intégration couvrant : création, changement de rôle, désactivation, modification d'assignations, et rejet pour non-Admin.

## Epic 2 — Clients, comptes sociaux, contacts et charte

Enrichir l'entité client pour couvrir tout ce dont un CM a besoin avant de produire du
contenu : fiche complète, archivage, comptes sociaux, contacts de validation multiples,
charte éditoriale et checklist d'onboarding, plus une liste clients avec indicateurs. À la
fin, on peut gérer intégralement le référentiel client.

### Story 2.1 — Fiche client complète et archivage

As a Lead CM,
I want créer et modifier une fiche client complète et pouvoir l'archiver/réactiver,
so that le référentiel client reflète l'activité réelle de l'agence.

#### Acceptance Criteria

1: Migration enrichissant `clients` : logo (URL), secteur d'activité, `is_archived`, timestamps, champ `archived_at`.
2: Formulaire de création/édition client (nom requis, logo par URL avec aperçu, secteur) accessible aux rôles `lead` et `admin` ; un `cm` a un accès lecture seule à ses clients.
3: Archiver un client le retire des vues de travail par défaut et des sélecteurs de nouveau post, mais conserve ses posts et son historique consultables via un filtre « archivés inclus ».
4: Réactiver un client le remet dans les vues par défaut.
5: RLS : lecture selon assignation/rôle (Story 1.3) ; écriture `lead`/`admin` uniquement ; tests d'intégration correspondants.

### Story 2.2 — Comptes sociaux du client

As a CM,
I want gérer la liste des comptes sociaux d'un client,
so that chaque post peut cibler un compte précis et un réseau connu.

#### Acceptance Criteria

1: Migration `social_accounts` (client_id, `network` enum Instagram/LinkedIn/Facebook/TikTok/… extensible, `handle`/nom, timestamps).
2: Sur la fiche client, une section permet d'ajouter/modifier/supprimer des comptes sociaux indépendamment des autres champs.
3: La suppression d'un compte social est définitive mais bloquée (ou avertie) s'il est référencé par des posts non supprimés — comportement défini et testé.
4: Les réseaux disponibles proviennent d'une table de référence `networks` (nom, specs indicatives) éditable par l'Admin.
5: RLS alignée sur l'accès client ; tests d'intégration.

### Story 2.3 — Contacts de validation multiples

As a Lead CM,
I want gérer plusieurs contacts de validation par client,
so that le bon interlocuteur client peut approuver les posts.

#### Acceptance Criteria

1: Migration `client_contacts` (client_id, nom, email, `auth_user_id` nullable, `is_active`, timestamps).
2: Sur la fiche client, section CRUD des contacts, indépendante des autres champs.
3: Un contact peut être « invité » : création d'un compte `auth.users` + `profiles.role = client` lié via `auth_user_id`, ou rattachement à un compte existant.
4: Désactiver un contact lui retire l'accès à l'espace client sans supprimer son historique de validations.
5: RLS : gestion réservée `lead`/`admin` ; un contact client ne voit que sa propre fiche contact (le cas échéant) ; tests d'intégration d'isolation.

### Story 2.4 — Charte éditoriale par client

As a CM,
I want consulter la charte éditoriale d'un client depuis sa fiche et depuis l'éditeur de post,
so that je rédige des posts conformes au ton et aux règles du client.

#### Acceptance Criteria

1: Migration `editorial_guidelines` (client_id unique, ton de voix, mots à éviter, mots à privilégier, exemples de bons posts, guidelines visuelles — champs texte/markdown).
2: Section éditable sur la fiche client (rôles `cm` en lecture, `lead`/`admin` en écriture — ou `cm` en écriture sur ses clients, à trancher : par défaut `cm` écriture sur clients assignés).
3: La charte est consultable en un clic (panneau) depuis l'éditeur de post du client concerné.
4: RLS alignée ; tests d'intégration.

### Story 2.5 — Checklist d'onboarding client

As a Lead CM,
I want une checklist d'onboarding par client avec suivi d'avancement,
so that aucun nouveau client ne démarre sans les étapes indispensables.

#### Acceptance Criteria

1: Migration `onboarding_items` (client_id, libellé, `is_done`, ordre, `done_at`, `done_by`).
2: Un modèle d'étapes par défaut est créé automatiquement à la création d'un client (liste configurable par l'Admin dans les paramètres).
3: Sur la fiche client, la checklist permet de cocher/décocher, ajouter, réordonner et supprimer des étapes.
4: L'avancement (`x/y`) apparaît sur la fiche et dans la liste clients (Story 2.6).
5: RLS alignée ; tests d'intégration.

### Story 2.6 — Liste des clients avec indicateurs

As a Lead CM,
I want une liste des clients actifs avec des indicateurs de charge et d'activité,
so that je repère d'un coup d'œil les clients à risque.

#### Acceptance Criteria

1: Page `/app/clients` listant les clients non archivés (nom + logo, secteur), avec bascule « inclure archivés ».
2: Colonnes/indicateurs : nombre de posts en attente de validation interne, en attente de validation client, avancement onboarding (`x/y`), date de dernière activité (dernier post créé ou modifié).
3: La liste est triable par chaque indicateur et cherchable par nom.
4: Un clic ouvre la fiche client ; la vue respecte les mémoires projet (pas de conteneur étroit, exploiter la largeur d'écran).
5: Les indicateurs sont calculés via une vue SQL ou une fonction, testée pour l'exactitude.

## Epic 3 — Posts et calendrier multi-clients

Le cœur de l'outil : créer des posts, les organiser dans le temps et les visualiser sur un
calendrier multi-clients. À la fin de l'epic, un CM peut planifier tout le contenu d'un
client sur un mois, le filtrer, le dupliquer, le tagger, le rattacher à une campagne, et le
mettre en corbeille avec restauration.

### Story 3.1 — Modèle de post et CRUD de base

As a CM,
I want créer, modifier et supprimer un post avec tous ses champs,
so that je matérialise chaque contenu prévu pour un client.

#### Acceptance Criteria

1: Migration `posts` : id, client_id, `network`, `scheduled_at` (timestamptz, fuseau Europe/Paris géré à l'affichage), `caption` (texte), `canva_url`, `canva_thumbnail_url`, `canva_fetched_at`, `status` enum (pipeline FR12), `author_id` (CM), `campaign_id` nullable, `performance_note`, `deleted_at` nullable, timestamps.
2: Formulaire de création/édition (client requis, réseau requis, date/heure requise, légende) avec validation Zod ; date affichée et saisie en heure de Paris.
3: Un `cm` ne peut créer un post que pour un client assigné ; `lead`/`admin` pour tout client actif ; RLS + tests.
4: `author_id` par défaut = utilisateur courant, modifiable par `lead`/`admin`.
5: La suppression pose `deleted_at` (corbeille) selon les règles FR45 ; les posts avec `deleted_at` sont exclus partout par défaut.
6: Tests unitaires sur la validation du formulaire et tests d'intégration sur les droits de création/suppression.

### Story 3.2 — Pipeline de statuts

As a CM,
I want faire évoluer le statut d'un post le long d'un pipeline standard,
so that chacun sait où en est chaque contenu.

#### Acceptance Criteria

1: Fonction métier `canTransition(from, to, role, post)` centralisant les transitions autorisées du pipeline `brouillon → à valider interne → à valider client → validé → planifié → publié`.
2: Les retours en arrière sont autorisés pour `lead`/`admin` (et `cm` jusqu'à « à valider client » sur ses posts) et journalisés.
3: L'UI n'affiche que les transitions permises pour le rôle courant ; une transition interdite est aussi refusée côté base (trigger ou RPC).
4: Chaque changement de statut crée une entrée d'historique (implémentée pleinement en Epic 4, ici au minimum un `status_changed_at` + `status_changed_by`).
5: Tests unitaires exhaustifs de la table de transitions ; tests d'intégration du refus côté base.

### Story 3.3 — Vue calendrier mensuelle et semaine

As a CM,
I want voir les posts sur un calendrier mensuel et hebdomadaire, multi-clients,
so that je visualise la charge et les trous de planning.

#### Acceptance Criteria

1: `/app` affiche par défaut un calendrier mensuel (FullCalendar) des posts non supprimés, avec bascule Mois / Semaine.
2: Chaque post est une pastille montrant l'heure, le réseau (icône), le client (couleur et/ou logo) et le statut (couleur/pictogramme, jamais la couleur seule — NFR13).
3: Glisser-déposer un post change sa date/heure (`scheduled_at`), avec confirmation optimiste et rollback en cas d'erreur ; interdit si le rôle n'a pas le droit d'éditer ce post.
4: Un clic sur un post ouvre le détail en panneau latéral (contenu complet en Epic 4, ici : champs principaux + statut).
5: La vue exploite toute la largeur de l'écran (mémoire projet) et reste fluide avec ~500 posts affichés sur le mois.

### Story 3.4 — Vue liste et vue kanban

As a Lead CM,
I want une vue liste et une vue kanban par statut des posts,
so that je pilote la production autrement que par le calendrier.

#### Acceptance Criteria

1: Bascule Mois / Semaine / Liste / Kanban sur `/app`.
2: Vue liste : tableau paginé/virtualisé (date, client, réseau, extrait de légende, statut, rédacteur), triable par colonne.
3: Vue kanban : colonnes = statuts du pipeline, cartes = posts, glisser-déposer entre colonnes déclenchant `canTransition` (Story 3.2) ; kanban réservé aux rôles internes.
4: Les deux vues partagent les filtres transverses (Story 3.5).
5: Performance testée avec ~2 000 posts sur la période filtrée (virtualisation).

### Story 3.5 — Filtres et recherche transverses

As a CM,
I want filtrer et chercher les posts par client, statut, réseau, période, tag et mot-clé,
so that je retrouve rapidement les posts pertinents dans toutes les vues.

#### Acceptance Criteria

1: Barre de filtres persistante : client (multi), statut (multi), réseau (multi), période (plage de dates), tag (multi), recherche plein texte sur la légende.
2: Les filtres s'appliquent identiquement aux vues Mois/Semaine/Liste/Kanban.
3: L'état des filtres est mémorisé par utilisateur (persisté) et reflété dans l'URL (partageable).
4: La recherche plein texte utilise un index Postgres (`tsvector` ou `pg_trgm`) ; temps de réponse < 500 ms sur le jeu de test.
5: Tests d'intégration sur la combinaison de filtres et l'isolation (un `cm` ne filtre que sur ses clients).

### Story 3.6 — Duplication, tags et campagnes

As a CM,
I want dupliquer un post, lui poser des tags et le rattacher à une campagne,
so that j'accélère la production récurrente et je regroupe les contenus liés.

#### Acceptance Criteria

1: Migrations `tags` (nom unique, couleur), `post_tags` (post_id, tag_id), `campaigns` (client_id, nom, date_debut, date_fin, description).
2: « Dupliquer » crée un nouveau post copiant légende, réseau, client, tags, campagne ; statut = brouillon ; `scheduled_at` vidé ou décalé d'une semaine (au choix, proposé dans une petite modale).
3: L'éditeur de post permet d'ajouter/retirer des tags (création à la volée) et de sélectionner une campagne du même client.
4: Page `/app/campagnes` : liste des campagnes (client, période, nb de posts) + détail listant les posts de la campagne.
5: RLS alignée sur l'accès client pour tags d'usage (post_tags) et campagnes ; tests d'intégration.

### Story 3.7 — Corbeille et purge automatique

As a Lead CM,
I want que les suppressions de posts et clients soient réversibles pendant 60 jours,
so that une erreur ne détruit pas du travail définitivement.

#### Acceptance Criteria

1: Migration ajoutant `deleted_at` / `deleted_by` à `clients` (posts déjà couverts en 3.1).
2: Page `/app/corbeille` listant posts et clients supprimés (rôles `lead`/`admin`), avec date de suppression et date de purge prévue (suppression + 60 j).
3: « Restaurer » remet l'entité exactement dans son état précédent (statut du post inclus) et la refait apparaître partout.
4: Fonction SQL `purge_trash()` supprimant définitivement les entités dont `deleted_at < now() - interval '60 days'` ; idempotente ; l'ordonnancement est branché en Epic 8.
5: Règles de droits FR45 appliquées et testées (CM ne supprime que ses brouillons ; purge manuelle avant 60 j = Admin seul).

## Epic 4 — Miniature Canva et détail post enrichi

Rendre le détail d'un post complet et utile : preview visuelle via Canva sans API payante,
rappel des specs, historique des modifications et fil de commentaires interne. À la fin, le
panneau de détail post contient tout ce dont un CM a besoin pour travailler un contenu.

### Story 4.1 — Edge Function de récupération de la miniature Canva

As a CM,
I want qu'une miniature de preview apparaisse automatiquement quand je colle un lien Canva,
so that je vois le visuel sans quitter l'outil et sans gérer de fichier.

#### Acceptance Criteria

1: Edge Function `canva-preview` : reçoit une URL Canva, la `fetch`, extrait `og:image` (fallback `twitter:image`, puis `link rel=image_src`), renvoie l'URL d'image + un statut.
2: L'appel est déclenché à la saisie/collage du lien dans l'éditeur de post et au clic sur « rafraîchir la miniature » ; il est asynchrone et ne bloque jamais l'enregistrement (NFR6).
3: En cas d'échec (lien privé, HTML sans balise, timeout), la fonction renvoie une erreur typée ; l'UI affiche un message clair et propose la saisie manuelle + l'aperçu iframe (Story 4.2).
4: Le résultat est stocké sur le post (`canva_thumbnail_url`, `canva_fetched_at`) ; pas de stockage du binaire image.
5: La fonction gère un timeout (~5 s) et ne suit pas de redirections hors domaine `canva.com`.
6: Tests unitaires du parseur HTML (plusieurs échantillons de pages), test d'intégration de la fonction.

### Story 4.2 — Fallback manuel et aperçu iframe

As a CM,
I want pouvoir renseigner moi-même une miniature ou afficher un aperçu embarqué,
so that j'ai toujours un visuel même si la récupération automatique échoue.

#### Acceptance Criteria

1: Champ « URL de miniature (manuel) » dans l'éditeur de post ; si renseigné, il prime sur la valeur récupérée automatiquement.
2: Bouton « Aperçu Canva » ouvrant le lien de partage en iframe dans une modale (si le lien l'autorise).
3: Indicateur visible de la source de la miniature (auto / manuelle) et de sa date de récupération.
4: Un message d'aide rappelle la contrainte « visible par toute personne ayant le lien ».
5: Tests unitaires sur la règle de priorité manuel > auto.

### Story 4.3 — Rappel des specs par réseau

As a CM,
I want voir les formats/dimensions attendus pour le réseau du post,
so that je prépare le bon visuel dans Canva.

#### Acceptance Criteria

1: La table `networks` (Story 2.2) porte des specs indicatives (formats, ratios, longueur de légende conseillée) éditables par l'Admin.
2: L'éditeur de post affiche ces specs pour le réseau sélectionné, en encart informatif (aucune contrainte bloquante).
3: Tests d'affichage selon le réseau.

### Story 4.4 — Historique des modifications du post

As a Lead CM,
I want consulter l'historique complet d'un post,
so that je sais qui a changé quoi et quand, en cas de litige.

#### Acceptance Criteria

1: Migration `post_history` (post_id, `actor_id`, `action` type, `field`, `old_value`, `new_value`, `created_at`).
2: Un trigger (ou la couche d'accès) enregistre : création, modification de chaque champ significatif, changement de statut, mise en corbeille, restauration.
3: Le panneau de détail post affiche l'historique en ordre anti-chronologique, lisible (libellés en français).
4: L'historique est en lecture seule et survit à la mise en corbeille du post ; visible par `lead`/`admin`, et par le `cm` auteur.
5: Tests d'intégration : une séquence d'actions produit les entrées attendues.

### Story 4.5 — Fil de commentaires interne

As a CM,
I want commenter un post en interne,
so that l'équipe échange sur le contenu sans email.

#### Acceptance Criteria

1: Migration `post_comments` (post_id, `author_id`, `body`, `visibility` enum `internal|client`, `created_at`, `updated_at`, `deleted_at`).
2: En Epic 4, seuls les commentaires `internal` sont exposés ; le fil s'affiche dans le panneau de détail post.
3: Un auteur peut éditer/supprimer ses propres commentaires (soft delete) ; `lead`/`admin` peuvent supprimer n'importe quel commentaire.
4: Les commentaires `internal` ne sont jamais lisibles par un rôle `client` (RLS) — testé.
5: Tests d'intégration sur droits d'édition/suppression et sur l'isolation client.

## Epic 5 — Workflow de validation interne puis client

Transformer le pipeline de statuts en un vrai processus outillé : relecture interne, envoi
au client, approbation/refus, avec une file de travail dédiée et des règles de droits
fines. À la fin, un post peut parcourir tout le circuit de validation avec traçabilité.

### Story 5.1 — Validation interne (Lead CM)

As a Lead CM,
I want valider ou renvoyer un post en relecture interne,
so that rien ne part au client sans contrôle de l'agence.

#### Acceptance Criteria

1: Depuis le détail post, un `lead`/`admin` peut, sur un post « à valider interne » : « Valider en interne » (→ « à valider client ») ou « Renvoyer au rédacteur » (→ « brouillon », commentaire obligatoire).
2: Le CM peut soumettre son post « brouillon » à la validation interne (→ « à valider interne »).
3: Chaque action est journalisée (Story 4.4) et notifie l'intéressé via une alerte in-app (mécanique complète en Epic 8, ici a minima l'entrée est créée).
4: Les transitions respectent `canTransition` (Story 3.2) et sont refusées côté base sinon.
5: Tests d'intégration du circuit CM ↔ Lead.

### Story 5.2 — Envoi au client et commentaires visibles client

As a CM,
I want préparer les commentaires visibles par le client et envoyer le post en validation client,
so that le client dispose du contexte nécessaire pour approuver.

#### Acceptance Criteria

1: Le fil de commentaires (Story 4.5) permet de choisir la visibilité `internal` ou `client` à la saisie.
2: Un post « à valider client » est exposé dans l'espace client (Epic 6) avec uniquement ses commentaires `client`.
3: Un `cm`/`lead` peut repasser un post « à valider client » en arrière (« brouillon » ou « à valider interne ») tant que le client n'a pas répondu.
4: Tests d'intégration : un contact client ne voit que les commentaires `client` du post.

### Story 5.3 — Approbation / refus par le client

As a Client,
I want approuver ou refuser chaque post qui m'est soumis, avec un commentaire,
so that l'agence sait exactement quoi publier ou corriger.

#### Acceptance Criteria

1: RPC `approve_post(post_id)` et `reject_post(post_id, comment)` exécutables uniquement par un contact du client propriétaire du post et seulement si `status = 'à valider client'`.
2: Approbation → `status = 'validé'` + entrée d'historique + commentaire système « Approuvé par {contact} ».
3: Refus → commentaire `client` obligatoire, `status = 'brouillon'`, entrée d'historique, alerte in-app pour le rédacteur.
4: Toute tentative hors périmètre (autre client, mauvais statut, rôle interne se faisant passer pour client) est refusée côté base — testé.
5: Tests d'intégration du parcours complet et des cas de rejet.

### Story 5.4 — File « À valider » (interne)

As a Lead CM,
I want une file listant tous les posts en attente de validation (interne et client),
so that je traite les validations sans parcourir le calendrier.

#### Acceptance Criteria

1: Page `/app/a-valider` avec deux onglets : « À valider en interne » et « En attente du client ».
2: Chaque ligne : client, réseau, date prévue, extrait, ancienneté dans le statut, rédacteur ; tri par ancienneté par défaut.
3: Actions rapides depuis la file : ouvrir le détail, valider en interne, relancer le client (marque l'alerte, ne fait pas d'email en v1).
4: Filtrable par client ; respecte l'isolation par rôle (un `cm` voit ses clients).
5: Le compteur de la file apparaît dans la navigation.

### Story 5.5 — Historique des validations au niveau client

As a Lead CM,
I want un journal des validations et actions par client,
so that je peux justifier ce qui a été validé et par qui.

#### Acceptance Criteria

1: Vue `client_activity` agrégeant les entrées d'historique des posts d'un client (création, validations internes/client, refus, publications, suppressions/restaurations).
2: Accessible depuis la fiche client, filtrable par type d'action et par période.
3: Lecture réservée à `lead`/`admin` ; un `cm` voit celui de ses clients.
4: Tests d'intégration sur l'agrégation et les droits.

## Epic 6 — Espace client

Livrer l'application client : isolée par RLS, minimaliste, centrée sur l'approbation rapide
et le brief. À la fin, un contact client se connecte, voit son calendrier, valide ses posts
en deux clics, consulte l'historique et dépose des demandes.

### Story 6.1 — Coquille de l'espace client et isolation

As a Client,
I want un espace dédié qui ne montre que les données de mon entreprise,
so that je navigue sans confusion et en confiance.

#### Acceptance Criteria

1: Routes `/portail/*` réservées au rôle `client` ; layout distinct (logo du client, navigation réduite : Calendrier, À valider, Publiés, Briefs).
2: Toutes les requêtes de l'espace client sont contraintes par RLS au(x) `client_id` du contact connecté (via `client_contacts.auth_user_id`).
3: Un contact rattaché à plusieurs clients (cas rare) obtient un sélecteur de client ; sinon accès direct.
4: Test d'intégration central : un contact du client A ne peut lire aucun post, commentaire, campagne, brief ou fiche du client B, y compris par appel direct à l'API.
5: Un contact désactivé est refusé (cf. Story 2.3).

### Story 6.2 — Calendrier et détail post côté client

As a Client,
I want voir mes posts sur un calendrier et ouvrir le détail d'un post,
so that je comprends le planning proposé par l'agence.

#### Acceptance Criteria

1: Calendrier mensuel + vue liste des posts du client, en lecture, avec statut lisible (libellé, pas seulement couleur).
2: Le détail post client montre : réseau, date/heure prévue, légende, miniature/aperçu Canva, commentaires `client` uniquement, statut.
3: Les commentaires internes, l'historique complet, le rédacteur et les autres clients ne sont jamais exposés.
4: Responsive mobile/tablette soigné (approbation en déplacement).
5: Tests d'intégration sur le filtrage des données exposées.

### Story 6.3 — Approbation / refus et commentaires côté client

As a Client,
I want approuver ou refuser un post et laisser un commentaire depuis le détail,
so that je réponds à l'agence au même endroit.

#### Acceptance Criteria

1: Sur un post « à valider client », boutons « Approuver » et « Demander une modification » (refus) ; le refus ouvre un champ commentaire obligatoire.
2: Utilise les RPC de la Story 5.3 ; l'UI reflète immédiatement le nouveau statut.
3: Le contact peut ajouter des commentaires `client` sur n'importe lequel de ses posts, pas seulement à l'étape de validation.
4: Une file « À valider » côté client liste les posts en attente de sa réponse, avec compteur.
5: Tests E2E : parcours approbation et parcours refus.

### Story 6.4 — Historique des posts publiés côté client

As a Client,
I want consulter la liste de mes posts déjà publiés,
so that je garde une trace de ce qui est sorti.

#### Acceptance Criteria

1: Vue « Publiés » : liste chronologique des posts en statut « publié » du client, avec légende, réseau, date, miniature, note de performance si renseignée et visible client.
2: Recherche par mot-clé et filtre par réseau/période.
3: Reste accessible même après archivage du client (compte client encore actif).
4: Tests d'intégration sur le périmètre.

### Story 6.5 — Espace brief client → agence

As a Client,
I want déposer des demandes/briefs pour l'agence,
so that mes besoins de contenu sont pris en compte de façon tracée.

#### Acceptance Criteria

1: Migration `client_requests` (client_id, `created_by` contact, titre, description, réseau souhaité nullable, échéance souhaitée nullable, `status` enum `nouvelle|prise_en_compte|traitee`, timestamps).
2: Côté client : créer, modifier (tant que `nouvelle`), et suivre le statut de ses demandes ; fil de commentaires sur la demande.
3: Côté interne : liste des demandes par client (et une vue globale pour `lead`/`admin`), changement de statut, commentaires.
4: Bouton « Transformer en post » / « Transformer en idée » créant l'entité pré-remplie et liant `client_requests.id` (Story 7.x / 3.x) ; le lien est visible des deux côtés.
5: RLS : un contact ne voit que les demandes de son client ; tests d'intégration.

## Epic 7 — Organisation du contenu

Outiller la préparation en amont : idées, templates, marronniers, et leurs liens avec les
posts. À la fin, un CM alimente une réserve de contenu et anticipe les temps forts.

### Story 7.1 — Banque d'idées

As a CM,
I want stocker des idées de post non datées et les transformer en posts,
so that je ne perds aucune inspiration et je remplis les trous de planning.

#### Acceptance Criteria

1: Migration `ideas` (titre, description, client_id nullable, `origin_request_id` nullable, tags via `idea_tags`, `created_by`, timestamps, `deleted_at` — suppression définitive selon FR44, donc pas de `deleted_at`, à confirmer : idées = suppression définitive).
2: Page `/app/idees` : liste filtrable (client, tag, mot-clé), création rapide, édition, suppression définitive.
3: « Transformer en post » ouvre l'éditeur de post pré-rempli (titre→légende, client, tags) ; l'idée peut être conservée ou supprimée après transformation (choix).
4: Une idée sans client est visible de tous les rôles internes ; une idée avec client suit l'accès client.
5: Tests d'intégration.

### Story 7.2 — Templates de posts

As a CM,
I want des modèles de posts réutilisables,
so that je produis plus vite les formats récurrents.

#### Acceptance Criteria

1: Migration `post_templates` (nom, description, `network` nullable, `caption_template`, tags par défaut, `scope` global ou client_id, `created_by`).
2: Page `/app/templates` : CRUD, prévisualisation du gabarit.
3: Dans l'éditeur de post, « Partir d'un template » pré-remplit réseau, légende et tags ; les templates proposés sont les globaux + ceux du client sélectionné.
4: Suppression définitive (FR44).
5: Tests unitaires sur l'application d'un template à un nouveau post.

### Story 7.3 — Calendrier des marronniers

As a CM,
I want un calendrier de temps forts par client,
so that j'anticipe le contenu autour des dates clés.

#### Acceptance Criteria

1: Migration `key_dates` (nom, date, `recurring_annually` booléen, `scope` global/secteur/client, `sector` nullable, client_id nullable, description).
2: Page `/app/marronniers` : liste et mini-calendrier annuel ; CRUD réservé `lead`/`admin` pour les globaux, `cm` pour ceux de ses clients.
3: Les marronniers pertinents pour un client (globaux + secteur du client + spécifiques) apparaissent en surimpression discrète sur le calendrier principal (Story 3.3), activables via un filtre.
4: Un marronnier peut être « planifié » : bouton créant un post brouillon pré-daté pour un client.
5: Tests d'intégration sur la résolution des marronniers applicables à un client.

### Story 7.4 — Liens idée/marronnier/demande ↔ post

As a CM,
I want tracer d'où vient un post (idée, marronnier, demande client),
so that je garde le contexte de production.

#### Acceptance Criteria

1: `posts` porte `origin_type` (`idea|key_date|client_request|duplicate|null`) et `origin_id`.
2: Le détail post affiche un lien vers l'origine si présente ; l'origine affiche les posts qu'elle a générés.
3: La suppression de l'origine ne supprime pas le post ; le lien devient « origine supprimée ».
4: Tests d'intégration.

## Epic 8 — Alertes in-app et jobs planifiés

Rendre l'outil proactif : un moteur d'alertes quotidien + horaire, une page Alertes avec
badge, des seuils configurables, et la purge automatique de la corbeille. À la fin, les
risques de la section FR36 sont détectés et remontés sans email.

### Story 8.1 — Modèle d'alertes et page Alertes

As a CM,
I want une page listant les alertes qui me concernent,
so that je vois les problèmes sans les chercher.

#### Acceptance Criteria

1: Migration `alerts` (id, `type` enum FR36 a–g, `severity`, `client_id`, `post_id` nullable, `target_role`/`target_user_id`, `message`, `status` enum `new|seen|dismissed`, `created_at`, `dedupe_key` unique).
2: Page `/app/alertes` : liste filtrable par type/client/sévérité, actions « marquer vue » / « ignorer », clic → objet concerné.
3: Badge compteur (alertes `new` visibles par l'utilisateur) dans la navigation, mis à jour à l'ouverture de l'app.
4: RLS : un `cm` ne voit que les alertes de ses clients / qui lui sont adressées ; `lead`/`admin` voient tout.
5: Tests d'intégration sur la visibilité.

### Story 8.2 — Moteur de génération d'alertes

As a Lead CM,
I want que les alertes se génèrent automatiquement chaque jour,
so that l'équipe est prévenue à temps.

#### Acceptance Criteria

1: Fonction `generate_alerts()` (SQL et/ou Edge Function) implémentant les règles FR36 a–g, en utilisant les seuils configurables (Story 8.3).
2: Idempotence via `dedupe_key` (ex. `type + post_id + jour`) : relancer la fonction ne crée pas de doublons et referme les alertes devenues caduques (post validé entre-temps → alerte `dismissed` automatiquement).
3: Ordonnancement : exécution quotidienne (nuit) pour a–f, et horaire en journée pour g (rappel jour J) via `pg_cron` + `pg_net` ou Scheduled Functions.
4: Chaque exécution est tracée dans `job_runs` (nom, début, fin, `ok`, compteurs, erreur).
5: Tests unitaires par règle (jeux de données ciblés) + test d'idempotence.

### Story 8.3 — Paramètres des seuils d'alertes

As a Admin agence,
I want configurer les seuils des alertes,
so that l'outil colle au rythme de l'agence.

#### Acceptance Criteria

1: Migration `settings` (clé/valeur typée) ou table dédiée `alert_settings` : jours avant relance validation, fenêtre « deadline proche » (jours), N posts mini sur fenêtre à venir, fenêtre du trou de calendrier (jours), fenêtre marronnier (jours).
2: Page `/app/parametres/alertes` (Admin) éditant ces valeurs avec bornes de validation.
3: `generate_alerts()` lit ces valeurs ; un changement est pris en compte à l'exécution suivante.
4: Tests d'intégration : modifier un seuil change le résultat de génération.

### Story 8.4 — Purge automatique de la corbeille et journal des jobs

As a Admin agence,
I want que la corbeille se purge après 60 jours et voir le journal des tâches planifiées,
so that la base reste propre et je peux diagnostiquer un incident.

#### Acceptance Criteria

1: `purge_trash()` (Story 3.7) branchée sur `pg_cron` quotidien ; supprime définitivement posts et clients au-delà de 60 jours, en cascade contrôlée (commentaires, historique conservés ou anonymisés selon décision — par défaut supprimés avec le post).
2: Page `/app/parametres/jobs` (Admin) affichant les dernières exécutions de `generate_alerts` et `purge_trash` depuis `job_runs` (statut, durée, erreurs).
3: Un échec de job est visible et, si possible, remonté comme alerte système à l'Admin.
4: Tests d'intégration : une entité de plus de 60 jours est purgée, une de 59 jours ne l'est pas.

## Epic 9 — Actions en masse, exports et finitions

Compléter l'outil avec les gains de productivité transverses et la passe qualité. À la fin,
la v1 est complète, accessible sur les parcours critiques et prête pour un usage quotidien.

### Story 9.1 — Sélection multiple et actions en masse

As a CM,
I want sélectionner plusieurs posts et agir sur eux d'un coup,
so that je traite les opérations répétitives rapidement.

#### Acceptance Criteria

1: Sélection multiple dans les vues Liste et Kanban (cases à cocher, « tout sélectionner » sur le résultat filtré) ; barre d'actions flottante.
2: Actions : dupliquer, changer de statut (soumis à `canTransition` pour chaque post, rapport des échecs), mettre en corbeille (règles FR45), réassigner à un autre CM.
3: Chaque action en masse est atomique par post et produit un récapitulatif (« 12 réussies, 2 refusées : … »).
4: Chaque modification unitaire est journalisée normalement (Story 4.4).
5: Tests d'intégration sur les cas partiels (certains posts hors droits).

### Story 9.2 — Export calendrier .ics

As a CM,
I want exporter le calendrier filtré au format .ics,
so that je le consulte dans Google Calendar ou Outlook.

#### Acceptance Criteria

1: Bouton « Exporter .ics » sur les vues calendrier/liste ; exporte les posts du résultat filtré.
2: Chaque post devient un VEVENT (titre = « [Client] Réseau — extrait », début = `scheduled_at` en Europe/Paris avec TZID correct, description = légende + statut + lien Canva).
3: Le fichier est valide (RFC 5545) et s'importe sans erreur dans Google Calendar et Outlook.
4: Tests unitaires sur la génération (échappement, fuseau, événements multiples).

### Story 9.3 — Export PDF du calendrier client

As a Lead CM,
I want exporter en PDF le calendrier d'un client sur une période,
so that je le partage avec un client qui ne veut pas se connecter.

#### Acceptance Criteria

1: Depuis la fiche client ou le calendrier filtré sur un client : « Exporter PDF » avec choix de la période.
2: Le PDF liste les posts par date : date/heure, réseau, légende complète, miniature, statut ; en-tête avec logo et nom du client.
3: Génération fiable pour ~80 posts (pagination correcte) ; temps de génération raisonnable (< 10 s).
4: Décision d'implémentation (Edge Function HTML→PDF vs `react-pdf`) documentée dans l'architecture.
5: Test de non-régression visuel léger (snapshot du HTML source si rendu serveur).

### Story 9.4 — Champ performance et vue de suivi léger

As a CM,
I want noter la performance d'un post après publication,
so that je capitalise sans outil d'analytics.

#### Acceptance Criteria

1: Le champ `performance_note` (Story 3.1) est éditable sur les posts « publié » ; historique des modifications inclus.
2: Un filtre « a une note de performance » et l'affichage de la note dans la vue liste.
3: Option de visibilité de la note pour le client (par défaut interne) respectée dans l'espace client (Story 6.4).
4: Tests d'intégration sur la visibilité.

### Story 9.5 — Passe accessibilité et polish UI

As a utilisateur,
I want une interface accessible et cohérente sur les parcours critiques,
so that l'outil est confortable et conforme WCAG AA.

#### Acceptance Criteria

1: Audit AA des parcours : connexion, navigation calendrier (clavier + lecteur d'écran), ouverture/édition/validation d'un post, ajout de commentaire, approbation côté client.
2: Corrections : contrastes, focus visibles, rôles/labels ARIA, ordre de tabulation, statut jamais porté par la seule couleur.
3: Passe visuelle cohérente (espacements, typographie, états vides, états de chargement, messages d'erreur) — appui possible sur la skill design / agent UX.
4: Les vues larges respectent les mémoires projet (pas de `max-w` étroit, exploitation de l'écran 32").
5: Un lint d'accessibilité (eslint-plugin-jsx-a11y) passe sans erreur ; check axe sur les pages clés en E2E.

## Checklist Results Report

_À exécuter via la tâche `execute-checklist` avec `pm-checklist` une fois le PRD relu et
validé par l'utilisateur._

## Next Steps

### UX Expert Prompt

À partir de `docs/prd.md`, produire `docs/front-end-spec.md` : arborescence des écrans,
wireframes basse fidélité du calendrier multi-clients et du panneau de détail post, parcours
de validation interne et client, et l'espace client mobile-first. Cible WCAG AA, interface
sobre mettant en avant les logos clients, densité maîtrisée pour grand écran.

### Architect Prompt

À partir de `docs/prd.md` (et `docs/front-end-spec.md` s'il existe), produire
`docs/architecture.md` (template fullstack) : schéma Supabase complet avec toutes les
policies RLS d'isolation client, Edge Functions (`canva-preview`, exports, jobs),
ordonnancement `pg_cron`, structure du dépôt, stratégie de tests (dont tests RLS), et
`docs/architecture/coding-standards.md`, `tech-stack.md`, `source-tree.md` pour l'agent dev.
Contraintes fermes : SPA React/Vite + Supabase, zéro API tierce payante, in-app only en v1.
