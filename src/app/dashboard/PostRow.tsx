import { Link } from 'react-router-dom';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { UserAvatar } from '@/components/UserAvatar';
import { clientColor, clientInitials } from '@/lib/clientColor';
import { parisTimeLabel } from '@/shared/utils/tz';
import type { Post, Profile } from '@/shared/types';
import { postStep, STEP_BAR_COLOR } from './dashboardMetrics';

/** Ligne d'un post dans « Cette semaine » : client coloré, statut, étape du circuit. */
export function PostRow({
  post,
  clientName,
  author,
  due,
  markPending,
  onMarkPublished,
}: {
  post: Post;
  clientName: string;
  author?: Profile;
  due: boolean;
  markPending?: boolean;
  onMarkPublished: () => void;
}) {
  const cc = clientColor(post.clientId);
  const step = postStep(post.status);

  return (
    <div className="bg-surface-sunk flex items-center gap-[13px] rounded-2xl p-[13px_14px]">
      <Link to={`/app/planning?post=${post.id}`} className="flex min-w-0 flex-1 items-center gap-[13px]">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] text-[12.5px] font-extrabold"
          style={{ backgroundColor: cc.soft, color: cc.ink }}
          aria-hidden="true"
        >
          {clientInitials(clientName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="truncate text-[13px] font-[750]">{clientName}</span>
            <span className="bg-surface flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold">
              <NetworkIcon network={post.network} />
            </span>
            {!due && <StatusBadge status={post.status} />}
          </div>
          <p className="truncate text-[13px]" style={{ color: 'oklch(0.45 0.02 265)' }}>
            {post.caption || 'Sans légende'}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-muted-foreground w-10 shrink-0 text-xs tabular-nums">
              {parisTimeLabel(post.scheduledAt)}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[oklch(0.94_0.006_265)]">
              <span
                className="block h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${(step / 5) * 100}%`, backgroundColor: STEP_BAR_COLOR[post.status] }}
              />
            </span>
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">{step}/5</span>
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {due && (
          <button
            type="button"
            disabled={markPending}
            onClick={onMarkPublished}
            className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium"
          >
            Publié
          </button>
        )}
        {author && (
          <UserAvatar
            name={author.fullName || author.email}
            avatarUrl={author.avatarUrl}
            size="sm"
            className="ring-surface ring-2"
          />
        )}
      </div>
    </div>
  );
}
