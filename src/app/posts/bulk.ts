import type { Post } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';
import type { PostStatus } from '@/shared/constants/postStatus';
import {
  canTransition,
  transitionNeedsComment,
  type WorkflowOptions,
} from '@/shared/utils/transitions';

/**
 * Actions en masse (Story 9.1). Chaque action est **atomique par post** : on itère,
 * on tente, on collecte les échecs, et on produit un récapitulatif. La logique pure
 * (éligibilité, formatage du récap) vit ici ; l'exécution est dans `useBulkActions`.
 */

export type BulkActionKind = 'duplicate' | 'status' | 'trash' | 'reassign';

export interface BulkFailure {
  postId: string;
  label: string;
  reason: string;
}

export interface BulkReport {
  kind: BulkActionKind;
  succeeded: number;
  failures: BulkFailure[];
}

/** Étiquette courte et stable pour identifier un post dans le récap. */
export function postLabel(post: Post, clientName: (id: string) => string): string {
  const caption = post.caption.trim();
  const short = caption.length > 40 ? `${caption.slice(0, 40)}…` : caption;
  return `${clientName(post.clientId)} · ${short || 'sans légende'}`;
}

/**
 * Parmi `posts`, ceux dont le passage à `to` est permis pour ce rôle, et ceux qui
 * seront refusés d'emblée (transition impossible pour leur statut actuel).
 */
export function partitionByTransition(
  posts: Post[],
  to: PostStatus,
  role: Role,
  workflow?: WorkflowOptions,
): { eligible: Post[]; ineligible: Post[] } {
  const eligible: Post[] = [];
  const ineligible: Post[] = [];
  for (const p of posts) {
    if (p.status === to || !canTransition(p.status, to, role, workflow).allowed) ineligible.push(p);
    else eligible.push(p);
  }
  return { eligible, ineligible };
}

/** Au moins un des posts éligibles exige-t-il un commentaire pour aller vers `to` ? */
export function anyNeedsComment(posts: Post[], to: PostStatus): boolean {
  return posts.some((p) => transitionNeedsComment(p.status, to));
}

/** Phrase de récap : « 12 réussies, 2 refusées ». */
export function summarize(report: BulkReport): string {
  const n = report.succeeded;
  const f = report.failures.length;
  const done = `${n} réussie${n > 1 ? 's' : ''}`;
  if (f === 0) return done;
  return `${done}, ${f} refusée${f > 1 ? 's' : ''}`;
}

/** Message d'erreur lisible à partir d'une exception de mutation. */
export function failureReason(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Échec inattendu.';
}
