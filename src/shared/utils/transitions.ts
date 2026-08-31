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

/**
 * Options de circuit. Miroir des règles dynamiques SQL (`can_transition`) :
 * - `skipInternalReview` (mode « CM seul », `app_settings.workflow`) : un rôle
 *   interne envoie un brouillon directement en « à valider client ».
 * - `skipClientReview` (`clients.skip_client_review`) : ce client ne valide pas
 *   les posts — l'étape `client_review` est sautée, un rôle interne passe
 *   directement à `approved`.
 */
export interface WorkflowOptions {
  skipInternalReview?: boolean;
  skipClientReview?: boolean;
}

const INTERNAL: readonly Role[] = ['cm', 'lead', 'admin'];

/** Règles dynamiques (hors table statique) autorisées par les options de circuit. */
function dynamicRuleApplies(
  from: PostStatus,
  to: PostStatus,
  role: Role,
  opts?: WorkflowOptions,
): boolean {
  if (!INTERNAL.includes(role)) return false;
  const skipInternal = Boolean(opts?.skipInternalReview);
  const skipClient = Boolean(opts?.skipClientReview);
  // CM seul : draft → client_review (ou → approved si le client ne valide pas)
  if (skipInternal && from === 'draft' && to === 'client_review') return true;
  if (skipInternal && skipClient && from === 'draft' && to === 'approved') return true;
  // Client sans validation : (internal|client)_review → approved
  if (skipClient && to === 'approved' && (from === 'internal_review' || from === 'client_review')) {
    return true;
  }
  return false;
}

/** Statuts atteignables depuis `from` pour ce rôle. */
export function allowedTransitions(
  from: PostStatus,
  role: Role,
  opts?: WorkflowOptions,
): PostStatus[] {
  const base = POST_TRANSITIONS.filter((t) => t.from === from && t.roles.includes(role)).map(
    (t) => t.to,
  );
  for (const to of ['client_review', 'approved'] as const) {
    if (dynamicRuleApplies(from, to, role, opts) && !base.includes(to)) base.push(to);
  }
  // Quand le client ne valide pas, « à valider client » n'est jamais une cible utile.
  return opts?.skipClientReview ? base.filter((s) => s !== 'client_review') : base;
}

/** La transition `from → to` est-elle permise pour ce rôle ? */
export function canTransition(
  from: PostStatus,
  to: PostStatus,
  role: Role,
  opts?: WorkflowOptions,
): TransitionCheck {
  if (from === to) return { allowed: false, needsComment: false, reason: 'statut inchangé' };
  const rule = POST_TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (rule?.roles.includes(role)) {
    return { allowed: true, needsComment: rule.needsComment ?? false };
  }
  // La table statique ne couvre pas : la règle dynamique peut quand même autoriser.
  if (dynamicRuleApplies(from, to, role, opts)) return { allowed: true, needsComment: false };
  return {
    allowed: false,
    needsComment: false,
    reason: rule ? 'rôle non autorisé' : 'transition inexistante',
  };
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
