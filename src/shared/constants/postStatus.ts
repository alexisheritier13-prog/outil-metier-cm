/**
 * Pipeline de statuts d'un post. Doit rester aligné avec l'enum SQL `post_status_t`
 * et avec la table de transitions de `can_transition` (SQL = source de vérité ; ici =
 * miroir pour l'UI). Voir `src/shared/utils/transitions.ts`.
 */
export const POST_STATUSES = [
  'draft',
  'internal_review',
  'client_review',
  'approved',
  'scheduled',
  'published',
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Brouillon',
  internal_review: 'À valider (interne)',
  client_review: 'À valider (client)',
  approved: 'Validé',
  scheduled: 'Planifié',
  published: 'Publié',
};

/**
 * Ton sémantique par statut (passe couleur). `soft` = fond teinté + texte foncé de la
 * même teinte ; `solid` = aplat + texte clair ; `neutral` = monochrome (contour).
 */
export type StatusTone =
  | { kind: 'neutral'; fill: 'outline' | 'solid' }
  | { kind: 'info' | 'warning' | 'success'; fill: 'soft' | 'solid' };

export const POST_STATUS_TONE: Record<PostStatus, StatusTone> = {
  draft: { kind: 'neutral', fill: 'outline' },
  internal_review: { kind: 'info', fill: 'soft' },
  client_review: { kind: 'warning', fill: 'soft' },
  approved: { kind: 'success', fill: 'soft' },
  scheduled: { kind: 'success', fill: 'solid' },
  published: { kind: 'neutral', fill: 'solid' },
};

/** Ordre nominal dans le pipeline (utilisé pour le tri et l'affichage kanban). */
export const POST_STATUS_ORDER: Record<PostStatus, number> = {
  draft: 0,
  internal_review: 1,
  client_review: 2,
  approved: 3,
  scheduled: 4,
  published: 5,
};

/** Statuts exposés au contact client (les autres restent internes). */
export const CLIENT_VISIBLE_STATUSES = [
  'client_review',
  'approved',
  'scheduled',
  'published',
] as const satisfies readonly PostStatus[];

export function isPostStatus(value: string): value is PostStatus {
  return (POST_STATUSES as readonly string[]).includes(value);
}
