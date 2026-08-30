import {
  CircleDashed,
  Eye,
  Send,
  CheckCircle2,
  CalendarClock,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import { POST_STATUS_LABELS, type PostStatus } from '@/shared/constants/postStatus';
import { cn } from '@/lib/utils';

const ICONS: Record<PostStatus, LucideIcon> = {
  draft: CircleDashed,
  internal_review: Eye,
  client_review: Send,
  approved: CheckCircle2,
  scheduled: CalendarClock,
  published: CheckCheck,
};

/**
 * Statut d'un post : toujours icône + libellé (jamais la couleur seule).
 * Palette monochrome pour l'instant — la différenciation passe par le remplissage
 * (plein = terminé/validé, contour = en cours) et l'icône.
 */
export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  const Icon = ICONS[status];
  const filled = status === 'approved' || status === 'scheduled' || status === 'published';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium',
        filled
          ? 'bg-foreground text-background border-transparent'
          : 'bg-surface-2 text-foreground',
        status === 'published' && 'opacity-70',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
      {POST_STATUS_LABELS[status]}
    </span>
  );
}
