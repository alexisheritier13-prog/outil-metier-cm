import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { NetworkIcon } from '@/components/NetworkIcon';
import { UserAvatar } from '@/components/UserAvatar';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { clientColor, clientInitials } from '@/lib/clientColor';
import { STEP_BAR_COLOR, postStep } from '@/shared/constants/postStatus';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import type { Post, Profile } from '@/shared/types';

const COLS =
  'grid-cols-[26px_88px_minmax(0,1.7fr)_158px_132px_30px] ' +
  'min-[900px]:grid-cols-[26px_88px_minmax(0,1.7fr)_158px_132px_86px_30px] ' +
  'min-[1100px]:grid-cols-[26px_88px_minmax(0,1.7fr)_158px_132px_96px_86px_30px]';

const PAGE_SIZE = 30;
const WEEKDAY_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTH_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

interface Props {
  posts: Post[];
  clientName: (id: string) => string;
  authorById: Map<string, Profile>;
  onOpen: (post: Post) => void;
  hasClients: boolean;
  onResetFilters: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[], select: boolean) => void;
}

/** Vue Liste — posts groupés par jour, en tuiles (pas de tableau à filets). */
export function PostList({
  posts,
  clientName,
  authorById,
  onOpen,
  hasClients,
  onResetFilters,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: Props) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const sorted = useMemo(
    () => [...posts].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [posts],
  );
  const shown = sorted.slice(0, visible);
  const remaining = sorted.length - shown.length;

  const groups = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of shown) {
      const key = parisDateKey(p.scheduledAt);
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [shown]);

  const allChecked = sorted.length > 0 && sorted.every((p) => selectedIds.has(p.id));

  if (posts.length === 0) {
    return (
      <div className="surface-card rounded-[20px]">
        <EmptyState
          title="Aucun post ne correspond à ces filtres."
          action={
            <Button variant="outline" size="sm" onClick={onResetFilters}>
              Réinitialiser les filtres
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="surface-card flex h-full flex-col overflow-hidden rounded-[20px] p-2">
      <div className={`grid ${COLS} text-ink-faint gap-3 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.07em]`}>
        <span className="flex items-center">
          <input
            type="checkbox"
            className="accent-primary h-[17px] w-[17px] rounded-[6px]"
            checked={allChecked}
            aria-label="Tout sélectionner"
            onChange={(e) => onToggleAll(sorted.map((p) => p.id), e.target.checked)}
          />
        </span>
        <span>Heure</span>
        <span>Post</span>
        <span>Client</span>
        <span>Statut</span>
        <span className="hidden min-[1100px]:block">Étape</span>
        <span className="hidden min-[900px]:block">Équipe</span>
        <span />
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-1 pb-1">
        {groups.map(([dayKey, dayPosts]) => (
          <div key={dayKey} className="flex flex-col gap-1">
            <DayGroupHeader dayKey={dayKey} posts={dayPosts} />
            {dayPosts.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                clientName={clientName(p.clientId)}
                author={authorById.get(p.authorId)}
                onOpen={() => onOpen(p)}
                checked={selectedIds.has(p.id)}
                onToggleSelect={() => onToggleSelect(p.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="bg-surface-2 mx-1 mb-1 flex h-10 shrink-0 items-center justify-center rounded-[14px] text-sm font-semibold"
        >
          Afficher {Math.min(remaining, PAGE_SIZE)} posts de plus
        </button>
      )}

      {!hasClients && (
        <p className="text-muted-foreground px-3 py-2 text-xs">
          Créez d'abord un client pour planifier un post.
        </p>
      )}
    </div>
  );
}

function DayGroupHeader({ dayKey, posts }: { dayKey: string; posts: Post[] }) {
  const [y, m, d] = dayKey.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAY_LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const label = `${weekday} ${d} ${MONTH_LONG[m - 1]}`;

  // Alerte « en attente client depuis n j » : calculée depuis `statusChangedAt`
  // du post client_review le plus ancien du groupe — jamais une valeur inventée.
  const oldestClientReview = posts
    .filter((p) => p.status === 'client_review')
    .sort((a, b) => a.statusChangedAt.localeCompare(b.statusChangedAt))[0];
  const waitingDays = oldestClientReview
    ? Math.floor((Date.now() - new Date(oldestClientReview.statusChangedAt).getTime()) / 86_400_000)
    : 0;

  return (
    <div className="bg-surface-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2">
      <span className="text-[12.5px] font-extrabold capitalize">{label}</span>
      <span className="text-[11.5px] font-bold" style={{ color: 'oklch(0.58 0.02 265)' }}>
        {posts.length} post{posts.length > 1 ? 's' : ''}
      </span>
      {oldestClientReview && waitingDays >= 1 && (
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: 'oklch(0.95 0.04 27)', color: 'oklch(0.5 0.16 27)' }}
        >
          en attente client depuis {waitingDays} j
        </span>
      )}
    </div>
  );
}

function PostRow({
  post,
  clientName,
  author,
  onOpen,
  checked,
  onToggleSelect,
}: {
  post: Post;
  clientName: string;
  author?: Profile;
  onOpen: () => void;
  checked: boolean;
  onToggleSelect: () => void;
}) {
  const cc = clientColor(post.clientId);
  const step = postStep(post.status);

  return (
    <div
      className={`hover:bg-surface-2 relative grid ${COLS} items-center gap-3 rounded-[14px] px-3 py-[11px] text-sm`}
    >
      <button
        type="button"
        className="focus-visible:ring-ring absolute inset-0 z-0 rounded-[14px] focus-visible:ring-2 focus-visible:ring-inset"
        aria-label={`Ouvrir le post ${post.caption || 'sans légende'}`}
        onClick={onOpen}
      />
      <span className="relative z-10">
        <input
          type="checkbox"
          className="accent-primary h-[17px] w-[17px] rounded-[6px]"
          checked={checked}
          aria-label={`Sélectionner le post ${post.caption || 'sans légende'}`}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      </span>
      <span className="pointer-events-none text-[12.5px] font-[750] tabular-nums">
        {parisTimeLabel(post.scheduledAt)}
      </span>
      <span className="pointer-events-none min-w-0">
        <span className="block truncate text-[13.5px] font-[750]">
          {post.caption || <span className="italic">Sans légende</span>}
        </span>
        {post.performanceNote && (
          <span className="block truncate text-xs" style={{ color: 'oklch(0.58 0.02 265)' }}>
            {post.performanceNote}
          </span>
        )}
      </span>
      <span className="pointer-events-none flex min-w-0 items-center gap-2">
        <span
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: cc.color }}
          aria-hidden="true"
        >
          {clientInitials(clientName)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-bold">{clientName}</span>
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold">
            <NetworkIcon network={post.network} />
          </span>
        </span>
      </span>
      <span className="pointer-events-none">
        <StatusBadge status={post.status} />
      </span>
      <span className="pointer-events-none hidden items-center gap-1.5 min-[1100px]:flex">
        <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[oklch(0.94_0.006_265)]">
          <span
            className="block h-full rounded-full"
            style={{ width: `${(step / 5) * 100}%`, backgroundColor: STEP_BAR_COLOR[post.status] }}
          />
        </span>
        <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">{step}/5</span>
      </span>
      <span className="pointer-events-none hidden min-[900px]:block">
        {author && (
          <UserAvatar name={author.fullName || author.email} avatarUrl={author.avatarUrl} size="sm" />
        )}
      </span>
      <span className="pointer-events-none flex justify-end" style={{ color: 'oklch(0.7 0.02 265)' }}>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
  );
}
