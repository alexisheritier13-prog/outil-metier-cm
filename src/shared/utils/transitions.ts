import type { Role } from '@/shared/constants/roles';
import { POST_STATUS_ORDER, type PostStatus } from '@/shared/constants/postStatus';

/**
 * Machine à états des transitions de statut d'un post.
 *
 * ⚠️ La **source de vérité** est la fonction SQL `can_transition` (migration Epic 3).
 * Ce module en est le **miroir** côté front, pour n'afficher que les actions permises.
 * Un test compare les deux tables dès que la version SQL existe
 * (`tests/rls/rpc/` + `src/shared/utils/transitions.test.ts`).
 */

export interface TransitionContext {
  /** Rôle de l'utilisateur qui tente la transition. */
  role: Role;
  /** L'utilisateur est-il le rédacteur (`author_id`) du post ? */
  isAuthor: boolean;
  /** L'utilisateur est-il un contact actif du client propriétaire du post ? */
  isOwnClientContact: boolean;
}

interface TransitionRule {
  from: PostStatus;
  to: PostStatus;
  /** Rôles autorisés (avant application des contraintes `requires*`). */
  roles: readonly Role[];
  /** Nécessite que `isAuthor` soit vrai (en plus du rôle). */
  requiresAuthor?: boolean;
  /** Nécessite que `isOwnClientContact` soit vrai. */
  requiresClientContact?: boolean;
  /** Un commentaire est obligatoire pour cette transition. */
  requiresComment?: boolean;
}

const RULES: readonly TransitionRule[] = [
  // — Avancées —
  { from: 'draft', to: 'internal_review', roles: ['cm', 'lead', 'admin'] },
  { from: 'internal_review', to: 'client_review', roles: ['lead', 'admin'] },
  {
    from: 'client_review',
    to: 'approved',
    roles: ['client'],
    requiresClientContact: true,
  },
  { from: 'approved', to: 'scheduled', roles: ['cm', 'lead', 'admin'] },
  { from: 'scheduled', to: 'published', roles: ['cm', 'lead', 'admin'] },

  // — Retours en arrière (relecture / refus) —
  {
    from: 'internal_review',
    to: 'draft',
    roles: ['lead', 'admin'],
    requiresComment: true,
  },
  {
    from: 'client_review',
    to: 'draft',
    roles: ['client'],
    requiresClientContact: true,
    requiresComment: true,
  },
  {
    from: 'client_review',
    to: 'internal_review',
    roles: ['cm', 'lead', 'admin'],
  },
  {
    from: 'client_review',
    to: 'draft',
    roles: ['cm', 'lead', 'admin'],
  },

  // — Corrections tardives, réservées lead/admin —
  { from: 'approved', to: 'draft', roles: ['lead', 'admin'] },
  { from: 'approved', to: 'internal_review', roles: ['lead', 'admin'] },
  { from: 'approved', to: 'client_review', roles: ['lead', 'admin'] },
  { from: 'scheduled', to: 'approved', roles: ['lead', 'admin'] },
  { from: 'scheduled', to: 'draft', roles: ['lead', 'admin'] },
  { from: 'published', to: 'scheduled', roles: ['lead', 'admin'] },
];

export interface TransitionCheck {
  allowed: boolean;
  /** Renseigné quand `allowed` est vrai et qu'un commentaire est requis. */
  requiresComment: boolean;
  /** Renseigné quand `allowed` est faux : raison courte (usage debug / message). */
  reason?: string;
}

/** Toutes les transitions sortantes possibles depuis `from` pour ce contexte. */
export function allowedTransitions(from: PostStatus, ctx: TransitionContext): PostStatus[] {
  return RULES.filter((r) => r.from === from && matchesContext(r, ctx)).map((r) => r.to);
}

/** Une transition `from → to` est-elle permise pour ce contexte ? */
export function canTransition(
  from: PostStatus,
  to: PostStatus,
  ctx: TransitionContext,
): TransitionCheck {
  if (from === to) return { allowed: false, requiresComment: false, reason: 'même statut' };

  const rule = RULES.find((r) => r.from === from && r.to === to);
  if (!rule) return { allowed: false, requiresComment: false, reason: 'transition inexistante' };

  if (!rule.roles.includes(ctx.role)) {
    return { allowed: false, requiresComment: false, reason: 'rôle non autorisé' };
  }
  if (rule.requiresAuthor && !ctx.isAuthor) {
    return { allowed: false, requiresComment: false, reason: 'réservé au rédacteur' };
  }
  if (rule.requiresClientContact && !ctx.isOwnClientContact) {
    return { allowed: false, requiresComment: false, reason: 'réservé au contact du client' };
  }

  return { allowed: true, requiresComment: rule.requiresComment ?? false };
}

/** Direction d'une transition existante (indépendamment des droits). */
export function transitionDirection(from: PostStatus, to: PostStatus): 'forward' | 'backward' | 'none' {
  if (!RULES.some((r) => r.from === from && r.to === to)) return 'none';
  return POST_STATUS_ORDER[to] > POST_STATUS_ORDER[from] ? 'forward' : 'backward';
}

function matchesContext(rule: TransitionRule, ctx: TransitionContext): boolean {
  if (!rule.roles.includes(ctx.role)) return false;
  if (rule.requiresAuthor && !ctx.isAuthor) return false;
  if (rule.requiresClientContact && !ctx.isOwnClientContact) return false;
  return true;
}
