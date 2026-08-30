# Project Brief — Outil métier Community Management (« outil-metier-cm »)

## Executive Summary

Outil métier sur-mesure pour une agence de Community Management, destiné à remplacer
l'usage actuel de Notion. Il couvre le quotidien d'un CM en agence : planification
multi-clients des posts réseaux sociaux, workflow de validation interne puis client,
organisation du contenu (idées, templates, marronniers) et suivi. La v1 est un outil de
**planification et de validation** — la publication reste manuelle. Aucun fichier visuel
n'est stocké : les visuels vivent dans Canva, l'outil ne gère que des liens et une
miniature de preview récupérée gratuitement.

## Problem Statement

L'équipe planifie aujourd'hui les posts clients dans Notion (bases de données + vue
calendrier). À mesure que le nombre de clients croît, les limites apparaissent :

- Pas de vue calendrier réellement pensée pour le multi-clients.
- Pas de workflow de validation structuré ; les allers-retours passent par email/Slack en
  complément de Notion, ce qui casse la traçabilité.
- Statuts de posts non standardisés d'un client à l'autre.
- Notion devient lent et confus avec plusieurs clients et beaucoup de contenu en parallèle.
- Pas d'espace dédié et cadré pour que le client valide ses posts.

## Proposed Solution

Une application web dédiée où :

- chaque **post** porte un statut clair dans un pipeline standard (brouillon → à valider
  interne → à valider client → validé → planifié → publié), un client, un rédacteur, un
  lien Canva avec miniature, un fil de commentaires et un historique ;
- le **workflow de validation** est explicite et tracé, de la relecture interne à
  l'approbation poste par poste par le client ;
- un **espace client** isolé permet au client de voir son calendrier, commenter, approuver
  ou refuser, et déposer des briefs ;
- l'**organisation du contenu** est outillée : banque d'idées, templates, calendrier des
  temps forts / marronniers, tags, duplication rapide ;
- des **alertes in-app** signalent les risques : validation en attente, deadline proche
  sans validation, trou de calendrier, post sans visuel, marronnier sans post prévu.

## Target Users

| Rôle | Description | Droits |
|---|---|---|
| **CM** | Crée et rédige les posts de ses clients assignés | CRUD sur ses posts ; ne peut pas supprimer un post validé client ; voit ses clients assignés |
| **Lead CM / Responsable** | Supervise plusieurs CM et clients | Validation interne, gestion clients, vues globales, suppression/archivage |
| **Admin agence** | Gestion globale | Comptes, rôles, paramètres, purge corbeille |
| **Client** | Valide le contenu le concernant | Voit son calendrier, commente, approuve/refuse poste par poste, dépose des briefs ; isolation stricte |

## MVP Scope (v1)

### Inclus

- Gestion complète des utilisateurs internes (création, rôles, activation/désactivation,
  assignation multi-clients).
- Gestion des clients : CRUD, archivage/réactivation, comptes sociaux, contacts de
  validation multiples, charte éditoriale, **checklist d'onboarding**.
- Posts : CRUD complet, pipeline de statuts, lien Canva + miniature preview, tags,
  campagne (optionnelle, voir plus bas), commentaires, historique.
- Workflow de validation interne puis client, poste par poste.
- **Espace client** : calendrier interactif, approbation/refus + commentaires, historique,
  **espace de brief client → agence**.
- Vues : calendrier mensuel (défaut), semaine, liste, kanban par statut, liste clients.
- Recherche et filtres transverses : client, statut, réseau, période, mot-clé, tag.
- Organisation : banque d'idées, templates de posts, duplication, calendrier des
  marronniers par client, tags.
- Alertes **in-app uniquement** (page dédiée + badges).
- Collaboration : fils de commentaires (interne / client), historique complet des actions.
- Actions en masse : dupliquer, changer de statut, supprimer, réassigner.
- Export : calendrier `.ics`, export PDF d'un calendrier client.
- Suivi de performance léger : champ libre par post (pas de module analytics).
- Corbeille avec restauration ; **purge automatique après 60 jours** (posts et clients) ;
  suppression définitive sans corbeille pour idées, tags, templates.

### Décisions sur les points ouverts

| Point | Décision v1 |
|---|---|
| Volumétrie | Petite agence : ~10–20 clients actifs, ~15–30 posts/mois/client, ~5–10 utilisateurs internes |
| Campagnes | **Incluses** en v1 (entité légère : titre, client, période ; un post peut y être rattaché) |
| Onboarding client | **Checklist structurée** incluse |
| Espace brief client → agence | **Inclus** |
| Canal de notification | **In-app uniquement** |
| Rétention corbeille | **60 jours** puis purge auto |

> Note : les 4 réponses de cadrage ont retenu « checklist d'onboarding » et « espace brief
> client ». Les campagnes sont conservées en v1 comme entité légère car le modèle de
> données les référence déjà et le coût est faible ; si l'implémentation dérape, elles
> seront la première chose repoussée en v2.

### Hors-scope v1 (explicite)

- Publication automatique via API réseaux sociaux (Meta / LinkedIn) → v2.
- Reporting / analytics automatisé de performance.
- Facturation / gestion de projet globale de l'agence.
- Génération de contenu par IA.
- Stockage ou upload de fichiers visuels (tout reste dans Canva).
- API Canva Connect (payante, Enterprise uniquement).
- Modération de commentaires / DM réseaux sociaux.
- Veille concurrentielle.
- Notifications email / Slack (v2).

## Post-MVP Vision

- **v2** : publication automatique (Meta Business API, LinkedIn API), notifications
  email/Slack, analytics de performance connectés aux plateformes.
- **v3** : suggestions de contenu assistées par IA basées sur la charte éditoriale,
  génération de variantes de légende.

## Technical Preferences

- Stack laissée au choix de l'architecte. Contexte : l'auteur travaille habituellement en
  **React + Supabase**. Recommandation retenue : SPA React + TypeScript + Vite, backend
  Supabase (Postgres + RLS + Auth + Edge Functions), isolation client par Row Level
  Security. Détails dans `docs/architecture.md`.
- Contrainte forte : **zéro coût d'API tierce** pour la preview Canva (parsing `og:image`
  du lien de partage public).

## Constraints & Assumptions

- Lien Canva configuré au minimum « visible par toute personne ayant le lien » pour que la
  miniature se charge.
- Pas de publication automatique : le CM poste à la main, l'outil rappelle le jour J.
- Isolation stricte des données entre clients (un contact client ne voit jamais les
  données d'un autre client).
- Petite échelle : pas de contrainte de scale particulière, privilégier la simplicité.

## Risks & Open Questions

- **Fiabilité de la miniature Canva** : Canva peut changer son HTML public ou bloquer le
  scraping. Mitigation : fallback sur embed iframe + champ miniature éditable manuellement.
- **Charge de l'espace client** : s'assurer que l'UX client reste ultra-simple (approuver
  en 2 clics) sinon les clients retournent à l'email.
- **Périmètre v1** : le brief est riche ; le découpage en epics doit permettre de livrer un
  incrément utilisable tôt (calendrier + posts + validation interne) avant l'espace client.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-30 | v1.0 | Brief initial à partir du brief détaillé fourni + décisions de cadrage | Analyst (BMad) |
