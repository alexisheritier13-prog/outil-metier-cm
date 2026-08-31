# Cadence — brief de refonte design

> **À lire par un designer (session Claude dédiée).** Ce document décrit
> **exactement** l'application telle qu'elle existe aujourd'hui. Ta mission est
> une **refonte visuelle et d'interaction des écrans existants** — pas une
> évolution fonctionnelle.
>
> **Règle absolue : tu n'ajoutes aucune fonctionnalité, tu n'en retires aucune,
> tu ne renommes aucun concept, tu ne changes aucune route.** Si tu penses qu'une
> fonction manque ou est en trop, tu le **notes en annexe** — tu ne la dessines
> pas.

---

## 1. Ce qu'est Cadence

Outil métier de **Community Management pour une agence**. Il sert à planifier les
publications réseaux sociaux de plusieurs clients et à les faire passer par un
**circuit de validation** : le CM prépare un post → un chef de projet valide en
interne → le client approuve → le post est planifié puis marqué publié.

Deux espaces dans la même app, un seul système de design :

- **Espace agence** (`/app`) — dense, outillé, pour un usage quotidien intensif
  sur grand écran.
- **Espace client** (`/portail`) — minimal, rassurant, usage épisodique, souvent
  sur mobile.

Le nom « Cadence » évoque le rythme de publication régulier. Ton de marque :
**sobre, professionnel, neutre — l'outil disparaît derrière le travail du CM.**
Vocabulaire strictement constant d'un écran à l'autre.

C'est une SPA React. Aucun back-office serveur : Supabase (base + auth) fait tout,
la sécurité est en base (RLS). Version actuelle : mono-agence, mode clair
uniquement, français uniquement.

---

## 2. Personas et contextes

| Persona | Rôle (clé technique) | Contexte | Attentes |
|---|---|---|---|
| **Community Manager** | `cm` | Grand écran (souvent 27–32"), plusieurs heures d'affilée, en concentration. Jongle entre 5–15 clients, 15–30 posts/mois/client. | Voir la charge d'un coup d'œil, créer un post en < 30 s, ne rien oublier (visuel manquant, deadline, marronnier). Tolère la densité, déteste les clics inutiles. |
| **Chef de projet** | `lead` | Supervise 3–5 CM. Vit dans la file « À valider » et la liste clients. | Repérer les clients à risque, valider vite, garder la traçabilité. |
| **Directeur** | `admin` | Usage ponctuel. Cas particulier : **freelance solo** = il est directeur *et* CM, active le mode « CM seul ». | Gérer les comptes, les seuils d'alertes, le circuit de validation, le journal des jobs. |
| **Contact client** | `client` | 1–2×/semaine, souvent pressé, parfois sur mobile. Ne connaît pas l'outil. | Voir ce qui est proposé, approuver ou demander une correction en deux clics. |

> Le mémoire projet contient deux préférences fortes de l'utilisateur, à
> respecter : **écran de référence = 32" QHD** (les maquettes en 1280 px « font
> petit ») ; **jamais de conteneur centré étroit (`max-w`) sur les vues
> liste/calendrier/tableau** — seule la prose (aide, charte) est bornée à ~70ch.

---

## 3. Contraintes dures (ne pas toucher)

1. **Aucune fonctionnalité ajoutée ou retirée.** Chaque écran de l'inventaire §6
   doit exister à l'identique en fonctions et en données après ta refonte.
2. **Routes inchangées** (§5). Pas de fusion, pas de découpage d'écrans.
3. **Vocabulaire des statuts de post inchangé** : Brouillon · À valider (interne)
   · À valider (client) · Validé · Planifié · Publié. Même mot partout.
4. **Rôles inchangés** : Directeur / Chef de projet / CM / Client.
5. **Le circuit de validation** (ordre des statuts, qui fait quoi) est de la
   logique métier — tu n'y touches pas, tu l'habilles.
6. **Deux densités, un système** : espace agence dense / espace client minimal,
   mais **mêmes tokens, mêmes composants, même vocabulaire**.
7. **Mode clair uniquement.** Le mode sombre peut être *proposé en annexe* comme
   piste future, jamais livré ici.
8. **Français uniquement.**
9. **Accessibilité WCAG 2.1 AA** sur les parcours critiques (connexion,
   navigation calendrier au clavier + lecteur d'écran, édition/validation d'un
   post, commentaire, approbation client). Contraste corps ≥ 4.5:1, grands textes
   et composants ≥ 3:1, focus visible partout, **le statut n'est jamais porté par
   la seule couleur** (toujours texte + icône + couleur). Cibles tactiles
   ≥ 44×44 px dans l'espace client. Zoom 200 % sans scroll horizontal du corps.
   `prefers-reduced-motion` respecté.
10. **Anti-références** (ne pas produire) : template « hero-metric » (gros chiffre
    + petit label + stats + accent dégradé), glassmorphism, dégradés décoratifs,
    eyebrow tracké au-dessus de chaque section, **bordure latérale colorée épaisse
    comme accent d'état**, scrollbars custom, modales exotiques, réinvention
    d'affordances standard.
11. **Références positives** : Linear, Notion, Height, Attio, Stripe Dashboard.

---

## 4. Stack d'implémentation (ta proposition doit être constructible dedans)

Le design revient ensuite à un dev pour intégration. Tout ce que tu proposes doit
se traduire en :

- **React 18 + TypeScript**, SPA (Vite). Pas de SSR.
- **Tailwind CSS 3.4** — utilitaires uniquement, pas de CSS ad hoc sauf tokens.
- **shadcn/ui** (primitives **Radix**) : `button`, `input`, `label`, `dialog`,
  `sheet` (panneau latéral), `popover`, `tabs`. Tu peux faire évoluer leur style,
  pas les remplacer par une autre lib.
- **lucide-react** pour les icônes (trait 1.5–2). Jamais mêlées aux logos couleur
  des clients.
- **FullCalendar v6** pour la vue calendrier (habillage CSS possible, pas de
  remplacement).
- Tokens en **OKLCH** dans `src/styles/globals.css`, exposés en classes Tailwind
  via `tailwind.config.ts`.
- Animations : `tailwindcss-animate` (`animate-in`, `fade-in`, `slide-in-from-*`).

Livrable idéal : **maquettes HTML/CSS statiques** des écrans clés (utilisant les
vrais tokens en variables CSS) + un **document de design system** mis à jour. Pas
de Figma seul (non exploitable par le dev).

---

## 5. Routes (inventaire exhaustif — ne pas modifier)

### Public
- `/login` — connexion (email + mot de passe).

### Espace agence `/app` (coquille `AppLayout` = barre latérale)
- `/app` — **Tableau de bord** (accueil).
- `/app/planning` — **Planning** (calendrier mois / semaine / liste / kanban).
- `/app/a-valider` — **File « À valider »** (interne + client).
- `/app/alertes` — **Alertes**.
- `/app/demandes` — **Demandes clients** (briefs entrants).
- `/app/idees` — **Banque d'idées**.
- `/app/templates` — **Templates de posts**.
- `/app/marronniers` — **Marronniers** (calendrier des temps forts).
- `/app/aide` — **Aide** (doc in-app, prose).
- `/app/clients` — **Liste des clients**.
- `/app/clients/:id` — **Fiche client** (6 onglets, voir §6).
- `/app/campagnes` — **Liste des campagnes**.
- `/app/campagnes/:id` — **Détail d'une campagne**.
- `/app/corbeille` — **Corbeille** (chef de projet / directeur). Posts + clients supprimés, purge 60 j.
- `/app/parametres` — **Paramètres** (index, directeur).
- `/app/parametres/utilisateurs` — comptes internes, rôles, clients assignés.
- `/app/parametres/workflow` — **Circuit de validation** (bascule « CM seul »).
- `/app/parametres/alertes` — seuils du moteur d'alertes.
- `/app/parametres/jobs` — journal des tâches planifiées.

### Vue imprimable autonome (hors coquille, pas de barre latérale)
- `/app/clients/:id/export` — **Calendrier client imprimable** (choix de période,
  bouton « Imprimer / Enregistrer en PDF »).

### Espace client `/portail` (coquille `PortalLayout` = barre supérieure)
- `/portail` — **Calendrier** (lecture : mois / liste).
- `/portail/a-valider` — **À valider** (posts en attente de son retour).
- `/portail/publies` — **Publiés** (archive, recherche + filtres).
- `/portail/briefs` — **Briefs** (déposer / suivre une demande).

---

## 6. Inventaire des écrans — contenu, états, interactions

Pour chaque écran : ce qu'il contient, ses **états** (chargement / vide / erreur),
et les interactions clés. Redessine **tout** ça.

### 6.1 Connexion `/login`
Colonne centrée étroite. Logo « Cadence » + mot « Connectez-vous pour
continuer ». Champs email / mot de passe, bouton « Se connecter ». États :
identifiants invalides (message), compte désactivé (message). Redirige selon le
rôle (`/app` ou `/portail`).

### 6.2 Coquille agence — barre latérale (`AppLayout` + `AppSidebar`)
Barre latérale fixe, largeur ~240 px, fond `surface-2`, bordure droite. Sur
mobile/tablette : tiroir déclenché par un bouton hamburger dans un en-tête
supérieur.

Contenu de haut en bas :
1. **Logo** : pastille indigo « C » + « Cadence ».
2. **Navigation** :
   - Accueil (`/app`)
   - Planning (`/app/planning`)
   - Groupe repliable **Validation** : À valider (badge compteur) · Demandes
     clients (badge compteur)
   - Clients (`/app/clients`)
   - Groupe repliable **Bibliothèque** : Idées · Templates · Marronniers ·
     Campagnes
   - Alertes (`/app/alertes`) — badge compteur **rouge**
3. **Section basse** (séparée) : Corbeille (chef de projet/directeur) · Paramètres
   (directeur) · Aide.
4. **Bloc utilisateur** : avatar (initiales), nom, libellé de rôle, bouton
   déconnexion.

État actif : fond `background` + ombre légère + icône en indigo. Les groupes
s'ouvrent automatiquement si l'écran courant est dedans.

### 6.3 Tableau de bord `/app`
En-tête « Bonjour {prénom} » + date du jour en toutes lettres. Puis :
- **4 tuiles « à traiter »** (grille) cliquables : À valider en interne · En
  attente du client · Demandes clients ouvertes · Alertes non vues (teinte
  danger/warning selon criticité). Chiffre + libellé + icône. Pas de « hero
  metric ».
- **Grille 3 colonnes** : à gauche (2/3) « Cette semaine » — posts des 7 jours à
  venir groupés par jour (Aujourd'hui / Demain / jour de semaine), chaque ligne
  cliquable vers le planning. À droite (1/3) : « Clients à surveiller » (issu des
  alertes, dédupliqué par client) + « Activité récente » (8 derniers changements
  de statut / corbeille, avec « il y a N h »).
États : chargement (skeletons par bloc), vide (peu probable, mais chaque bloc a
son état vide).

### 6.4 Planning `/app/planning`
L'écran central. En-tête `PageHeader` : titre « Planning », `aside` =
**`Segmented`** (Mois / Semaine / Liste / Kanban), `actions` = bouton « Exporter
.ics » + bouton « Nouveau post ».

Sous l'en-tête : **`FiltersBar`** (barre sticky) — multi-sélecteurs Client /
Statut / Réseau (popovers avec cases), plage de dates (2 champs date), champ de
recherche, bascule « Avec note de perf », bouton « Réinitialiser ». Les filtres
sont dans l'URL (partageable).

En vues Mois/Semaine : case à cocher « Afficher les marronniers » (surimpression
discrète sur le calendrier).

**Vue Mois / Semaine** : FullCalendar. Événements = posts, teintés selon le
statut (fond doux + contour, jamais une bande latérale). Numéro du jour, week-end
teinté, pastille « aujourd'hui ». Drag & drop pour replanifier (optimiste).
Marronniers = filet pointillé en tête de case, non cliquable.

**Vue Liste** : tableau dense, virtualisé au-delà de 80 lignes. Colonnes : case à
cocher · Date · Client · Réseau · Légende (+ note de perf si présente, en vert
avec icône) · Statut · action corbeille. En-tête triable (Date / Client /
Statut). Ligne entière cliquable → ouvre le panneau de détail. Tableau **allégé**
(pas de cadre extérieur, filets discrets).

**Vue Kanban** : 6 colonnes = 6 statuts. Cartes déplaçables entre colonnes si la
transition est permise (sinon la colonne n'accepte pas le drop). Case à cocher
par carte.

**Sélection multiple** (Liste + Kanban) : cocher des posts fait apparaître une
**barre d'actions flottante** en bas (`BulkActionBar`) : « N sélectionnés » ·
Tout sélectionner (N) · Dupliquer · Statut (popover) · Réassigner (popover,
chef de projet/directeur) · Corbeille · fermer. Après action : dialogue de
récapitulatif « X réussies, Y refusées : … ».

**Nouveau post** : dialogue avec `PostForm` (voir 6.16).

États : chargement (skeleton de tableau, l'en-tête et les filtres restent),
aucun client (« créez d'abord un client »), aucun post (état vide qui apprend).

### 6.5 Panneau de détail d'un post — `PostSheet`
Panneau latéral droit (`Sheet`, ~480 px, plein écran < 768 px), ouvert sans
quitter le planning. En-tête : nom du client + réseau, bouton fermer.
Onglets **Détail** / **Historique**.

Onglet Détail :
- **Statut** + `StatusActions` : boutons nommés pour chaque transition permise au
  rôle (« Soumettre à la validation interne », « Valider en interne », « Renvoyer
  au rédacteur », « Planifier », « Marquer comme publié »…). Certaines exigent un
  commentaire → mini-dialogue.
- Aperçu du visuel Canva (image) si disponible.
- Liste de définition : Date (heure de Paris), Réseau, Lien Canva.
- Légende (texte complet).
- Campagne / Origine (idée, demande, marronnier…) / Tags si présents.
- **Section Performance** (si post « Publié ») : zone de texte + case « Visible
  par le client », bouton Enregistrer, retour « Enregistré ».
- **Fil de commentaires** (`CommentThread`) : commentaires internes ou visibles
  client, avec rappel de visibilité.

Onglet Historique (`PostHistory`) : liste chronologique des changements (statut,
champs modifiés, commentaires) avec auteur et date.

Pied : boutons Modifier (ouvre `PostForm` en dialogue) · Dupliquer · Corbeille.

### 6.6 File « À valider » `/app/a-valider`
`PageHeader` + **`Segmented`** (À valider en interne / En attente du client) +
`<select>` filtre par client. Tableau (allégé) trié par ancienneté dans le
statut (le plus vieux d'abord) : Client · Réseau · Prévu le · Légende · Rédacteur
· En attente depuis · actions (Ouvrir · Valider en interne [selon rôle] ·
Relancer le client). Ouvrir → `PostSheet`. États : chargement (skeleton), rien à
valider (état vide selon l'onglet).

### 6.7 Alertes `/app/alertes`
`PageHeader` + bouton « Lancer la détection » (chef de projet/directeur). Liste
d'alertes groupées ou triées par sévérité. Chaque alerte : **fond teinté +
bordure pleine 1 px + point de couleur en tête** (info bleu / warning ambre /
critical rouge), type, message, client concerné, lien vers le post (`?post=<id>`
sur le planning). Actions : marquer vue / ignorer. État vide : « aucune alerte ».

### 6.8 Demandes clients `/app/demandes`
Briefs déposés par les clients. Liste avec `RequestStatusBadge` (nouvelle →
neutre · prise en compte → info · traitée → succès). Ouvrir → panneau `Sheet` :
détail, commentaires (`RequestComments`), bouton « Transformer en post ».
Pastille compteur dans la nav.

### 6.9 Banque d'idées `/app/idees`
Filtres client / tag / mot-clé. Liste d'idées (titre, tags, client optionnel).
Créer / éditer (dialogue ou inline) / **supprimer définitivement**. Bouton
« Transformer en post ». Une idée sans client est visible de tous les internes.
Section « Posts générés » depuis une idée.

### 6.10 Templates `/app/templates`
Liste de templates (nom, réseau, portée globale ou client). CRUD + aperçu.
Utilisés via un `<select>` « Partir d'un template » dans `PostForm`.

### 6.11 Marronniers `/app/marronniers`
`PageHeader` + bouton « Nouveau marronnier ». **Liste groupée par mois** (~68
entrées globales pré-remplies). Chaque ligne : jour · nom · badge de portée
(Global / Secteur / Client) · « annuel » · boutons Planifier / Modifier /
supprimer. « Planifier » crée un post brouillon à cette date.

### 6.12 Aide `/app/aide`
Page de **prose** (bornée ~72ch). Sections : En deux mots · Le circuit d'un post
(schéma avec les `StatusBadge`) · Qui fait quoi (liste par rôle) · Où trouver
quoi (grille de cartes-liens vers les écrans) · Raccourcis et astuces · Un souci.

### 6.13 Liste des clients `/app/clients`
Recherche + case « inclure les archivés ». Tableau (allégé) : Client (avatar +
nom, lien) · Secteur · À valider (compteur) · Onboarding (progression) ·
Dernière activité. En-têtes triables. État vide selon rôle (créer un client /
aucun client assigné).

### 6.14 Fiche client `/app/clients/:id`
Fil d'Ariane. En-tête : avatar client (logo ou initiales) + nom + secteur +
statut (Actif / Archivé) + progression onboarding. Actions : Exporter PDF ·
Modifier · Archiver · Corbeille (selon rôle).

**6 onglets** (`Tabs`) :
1. **Vue d'ensemble** — liste de définition (nom, secteur, logo, créé le).
2. **Comptes sociaux** — table des réseaux du client (ajouter / retirer).
3. **Contacts** — contacts de validation, bouton « Inviter » (génère un lien
   d'accès, affiché à copier).
4. **Charte** — charte éditoriale (éditeur de texte, sauvegarde avec retour
   « Enregistré »).
5. **Onboarding** — checklist réordonnable par flèches, cases à cocher,
   progression.
6. **Activité** — journal d'activité du client (filtres type + période).

### 6.15 Campagnes `/app/campagnes` et `/app/campagnes/:id`
Liste : nom, client, nb de posts. Détail : en-tête + liste des posts de la
campagne (mêmes lignes que la vue Liste du planning).

### 6.16 `PostForm` (dialogue) — création / édition de post
Champs : Client (`<select>`) · « Partir d'un template » (`<select>`) · Réseau
(`<select>`) + encart des specs du réseau · Date + heure (heure de Paris) ·
Légende (zone de texte) · **`CanvaField`** (lien Canva + aperçu auto/manuel +
bouton aperçu iframe) · Campagne (`<select>`) · Tags (saisie libre) · Rédacteur
(`<select>`, réassignation, chef de projet/directeur). Boutons Créer/Enregistrer
+ Annuler. Erreurs de validation inline.

### 6.17 Corbeille `/app/corbeille`
Deux sections : posts / clients supprimés. Chaque ligne : contenu, « supprimé le
X · purge le Y ». Actions : Restaurer (chef de projet/directeur) · Purger
maintenant (directeur). État vide.

### 6.18 Paramètres — `/app/parametres` (+ sous-pages)
- **Index** : liste de liens (Utilisateurs · Circuit de validation · Seuils des
  alertes · Tâches planifiées), colonne bornée `form`.
- **Utilisateurs** : table des comptes internes (nom, email, rôle éditable,
  actif/inactif, clients assignés via dialogue). Sa propre ligne est verrouillée.
  Dialogue « Créer un utilisateur ».
- **Circuit de validation** : une case à cocher « Mode CM seul » + explication
  (freelance/studio solo). Bouton Enregistrer.
- **Seuils des alertes** : ~6 champs numériques avec bornes et explication.
- **Tâches planifiées** : table des dernières exécutions (job, date, durée,
  résultat, erreur), boutons « Lancer la détection » / « Purger la corbeille ».

### 6.19 Calendrier client imprimable `/app/clients/:id/export`
Page autonome, **pas de barre latérale**. Barre d'outils (masquée à
l'impression) : retour fiche, 2 champs date (période), bouton « Imprimer /
Enregistrer en PDF ». Document : en-tête (logo + nom client + période + total +
date d'édition), posts **groupés par jour**, chaque ligne = miniature + heure +
réseau + statut + légende complète + note de perf si partagée. CSS `@media
print` : sauts de page propres.

### 6.20 Coquille client — barre supérieure (`PortalLayout`)
Barre supérieure sur deux niveaux, fond `surface`, sticky :
- Ligne 1 : logo client (ou initiales) + nom (ou `<select>` si le contact a
  plusieurs clients) ; à droite nom du contact + bouton déconnexion.
- Ligne 2 : **barre d'onglets soulignée** — Calendrier · À valider (badge
  compteur) · Publiés · Briefs. Onglet actif = souligné indigo.
Contenu centré `max-w-5xl`. État « aucun client rattaché » = `EmptyState`.

### 6.21 Portail — Calendrier `/portail`
`Segmented` Mois / Liste. Mois = FullCalendar en **lecture seule**. Liste =
lignes (date lisible · heure · réseau · légende · statut). Cliquer une entrée →
`PortalPostDetail`. État vide : « les posts préparés par votre agence
apparaîtront ici ».

### 6.22 Portail — À valider `/portail/a-valider`
Titre « À valider » + compteur. Liste `surface-card` des posts en attente du
retour du contact. Cliquer → `PortalPostDetail` avec les boutons **Approuver** /
**Demander une modification** (commentaire obligatoire). État vide : « vous êtes
à jour ».

### 6.23 Portail — Publiés `/portail/publies`
Filtres : recherche mot-clé + réseau + période. Grille de cartes (miniature +
date + réseau + légende + note de perf si partagée). Cliquer → `PortalPostDetail`.

### 6.24 Portail — Briefs `/portail/briefs`
Bouton « Nouvelle demande » → formulaire (titre, description, réseau souhaité,
échéance). Liste `surface-card` des demandes avec `RequestStatusBadge`. Ouvrir →
`Sheet` : détail, modification (si statut « nouvelle »), commentaires. État vide.

### 6.25 `PortalPostDetail` (panneau)
`Sheet` en lecture. En-tête (réseau + date). Aperçu visuel, liste de définition,
légende, performance (si visible client), fil d'échanges. Si le post est « À
valider (client) » : footer Approuver / Demander une modification.

---

## 7. Système de design **actuel** (état réel)

> Les fichiers `docs/PRODUCT.md` et `docs/DESIGN.md` du repo donnent l'intention
> mais sont **partiellement datés** (ils décrivent un état antérieur monochrome).
> Ce qui suit décrit l'état **réel en production**.

### Couleur (tokens OKLCH, `src/styles/globals.css`)
- Fond : `--background` blanc franc. Encre : `--foreground` ≈ `oklch(0.24 0.012 274)`.
- Neutres **légèrement teintés indigo** (chroma ~0.004) : `--surface`,
  `--surface-2` (barres d'outils, en-têtes), `--surface-3` (survol sidebar),
  `--muted-foreground` ≈ `oklch(0.446 0.014 274)` (~5.4:1 sur blanc),
  `--border`, `--border-strong`.
- **Accent indigo** (hue 274) : `--primary` `oklch(0.52 0.19 274)`,
  `--primary-surface` (fond d'état actif nav/sélection), `--primary-strong`
  (texte sur surface), `--primary-border`, `--ring`. Sert aux actions primaires,
  à la sélection, au focus, à l'onglet actif du portail.
- **Sémantique** — 4 rôles, chacun avec `-surface` / `-strong` / `-border` /
  `-foreground` :
  | Rôle | Hue | Sens |
  |---|---|---|
  | `--success` | ~158 vert | Validé, approuvé, planifié, confirmation |
  | `--warning` | ~62 ambre | À valider client, deadline proche, visuel manquant |
  | `--danger` (= `--destructive`) | ~27 rouge | Suppression, refus, alerte critique, erreur |
  | `--info` | ~264 bleu | À valider interne, informations neutres |
- **Statuts de post** (`POST_STATUS_TONE`) : Brouillon → neutre (contour) ·
  À valider interne → info (doux) · À valider client → attention (doux) ·
  Validé → succès (doux) · Planifié → succès (plein) · Publié → neutre foncé
  (plein, « terminé »).
- Règle : `strong` sur `surface` toujours ≥ 4.5:1. **Jamais de gris sur
  couleur.** Jamais de bordure latérale colorée épaisse.

### Typographie
Une seule famille : **Inter Variable** (self-host). Mono système pour liens
Canva / ids. Échelle rem fixe (pas de `clamp`) :
| Élément | Classe | Taille | Poids |
|---|---|---|---|
| Titre de page | `text-title` | 22 px | 600, `tracking-tight` |
| Section | `text-section` | 16 px | 600 |
| Corps | — | 14 px | 400 |
| Dense | `text-dense` | 13 px | 400 |
| Méta | — | 12 px | 400–500 |
`text-wrap: balance` sur h1–h3. Pas d'ALL CAPS en corps.

### Formes, ombres, profondeur
- `--radius` **10 px** (cartes, panneaux) ; ~7 px (inputs, boutons) ; ~5 px
  (badges) — dérivés via `calc()`.
- Ombres : `shadow-card` (subtile, cartes / item nav actif), `shadow-panel`
  (dialogues, `Sheet`, barre flottante).
- Z-index sémantique : dropdown 1000 · sticky 1100 · panel 1200 ·
  modal-backdrop 1300 · modal 1400 · toast 1500 · tooltip 1600.
- Espacement en multiples de 4 px. Rythme vertical varié (sections 24–32 px,
  intra-panneau 12–16 px).

### Primitives de mise en page (à réutiliser / faire évoluer, pas supprimer)
- `<Page size="full|form">` — coquille (`p-6`, largeur bornée seulement en `form`).
- `<PageHeader title description actions aside>` — en-tête homogène.
- `<Segmented value onChange options>` — bascule de vue (`role="tablist"`).
- `<Skeleton>` / `<TableSkeleton>` — chargement, préféré au spinner central.
- `<EmptyState icon title description action>` — état vide qui apprend
  l'interface (icône dans une pastille ronde).
- Classe `.field` — `<select>` / `<input type=date>` natifs homogènes (`h-9`).
- Classe `.surface-card` — bloc encadré arrondi.

### Composants métier
- **`StatusBadge`** — icône lucide + libellé + fond teinté du statut. Jamais la
  couleur seule.
- **`RequestStatusBadge`** — pour les briefs.
- **`NetworkIcon`** — pastille monochrome 2 lettres (IG, IN, FB, TT, X, YT, PT,
  TH) + nom en `sr-only` (ou visible si `withLabel`). Pas de logo couleur.
- **`ClientAvatar`** — logo client ou initiales, repli si l'image casse.
- **`PostSheet`**, **`PostForm`**, **`CanvaField`**, **`CommentThread`**,
  **`PostHistory`**, **`StatusActions`**, **`PerformanceSection`**,
  **`BulkActionBar`**, **`FiltersBar`** — voir §6.

### Motion (état actuel)
- Transitions 150–250 ms, `ease-out`.
- Entrée de page : `fade-in` + `slide-in-from-bottom` 4 px, 300 ms (sur `<Page>`
  et les sections du portail).
- Tableau de bord : cascade légère des 4 tuiles (~60 ms de décalage).
- Cartes cliquables : `hover:-translate-y-0.5` + ombre.
- Drag & drop et changements de statut : **optimistes avec rollback**.
- `prefers-reduced-motion: reduce` : neutralise durées **et** délais
  (animation + transition).

---

## 8. Zones où un regard neuf aiderait (observations, pas des ordres)

Tu es libre de repenser l'ensemble, mais voici où le design actuel semble le plus
perfectible :

- **Le tableau de bord** est fonctionnel mais générique (tuiles + deux colonnes).
  Il gagnerait à mieux hiérarchiser « ce que je dois faire maintenant ».
- **Densité des tableaux** (Planning liste, file à valider, clients) — allégés
  récemment mais le rythme colonne / ligne / survol peut être plus fin.
- **Le calendrier FullCalendar** : l'habillage est correct mais reste « FullCalendar ».
  La lisibilité des posts par client (couleur ? initiales ? pastille ?) mérite
  réflexion — sachant que la couleur porte déjà le **statut**, pas le client.
- **L'espace client** vient d'être réaligné mais reste sobre au point d'être un
  peu plat ; il doit rester minimal mais peut être plus chaleureux / rassurant.
- **Les formulaires** (`PostForm`, formulaires de la fiche client) sont
  fonctionnels, peu travaillés.
- **États vides et de chargement** : cohérents mais basiques.
- **Cohérence des micro-interactions** (survols, focus, retours de sauvegarde
  « Enregistré ») — à uniformiser.

---

## 9. Livrable attendu

1. **Design system mis à jour** — palette (tokens OKLCH), échelle typo, formes,
   ombres, motion. Format : un document type `DESIGN.md` + les tokens en
   variables CSS prêtes à coller dans `globals.css`.
2. **Maquettes HTML/CSS statiques** (utilisant les tokens) des écrans clés, dans
   l'ordre de priorité :
   1. Coquille agence + **Tableau de bord**
   2. **Planning** — vue Liste + vue Mois + `FiltersBar` + `BulkActionBar`
   3. **Panneau de détail d'un post** (`PostSheet`, onglet Détail)
   4. **File « À valider »**
   5. **Fiche client** (en-tête + un onglet)
   6. **Alertes**
   7. Coquille client + **Portail Calendrier** + **Portail À valider**
   8. **Aide** (traitement de la prose)
   9. **Connexion**
3. **Spécifications par composant** modifié (`StatusBadge`, `Segmented`,
   `EmptyState`, boutons, `Sheet`, `FiltersBar`…) : états (défaut / survol /
   focus / actif / désactivé), tailles, tokens utilisés.
4. **Annexe** : tout ce que tu remarques comme manquant, en trop, ou incohérent
   — **listé, pas dessiné**.

## 10. Ne pas produire

- Pas de Figma seul (non exploitable par le dev).
- Pas de nouvelle fonctionnalité, pas de route modifiée, pas de concept renommé.
- Pas de mode sombre livré (annexe « piste future » acceptée).
- Pas de page marketing / landing / pricing (hors périmètre, chantier séparé).
- Pas de changement du vocabulaire de statut ni des libellés de rôle.
- Pas de dépendance UI nouvelle (on reste sur Tailwind + Radix/shadcn + lucide +
  FullCalendar).
