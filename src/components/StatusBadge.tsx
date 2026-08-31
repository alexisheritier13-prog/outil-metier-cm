import {
  CircleDashed,
  Eye,
  Send,
  CheckCircle2,
  CalendarClock,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import { POST_STATUS_LABELS, POST_STATUS_TONE, type PostStatus } from '@/shared/constants/postStatus';
import { toneClasses } from '@/components/statusTone';
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
 * Statut d'un post : toujours icône + libellé + couleur du statut (jamais la couleur
 * seule). Fond teinté doux ou aplat plein selon l'avancement dans le pipeline.
 */
export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        toneClasses(POST_STATUS_TONE[status]),
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" strokeWidth={2.25} />
      {POST_STATUS_LABELS[status]}
    </span>
  );
}
