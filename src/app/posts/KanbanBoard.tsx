import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { NETWORK_BRAND } from '@/components/networkBrand';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { UserAvatar } from '@/components/UserAvatar';
import {
  POST_STATUSES,
  POST_STATUS_LABELS,
  STEP_BAR_COLOR,
  type PostStatus,
} from '@/shared/constants/postStatus';
import type { Role } from '@/shared/constants/roles';
import { canTransition, transitionNeedsComment } from '@/shared/utils/transitions';
import { clientColor, clientInitials } from '@/lib/clientColor';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import type { Post, Profile } from '@/shared/types';
import { useChangePostStatus } from './usePosts';
import { useClientSkipReview, useWorkflowOptions } from './useWorkflow';

interface Props {
  posts: Post[];
  role: Role;
  clientName: (id: string) => string;
  authorById: Map<string, Profile>;
  onOpen: (post: Post) => void;
  onCreateDraft?: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

/**
 * Vue Kanban — une colonne par statut. Garde les 6 statuts existants (la
 * maquette n'en montre que 5, sans « Publié » : masquer cette colonne ferait
 * disparaître les posts déjà publiés de la vue, jamais demandé explicitement).
 */
export function KanbanBoard({
  posts,
  role,
  clientName,
  authorById,
  onOpen,
  onCreateDraft,
  selectedIds,
  onToggleSelect,
}: Props) {
  const change = useChangePostStatus();
  const globalWorkflow = useWorkflowOptions();
  const skipReview = useClientSkipReview();
  const wf = (p: Post) => ({ ...globalWorkflow, skipClientReview: skipReview(p.clientId) });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<PostStatus | null>(null);
  const selectable = Boolean(selectedIds && onToggleSelect);

  const byStatus = useMemo(() => {
    const map = new Map<PostStatus, Post[]>(POST_STATUSES.map((s) => [s, []]));
    for (const p of posts) map.get(p.status)?.push(p);
    return map;
  }, [posts]);

  const dragged = posts.find((p) => p.id === dragId) ?? null;

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
    <div className="h-full overflow-x-auto">
      <div
        className="grid h-full items-start gap-3"
        style={{ gridTemplateColumns: `repeat(${POST_STATUSES.length}, minmax(260px, 1fr))` }}
      >
        {POST_STATUSES.map((status) => {
          const items = byStatus.get(status) ?? [];
          const droppable =
            dragged !== null &&
            dragged.status !== status &&
            canTransition(dragged.status, status, role, wf(dragged)).allowed;
          return (
            <div
              key={status}
              className="flex max-h-full flex-col gap-[9px] rounded-[20px] p-[11px]"
              style={{
                background: 'oklch(0.968 0.006 265)',
                outline: overCol === status && droppable ? '2px solid var(--foreground)' : undefined,
                outlineOffset: '-2px',
              }}
              onDragOver={(e) => {
                if (droppable) {
                  e.preventDefault();
                  setOverCol(status);
                }
              }}
              onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
              onDrop={() => drop(status)}
            >
              <div className="flex items-center gap-1.5 px-0.5">
                <span
                  className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
                  style={{ backgroundColor: STEP_BAR_COLOR[status] }}
                  aria-hidden="true"
                />
                <span className="truncate text-[12.5px] font-extrabold">
                  {POST_STATUS_LABELS[status]}
                </span>
                <span className="bg-surface rounded-full px-1.5 py-px text-[11px] font-extrabold tabular-nums">
                  {items.length}
                </span>
                {status === 'draft' && onCreateDraft && (
                  <button
                    type="button"
                    onClick={onCreateDraft}
                    aria-label="Créer un post en brouillon"
                    className="hover:bg-surface ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-[9px] overflow-y-auto">
                {items.map((p) => (
                  <KanbanCard
                    key={p.id}
                    post={p}
                    clientName={clientName(p.clientId)}
                    author={authorById.get(p.authorId)}
                    onOpen={() => onOpen(p)}
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    checked={selectable && selectedIds!.has(p.id)}
                    onToggleSelect={selectable ? () => onToggleSelect!(p.id) : undefined}
                  />
                ))}
                {items.length === 0 && (
                  <p className="text-muted-foreground px-1 py-2 text-xs">—</p>
                )}
              </div>

              {status === 'draft' && onCreateDraft && (
                <button
                  type="button"
                  onClick={onCreateDraft}
                  className="hover:bg-surface flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-[13px] text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  post,
  clientName,
  author,
  onOpen,
  onDragStart,
  onDragEnd,
  checked,
  onToggleSelect,
}: {
  post: Post;
  clientName: string;
  author?: Profile;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  checked?: boolean;
  onToggleSelect?: () => void;
}) {
  const cc = clientColor(post.clientId);
  const brand = NETWORK_BRAND[post.network];

  return (
    <div
      className="bg-surface relative rounded-2xl p-3"
      style={{
        boxShadow: `0 1px 3px oklch(0.3 0.03 265 / 0.06), inset 3px 0 0 ${STEP_BAR_COLOR[post.status]}`,
      }}
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          className="accent-primary absolute right-2 top-2 z-10 h-3.5 w-3.5"
          checked={checked}
          aria-label={`Sélectionner le post ${post.caption || 'sans légende'}`}
          onChange={onToggleSelect}
        />
      )}
      <button
        type="button"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        className="flex w-full cursor-grab flex-col gap-[7px] text-left active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 pr-4">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[9px] font-extrabold text-white"
            style={{ backgroundColor: cc.color }}
            aria-hidden="true"
          >
            {clientInitials(clientName)}
          </span>
          <span className="truncate text-[11.5px] font-[750]">{clientName}</span>
          <span className="bg-surface-2 ml-auto flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill={brand.hex} aria-hidden="true">
              <path d={brand.path} />
            </svg>
            <span className="sr-only">{NETWORK_LABELS[post.network]}</span>
          </span>
        </div>

        <p className="text-[13px] font-[750] leading-[1.3]">{post.caption || 'Sans légende'}</p>

        {post.performanceNote && (
          <p className="line-clamp-2 text-xs" style={{ color: 'oklch(0.58 0.02 265)' }}>
            {post.performanceNote}
          </p>
        )}

        <div className="flex items-center gap-1.5">
          <span className="bg-surface-2 rounded-md px-1.5 py-0.5 text-[11px] font-bold">
            {parisDateLabel(post.scheduledAt, { year: false })} · {parisTimeLabel(post.scheduledAt)}
          </span>
          {author && (
            <UserAvatar
              name={author.fullName || author.email}
              avatarUrl={author.avatarUrl}
              size="sm"
              className="ml-auto h-6 w-6"
            />
          )}
        </div>
      </button>
    </div>
  );
}
