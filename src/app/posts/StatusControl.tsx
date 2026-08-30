import { POST_STATUS_LABELS, type PostStatus } from '@/shared/constants/postStatus';
import type { Role } from '@/shared/constants/roles';
import { allowedTransitions, transitionNeedsComment } from '@/shared/utils/transitions';
import { StatusBadge } from '@/components/StatusBadge';
import { useChangePostStatus } from './usePosts';

/**
 * Statut d'un post + transitions permises pour le rôle courant.
 * Version compacte (select) pour la vue liste ; l'Epic 4 ajoutera la barre d'actions
 * dans le panneau de détail.
 */
export function StatusControl({
  postId,
  status,
  role,
}: {
  postId: string;
  status: PostStatus;
  role: Role;
}) {
  const change = useChangePostStatus();
  const next = allowedTransitions(status, role);

  if (next.length === 0) {
    return <StatusBadge status={status} />;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <StatusBadge status={status} />
      <select
        className="border-input bg-background h-7 rounded border px-1.5 text-xs"
        value=""
        disabled={change.isPending}
        aria-label="Changer le statut"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const to = e.target.value as PostStatus;
          if (!to) return;
          let comment: string | undefined;
          if (transitionNeedsComment(status, to)) {
            comment = window.prompt('Un commentaire est requis pour cette action :') ?? undefined;
            if (!comment?.trim()) return;
          }
          change.mutate({ id: postId, to, comment });
        }}
      >
        <option value="">→ …</option>
        {next.map((s) => (
          <option key={s} value={s}>
            → {POST_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </span>
  );
}
