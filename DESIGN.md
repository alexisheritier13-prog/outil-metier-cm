# Design

## Theme

Light, single mode (v1). Tokens en OKLCH dans `src/styles/globals.css`, exposés en classes
Tailwind via `tailwind.config.ts`. Neutres à **chroma 0** (noir & blanc assumés) ; la
couleur est **sémantique uniquement** (statut, sévérité, succès, erreur), jamais
décorative. Mode sombre : valeurs prévues dans la spec (`docs/front-end-spec.md` §6.2),
non activées.

Scène : un CM sur grand écran, lumière de bureau, plusieurs heures d'affilée, en
concentration. Un fond blanc franc et un texte quasi-noir tiennent la fatigue ; la couleur
ne sert qu'à faire ressortir ce qui compte.

## Color

Stratégie : **Restrained**. Accent = actions primaires + sélection + focus (monochrome
noir pour l'instant, à la demande). Couleur sémantique par rôle :

| Rôle | Token | Hue OKLCH | Sens |
|---|---|---|---|
| Succès | `--success` | 150 (vert) | Validé, approuvé, planifié, confirmation |
| Attention | `--warning` | 75 (ambre) | À valider client, deadline proche, visuel manquant |
| Danger | `--danger` / `--destructive` | 27 (rouge) | Suppression, refus, alerte critique, erreur |
| Info | `--info` | 240 (bleu) | À valider interne, informations neutres |
| Neutre | `--surface-2` / `--muted-foreground` | 0 | Brouillon, états inactifs |

Chaque rôle a : `--x` (aplat vif, texte blanc), `--x-surface` (fond teinté très léger),
`--x-strong` (texte foncé de la même teinte sur le fond teinté — jamais du gris sur
couleur), `--x-border`. Contraste vérifié : `strong` sur `surface` ≥ 4.5:1.

**Statuts de post** (`POST_STATUS_TONE` dans `src/shared/constants/postStatus.ts`) :
brouillon → neutre (contour) · à valider interne → info (doux) · à valider client →
attention (doux) · validé → succès (doux) · planifié → succès (plein) · publié → neutre
foncé (plein, « terminé »).

**Sévérité d'alerte** : info → bleu · warning → ambre · critical → rouge. Fond teinté +
bordure pleine 1 px + point de couleur en tête. **Jamais** de bordure latérale épaisse.

Le badge de compteur « Alertes » dans la nav est rouge (attention) ; les autres compteurs
(À valider, Demandes) restent monochromes.

## Typography

Une seule famille : **Inter Variable** (self-host), repli `ui-sans-serif, system-ui,
"Segoe UI", Roboto, sans-serif`. Mono `ui-monospace, "SF Mono", Menlo` pour liens Canva /
ids. Échelle rem fixe (pas de `clamp`), ratio ~1.2 :

| Élément | Taille | Poids |
|---|---|---|
| Titre de page (`text-title`) | 20 px | 600 |
| Section (`text-section`) | 16 px | 600 |
| Corps | 14 px | 400 |
| Corps dense (`text-dense`) | 13 px | 400 |
| Méta | 12 px | 400–500 |

`text-wrap: balance` sur h1–h3. Prose (charte, aide) plafonnée à ~70ch. Pas d'ALL CAPS en
corps ; réservé aux badges / libellés ≤ 3 mots.

## Components

shadcn/ui (Radix) : `button` (variantes `default` noir / `outline` / `ghost` /
`success` vert / `destructive` rouge), `input`, `label`, `dialog`, `tabs`, `sheet`,
`popover`. Icônes `lucide-react`, trait 1.5–2, 16 px en UI dense / 20 px en en-têtes —
jamais mêlées aux logos couleur des clients.

**Primitives de mise en page :**
- `<Page size="full|form">` : coquille (padding `p-6`, largeur bornée en `form`).
- `<PageHeader title description actions aside>` : en-tête de page homogène (titre
  `text-title tracking-tight`, description `max-w-[68ch]`, actions à droite, `aside` pour
  un contrôle inline type sélecteur de vue).
- `<Segmented value onChange options>` : bascule de vue (piste creusée `bg-surface-2`,
  option active en relief `bg-background shadow-sm`).
- `<Skeleton>` / `<TableSkeleton>` : chargement (préféré au spinner central).
- Classe `.field` (globals.css `@layer components`) : `<select>` / `<input type=date>`
  natifs à hauteur et style constants (`h-9`, `border-input`).

**Composants métier :**
- `StatusBadge` : icône + libellé + fond teinté du statut (`toneClasses` +
  `POST_STATUS_TONE`). Jamais la couleur seule.
- `RequestStatusBadge` : nouvelle → neutre · prise en compte → info · traitée → succès.
- `EmptyState` qui apprend l'interface.
- Panneau latéral droit `Sheet` (~480 px, plein écran < 768 px) pour le détail d'un post.
- Nav `/app` : menu déroulant « Contenu » (Popover) regroupe Campagnes/Idées/Templates/
  Marronniers pour tenir sur une ligne.

## Layout

- Vues calendrier / listes / tableaux : **pleine largeur** du viewport (padding latéral
  24–32 px). Pas de conteneur centré étroit. Seule la prose est bornée (~70ch).
- Rayons : `--radius` 8 px (cartes, panneaux), 6 px (inputs, boutons), 4 px (badges).
- Deux couches neutres : `--surface` (contenu) / `--surface-2` (barres d'outils, en-têtes
  de tableau).
- Z-index sémantique : dropdown 1000 → sticky 1100 → panel 1200 → modal-backdrop 1300 →
  modal 1400 → toast 1500 → tooltip 1600.
- Espacement multiples de 4 px ; rythme vertical varié (sections 24–32, intra-panneau
  12–16).

## Motion

150–250 ms sur les transitions. La motion porte l'état (changement de statut, feedback,
chargement), jamais la décoration. Drag & drop et changements de statut optimistes avec
rollback. Pas de séquence orchestrée au chargement. `@media (prefers-reduced-motion:
reduce)` : transitions instantanées ou fondu.
