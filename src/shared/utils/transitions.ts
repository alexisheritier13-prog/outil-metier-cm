import type { Role } from '@/shared/constants/roles';
import { POST_STATUS_ORDER, type PostStatus } from '@/shared/constants/postStatus';

/**
 * Miroir de la table SQL `post_transitions` + fonction `can_transition`
 * (migration 0011). **La source de vérité est le SQL** ; ce module ne sert qu'à
 * griser/afficher les actions côté front. `tests/integration/transitions-parity`
 * compare les deux tables — toute modification doit être faite des deux côtés.
 *
 * Le refus d'un contact client (client_review → draft avec commentaire) n'est PAS
 * dans cette table : il passe par le RPC `reject_post` (Story 5.3).
 */

interface TransitionRule {
  from: PostStatus;
  to: PostStatus;
  roles: readonly Role[];
  needsComment?: boolean;
  needsClientContact?: boolean;
}

export const POST_TRANSITIONS: readonly TransitionRule[] = [
  { from: 'draft', to: 'internal_review', roles: ['cm', 'lead', 'admin'] },
  { from: 'internal_review', to: 'client_review', roles: ['lead', 'admin'] },
  { from: 'client_review', to: 'approved', roles: ['client'], needsClientContact: true },
  { from: 'approved', to: 'scheduled', roles: ['cm', 'lead', 'admin'] },
  { from: 'scheduled', to: 'published', roles: ['cm', 'lead', 'admin'] },
  { from: 'internal_review', to: 'draft', roles: ['lead', 'admin'], needsComment: true },
  { from: 'client_review', to: 'draft', roles: ['cm', 'lead', 'admin'] },
  { from: 'client_review', to: 'internal_review', roles: ['cm', 'lead', 'admin'] },
  { from: 'approved', to: 'draft', roles: ['lead', 'admin'] },
  { from: 'approved', to: 'internal_review', roles: ['lead', 'admin'] },
  { from: 'approved', to: 'client_review', roles: ['lead', 'admin'] },
  { from: 'scheduled', to: 'approved', roles: ['lead', 'admin'] },
  { from: 'scheduled', to: 'draft', roles: ['lead', 'admin'] },
  { from: 'published', to: 'scheduled', roles: ['lead', 'admin'] },
];

export interface TransitionCheck {
  allowed: boolean;
  needsComment: boolean;
  reason?: string;
}

/** Statuts atteignables depuis `from` pour ce rôle. */
export function allowedTransitions(from: PostStatus, role: Role): PostStatus[] {
  return POST_TRANSITIONS.filter((t) => t.from === from && t.roles.includes(role)).map((t) => t.to);
}

/** La transition `from → to` est-elle permise pour ce rôle ? */
export function canTransition(from: PostStatus, to: PostStatus, role: Role): TransitionCheck {
  if (from === to) return { allowed: false, needsComment: false, reason: 'statut inchangé' };
  const rule = POST_TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!rule) return { allowed: false, needsComment: false, reason: 'transition inexistante' };
  if (!rule.roles.includes(role)) {
    return { allowed: false, needsComment: false, reason: 'rôle non autorisé' };
  }
  return { allowed: true, needsComment: rule.needsComment ?? false };
}

export function transitionNeedsComment(from: PostStatus, to: PostStatus): boolean {
  return POST_TRANSITIONS.find((t) => t.from === from && t.to === to)?.needsComment ?? false;
}

export function transitionDirection(
  from: PostStatus,
  to: PostStatus,
): 'forward' | 'backward' | 'none' {
  if (!POST_TRANSITIONS.some((t) => t.from === from && t.to === to)) return 'none';
  return POST_STATUS_ORDER[to] > POST_STATUS_ORDER[from] ? 'forward' : 'backward';
}
