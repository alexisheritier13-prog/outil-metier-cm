import { useMemo, useState } from 'react';
import { POST_STATUSES, POST_STATUS_LABELS, type PostStatus } from '@/shared/constants/postStatus';
import type { Role } from '@/shared/constants/roles';
import { canTransition, transitionNeedsComment } from '@/shared/utils/transitions';
import { NetworkIcon } from '@/components/NetworkIcon';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import { cn } from '@/lib/utils';
import type { Post } from '@/shared/types';
import { useChangePostStatus } from './usePosts';
import { useClientSkipReview, useWorkflowOptions } from './useWorkflow';

interface Props {
  posts: Post[];
  role: Role;
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function KanbanView({ posts, role, clientName, onOpen, selectedIds, onToggleSelect }: Props) {
  const change = useChangePostStatus();
  const globalWorkflow = useWorkflowOptions();
  const skipReview = useClientSkipReview();
  const wf = (p: Post) => ({ ...globalWorkflow, skipClientReview: skipReview(p.clientId) });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<PostStatus | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<PostStatus, Post[]>(POST_STATUSES.map((s) => [s, []]));
    for (const p of posts) map.get(p.status)?.push(p);
    return map;
  }, [posts]);

  const dragged = posts.find((p) => p.id === dragId) ?? null;
  const selectable = Boolean(selectedIds && onToggleSelect);

  function drop(to: PostStatus) {
    setOverCol(null);
    const post = dragged;
    setDragId(null);
    if (!post || post.status === to) return;
    if (!canTransition(post.status, to, role, wf(post)).allowed) return;
    let comment: string | undefined;
    if (transitionNeedsComment(post.status, to)) {
      comment = window.prompt('Un commentaire est requis pour cette action :') ?? undefined;
      if (!comment?.trim()) return;
    }
    change.mutate({ id: post.id, to, comment });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {POST_STATUSES.map((status) => {
        const items = byStatus.get(status) ?? [];
        const droppable =
          dragged !== null &&
          dragged.status !== status &&
          canTransition(dragged.status, status, role, wf(dragged)).allowed;
        return (
          <div
            key={status}
            className={cn(
              'bg-surface-2 flex w-72 shrink-0 flex-col rounded-xl border',
              overCol === status && droppable && 'ring-foreground ring-2',
            )}
            onDragOver={(e) => {
              if (droppable) {
                e.preventDefault();
                setOverCol(status);
              }
            }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={() => drop(status)}
          >
            <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
              {POST_STATUS_LABELS[status]}
              <span className="text-muted-foreground text-xs">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {items.map((p) => {
                const checked = selectable && selectedIds!.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'bg-surface hover:border-foreground/40 relative rounded border text-xs',
                      checked && 'border-primary ring-primary/30 ring-1',
                    )}
                  >
                    {selectable && (
                      <input
                        type="checkbox"
                        className="accent-primary absolute right-1.5 top-1.5 z-10 h-3.5 w-3.5"
                        checked={checked}
                        aria-label={`Sélectionner le post ${p.caption || 'sans légende'}`}
                        onChange={() => onToggleSelect!(p.id)}
                      />
                    )}
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onClick={() => onOpen(p)}
                      className="block w-full cursor-grab p-2 pr-6 text-left active:cursor-grabbing"
                    >
                      <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                        <NetworkIcon network={p.network} />
                        <span>
                          {parisDateLabel(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
                        </span>
                      </div>
                      <div className="font-medium">{clientName(p.clientId)}</div>
                      <div className="text-muted-foreground line-clamp-2">
                        {p.caption || 'Sans légende'}
                      </div>
                    </button>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-muted-foreground px-1 py-2 text-xs">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
