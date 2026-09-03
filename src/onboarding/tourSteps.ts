export interface TourStep {
  /** Sélecteur CSS de la cible (attribut `data-tour`). */
  selector: string;
  title: string;
  body: string;
  /** Côté préféré pour la bulle. Repli automatique si ça déborde. */
  placement: 'right' | 'bottom' | 'left';
  /** Si la cible est absente (écran, rôle), l'étape est sautée sans bruit. */
  optional?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="nav-planning"]',
    title: 'Planning',
    body: 'Le calendrier éditorial : tous les posts de tous vos clients sur le mois. Cliquez une case pour créer, glissez un post pour le replanifier.',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-validation"]',
    title: 'Validation',
    body: 'La file des posts à relire en interne, et les demandes de modification envoyées par vos clients depuis leur espace.',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-clients"]',
    title: 'Clients',
    body: 'Une fiche par client : contrat, charte graphique, codes d’accès aux réseaux, et surtout l’onglet Accès qui ouvre l’espace client (le portail).',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-library"]',
    title: 'Bibliothèque',
    body: 'Idées non datées, templates réutilisables, marronniers du calendrier et campagnes. La matière première de vos posts.',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-alerts"]',
    title: 'Alertes',
    body: 'Ce qui dérape : posts en retard, trous dans le planning, validations qui traînent. Regroupées par situation.',
    placement: 'right',
  },
  {
    selector: '[data-tour="dash-week"]',
    title: 'Votre semaine',
    body: 'Depuis l’accueil, les 7 prochains jours en un coup d’œil, et vous marquez un post « publié » sans quitter la page.',
    placement: 'left',
    optional: true,
  },
  {
    selector: '[data-tour="nav-help"]',
    title: 'Aide',
    body: 'Le mode d’emploi complet, par sujet. Vous pourrez relancer cette visite ou revoir la présentation ici quand vous voulez.',
    placement: 'right',
  },
];
