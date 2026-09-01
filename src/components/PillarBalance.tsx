import { cn } from '@/lib/utils';
import type { ClientPillar } from '@/shared/types';
import { pillarBalance } from '@/app/posts/pillarBalance';

interface Props {
  pillars: ClientPillar[];
  posts: { pillarId: string | null }[];
  className?: string;
}

/** Jauge d'équilibre éditorial : part réelle par rubrique vs cible. */
export function PillarBalance({ pillars, posts, className }: Props) {
  if (pillars.length === 0) return null;
  const stats = pillarBalance(pillars, posts);
  const total = posts.length;

  return (
    <div className={cn('space-y-2.5', className)}>
      <p className="text-muted-foreground text-xs">
        {total} post{total > 1 ? 's' : ''} sur la période
      </p>
      {stats.map((s) => {
        const off =
          s.targetPct !== null && Math.abs(s.actualPct - s.targetPct) > 12
            ? s.actualPct > s.targetPct
              ? 'over'
              : 'under'
            : null;
        return (
          <div key={s.id ?? 'none'} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{s.label}</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {s.actualPct}%
                {s.targetPct !== null && (
                  <span className={cn(off === 'over' && 'text-warning-strong', off === 'under' && 'text-info-strong')}>
                    {' '}
                    / cible {s.targetPct}%
                  </span>
                )}
              </span>
            </div>
            <div className="bg-surface-2 relative h-2 overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full rounded-full',
                  off === 'over'
                    ? 'bg-warning'
                    : off === 'under'
                      ? 'bg-info'
                      : s.id === null
                        ? 'bg-border-strong'
                        : 'bg-primary',
                )}
                style={{ width: `${Math.min(s.actualPct, 100)}%` }}
              />
              {s.targetPct !== null && (
                <span
                  className="bg-foreground/50 absolute inset-y-0 w-0.5"
                  style={{ left: `${Math.min(s.targetPct, 100)}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
