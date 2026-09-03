# Post-v1 — Didacticiel : carrousel de présentation + visite guidée

**Statut :** livré. Front uniquement, aucune migration.

## Contexte

Un nouvel utilisateur agence arrive sur un tableau de bord dense sans savoir où
se trouve quoi. Surtout, l'équipe **n'a aucune visibilité sur l'espace client**
(le portail) : elle ne peut pas s'y connecter et ne voit donc jamais ce que le
client voit au moment de valider.

## Ce qui a été fait

Deux dispositifs complémentaires, dans `src/onboarding/` :

### 1. Carrousel de présentation (le « pourquoi »)

- `IntroCarousel.tsx` — modale `Dialog` de 6 écrans : bienvenue, le planning, le
  circuit de validation, **l'espace client**, bibliothèque & alertes, « à vous de
  jouer ». Pastilles de progression cliquables, `Précédent` / `Passer` /
  `Suivant`, `Terminer`.
- Chaque écran a une **illustration** (`introVisuals.tsx`, aucune donnée réelle).
  L'écran portail affiche `PortalPreviewMock.tsx` : reproduction non interactive
  du calendrier client + de l'écran de validation (boutons *Approuver* /
  *Demander une modification*, commentaire). Ce mock est aussi injecté dans
  l'Aide (onglet **Clients & portail**), toujours visible.
- Contenu figé dans `introSlides.tsx`.

### 2. Visite guidée en surbrillance (le « où »)

- `InterfaceTour.tsx` — surimpression maison (pas de dépendance). Un « trou »
  lumineux (`box-shadow` étalé + anneau `--primary`) se déplace sur la cible,
  bulle positionnée à côté, `Passer la visite` / `Précédent` / `Suivant`.
- Cibles = attribut `data-tour` sur la **barre latérale** (toujours montée) :
  `nav-planning`, `nav-validation`, `nav-clients`, `nav-library`, `nav-alerts`,
  `nav-help`, plus `dash-week` sur le tableau de bord (étape optionnelle, sautée
  si absente). Étapes dans `tourSteps.ts`.
- Se place sur `/app` à l'ouverture. Recalcule la position au scroll / resize.
  Clavier : `Échap` ferme, `←` / `→` naviguent.

### État & déclenchement

- `tourStore.ts` — petit magasin `useSyncExternalStore` + `localStorage`
  (`cadence.onboarding.intro.v1`, **par appareil**, pas de migration DB).
- `OnboardingHost.tsx` monté dans `AppLayout`, **rôles internes uniquement**.
  `maybeAutoStart()` montre le carrousel à la première connexion.
- Relançable depuis **Aide → « Revoir la visite guidée »**. Le carrousel propose
  ensuite « Faire le tour de l'interface ».
- Sur petit écran (barre latérale masquée), `openTour()` retombe sur le
  carrousel, autonome.

## Tests

- `tourStore.test.ts` — mémorisation, auto-start unique, abonnements, repli hors
  desktop.
- `IntroCarousel.test.tsx` — navigation, `Passer`, dernier écran → visite,
  pastilles.

## Limites connues

- « Déjà vu » est local à l'appareil : un testeur qui change de navigateur reverra
  le carrousel une fois. Acceptable pour un onboarding ; à basculer sur
  `profiles` / `org_settings` si besoin.
- La visite guidée est desktop (la barre latérale est masquée < 1024 px).
