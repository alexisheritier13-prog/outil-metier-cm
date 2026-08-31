import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CalendarDays, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { POST_STATUS_ORDER } from '@/shared/constants/postStatus';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { useTrashPost } from './usePosts';

type SortKey = 'date' | 'client' | 'status';
const ROW_H = 48;
const COLS =
  'grid-cols-[2.5rem_10.5rem_minmax(8rem,1fr)_4rem_minmax(0,2fr)_10.5rem_2.75rem]';

interface Props {
  posts: Post[];
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  hasClients: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: (ids: string[], select: boolean) => void;
}

export function PostsTable({
  posts,
  clientName,
  onOpen,
  hasClients,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: Props) {
  const trash = useTrashPost();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'date',
    dir: 'asc',
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...posts].sort((a, b) => {
      if (sort.key === 'date')
        return (new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()) * dir;
      if (sort.key === 'client') return clientName(a.clientId).localeCompare(clientName(b.clientId)) * dir;
      return (POST_STATUS_ORDER[a.status] - POST_STATUS_ORDER[b.status]) * dir;
    });
  }, [posts, sort, clientName]);

  // Virtualisation seulement au-delà d'un seuil (les listes courtes n'en profitent pas).
  const virtualize = rows.length > 80;
  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
    enabled: virtualize,
  });
  const visible = virtualize
    ? virt.getVirtualItems().map((v) => ({ index: v.index, start: v.start }))
    : rows.map((_, index) => ({ index, start: index * ROW_H }));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Aucun post"
        description={
          hasClients
            ? 'Créez le premier post pour commencer à planifier.'
            : "Créez d'abord un client, puis planifiez son premier post."
        }
      />
    );
  }

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  const selectable = Boolean(selectedIds && onToggleSelect);
  const allChecked = selectable && rows.length > 0 && rows.every((p) => selectedIds!.has(p.id));

  return (
    <div className="overflow-hidden rounded-md border">
      <div
        className={`bg-surface-2 text-muted-foreground sticky top-0 z-10 grid ${COLS} items-center border-b text-xs font-medium uppercase tracking-wide`}
      >
        <span className="grid place-items-center">
          {selectable && (
            <input
              type="checkbox"
              className="accent-primary h-3.5 w-3.5"
              checked={allChecked}
              aria-label="Tout sélectionner"
              onChange={(e) => onToggleAll?.(rows.map((p) => p.id), e.target.checked)}
            />
          )}
        </span>
        <SortHead label="Date" k="date" sort={sort} onClick={toggle} />
        <SortHead label="Client" k="client" sort={sort} onClick={toggle} />
        <span className="px-3 py-2.5">Réseau</span>
        <span className="px-3 py-2.5">Légende</span>
        <SortHead label="Statut" k="status" sort={sort} onClick={toggle} />
        <span />
      </div>
      <div ref={scrollRef} className="max-h-[calc(100dvh-16rem)] overflow-auto">
        <div
          style={{
            height: virtualize ? virt.getTotalSize() : rows.length * ROW_H,
            position: 'relative',
          }}
        >
          {visible.map((v) => {
            const p = rows[v.index]!;
            const checked = selectable && selectedIds!.has(p.id);
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                aria-label={`Ouvrir le post ${p.caption || 'sans légende'}`}
                data-selected={checked || undefined}
                className={`hover:bg-surface-2/60 data-[selected]:bg-primary-surface/60 absolute inset-x-0 grid cursor-pointer ${COLS} items-center border-b text-sm last:border-b-0`}
                style={{ height: ROW_H, top: 0, transform: `translateY(${v.start}px)` }}
                onClick={() => onOpen(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(p);
                  }
                }}
              >
                <span className="grid place-items-center">
                  {selectable && (
                    <input
                      type="checkbox"
                      className="accent-primary h-3.5 w-3.5"
                      checked={checked}
                      aria-label={`Sélectionner le post ${p.caption || 'sans légende'}`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggleSelect!(p.id)}
                    />
                  )}
                </span>
                <span className="text-muted-foreground truncate px-3 text-[13px] tabular-nums">
                  {parisDateLabel(p.scheduledAt)}
                  <span className="text-muted-foreground/70"> · {parisTimeLabel(p.scheduledAt)}</span>
                </span>
                <span className="truncate px-3 font-medium">{clientName(p.clientId)}</span>
                <span className="px-3">
                  <NetworkIcon network={p.network} />
                </span>
                <span className="text-muted-foreground truncate px-3">
                  {p.caption || <span className="italic">Sans légende</span>}
                </span>
                <span className="px-3">
                  <StatusBadge status={p.status} />
                </span>
                <span className="pr-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-danger-surface hover:text-danger-strong h-8 w-8"
                    aria-label="Mettre à la corbeille"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Mettre ce post à la corbeille ?')) trash.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SortHead({
  label,
  k,
  sort,
  onClick,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  onClick: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <button
      type="button"
      onClick={() => onClick(k)}
      className={cn(
        'hover:text-foreground flex items-center gap-1 px-3 py-2.5 text-left',
        active && 'text-foreground',
      )}
    >
      {label}
      {active &&
        (sort.dir === 'asc' ? (
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        ))}
    </button>
  );
}
