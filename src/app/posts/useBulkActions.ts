import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  changePostStatus,
  duplicatePost,
  reassignPost,
  trashPost,
} from '@/services/posts';
import type { Post } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';
import type { PostStatus } from '@/shared/constants/postStatus';
import { transitionNeedsComment } from '@/shared/utils/transitions';
import {
  failureReason,
  partitionByTransition,
  postLabel,
  type BulkActionKind,
  type BulkFailure,
  type BulkReport,
} from './bulk';
import { useWorkflowOptions } from './useWorkflow';

interface RunContext {
  posts: Post[];
  clientName: (id: string) => string;
  role: Role;
}

/**
 * Exécute les actions en masse (Story 9.1). Chaque post est traité indépendamment ;
 * un échec n'interrompt pas la boucle. Renvoie un `BulkReport` pour le récapitulatif.
 */
export function useBulkActions({ posts, clientName, role }: RunContext) {
  const qc = useQueryClient();
  const workflow = useWorkflowOptions();
  const [running, setRunning] = useState<BulkActionKind | null>(null);
  const [report, setReport] = useState<BulkReport | null>(null);

  async function forEach(
    kind: BulkActionKind,
    targets: Post[],
    seed: BulkFailure[],
    fn: (post: Post) => Promise<unknown>,
  ): Promise<BulkReport> {
    setRunning(kind);
    const failures = [...seed];
    let succeeded = 0;
    for (const post of targets) {
      try {
        await fn(post);
        succeeded += 1;
      } catch (error) {
        failures.push({
          postId: post.id,
          label: postLabel(post, clientName),
          reason: failureReason(error),
        });
      }
    }
    await qc.invalidateQueries({ queryKey: ['posts'] });
    await qc.invalidateQueries({ queryKey: ['review-queue'] });
    const result: BulkReport = { kind, succeeded, failures };
    setRunning(null);
    setReport(result);
    return result;
  }

  return {
    running,
    report,
    dismissReport: () => setReport(null),

    duplicate: (ids: string[]) => {
      const targets = posts.filter((p) => ids.includes(p.id));
      return forEach('duplicate', targets, [], (p) => duplicatePost(p.id));
    },

    trash: (ids: string[]) => {
      const targets = posts.filter((p) => ids.includes(p.id));
      return forEach('trash', targets, [], (p) => trashPost(p.id));
    },

    reassign: (ids: string[], authorId: string) => {
      const targets = posts.filter((p) => ids.includes(p.id));
      return forEach('reassign', targets, [], (p) => reassignPost(p.id, authorId));
    },

    changeStatus: (ids: string[], to: PostStatus, comment?: string) => {
      const selected = posts.filter((p) => ids.includes(p.id));
      const { eligible, ineligible } = partitionByTransition(selected, to, role, workflow);
      const seed: BulkFailure[] = ineligible.map((p) => ({
        postId: p.id,
        label: postLabel(p, clientName),
        reason: `transition « ${p.status} → ${to} » non permise`,
      }));
      return forEach('status', eligible, seed, (p) =>
        changePostStatus(p.id, to, transitionNeedsComment(p.status, to) ? comment : undefined),
      );
    },
  };
}
