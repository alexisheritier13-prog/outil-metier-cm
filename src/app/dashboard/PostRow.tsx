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
    <div className="bg-surface-2 hover:bg-surface-3 rounded-xl p-2.5 transition-colors">
      <div className="flex items-center gap-3">
        <Link
          to={`/app/planning?post=${post.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold"
            style={{ backgroundColor: cc.soft, color: cc.ink }}
            aria-hidden="true"
          >
            {clientInitials(clientName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate font-medium">{clientName}</span>
              <NetworkIcon network={post.network} />
            </div>
            <p className="text-muted-foreground truncate text-sm">
              {post.caption || 'Sans légende'}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-muted-foreground w-10 shrink-0 text-xs tabular-nums">
                {parisTimeLabel(post.scheduledAt)}
              </span>
              <span className="bg-surface-3 h-1.5 flex-1 overflow-hidden rounded-full">
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
          {due ? (
            <button
              type="button"
              disabled={markPending}
              onClick={onMarkPublished}
              className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium"
            >
              Publié
            </button>
          ) : (
            <StatusBadge status={post.status} />
          )}
          {author && (
            <UserAvatar
              name={author.fullName || author.email}
              avatarUrl={author.avatarUrl}
              size="sm"
              className="ring-surface-2 ring-2"
            />
          )}
        </div>
      </div>
    </div>
  );
}
