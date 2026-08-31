import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CalendarDays, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { POST_STATUS_ORDER } from '@/shared/constants/postStatus';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { useTrashPost } from './usePosts';

type SortKey = 'date' | 'client' | 'status';
const ROW_H = 44;

interface Props {
  posts: Post[];
  clientName: (id: string) => string;
  onOpen: (post: Post) => void;
  hasClients: boolean;
}

export function PostsTable({ posts, clientName, onOpen, hasClients }: Props) {
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

  return (
    <div className="rounded-md border">
      <div className="bg-surface-2 text-muted-foreground grid grid-cols-[10rem_1fr_5rem_2fr_11rem_3rem] items-center border-b text-sm">
        <SortHead label="Date" k="date" sort={sort} onClick={toggle} />
        <SortHead label="Client" k="client" sort={sort} onClick={toggle} />
        <span className="p-3 font-medium">Réseau</span>
        <span className="p-3 font-medium">Légende</span>
        <SortHead label="Statut" k="status" sort={sort} onClick={toggle} />
        <span />
      </div>
      <div ref={scrollRef} className="max-h-[65vh] overflow-auto">
        <div
          style={{
            height: virtualize ? virt.getTotalSize() : rows.length * ROW_H,
            position: 'relative',
          }}
        >
          {visible.map((v) => {
            const p = rows[v.index]!;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                aria-label={`Ouvrir le post ${p.caption || 'sans légende'}`}
                className="hover:bg-surface-2/60 focus-visible:ring-ring absolute inset-x-0 grid cursor-pointer grid-cols-[10rem_1fr_5rem_2fr_11rem_3rem] items-center border-b text-sm focus-visible:outline-none focus-visible:ring-2"
                style={{ height: ROW_H, top: 0, transform: `translateY(${v.start}px)` }}
                onClick={() => onOpen(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(p);
                  }
                }}
              >
                <span className="truncate px-3">
                  {parisDateKey(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
                </span>
                <span className="truncate px-3">{clientName(p.clientId)}</span>
                <span className="px-3">
                  <NetworkIcon network={p.network} />
                </span>
                <span className="text-muted-foreground truncate px-3">
                  {p.caption || <span className="italic">Sans légende</span>}
                </span>
                <span className="px-3">
                  <StatusBadge status={p.status} />
                </span>
                <span className="px-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-danger-surface hover:text-danger-strong"
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
      className="hover:bg-surface-2 flex items-center gap-1 p-3 text-left font-medium"
    >
      {label}
      {active &&
        (sort.dir === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        ))}
    </button>
  );
}
