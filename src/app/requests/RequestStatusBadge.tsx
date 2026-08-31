import { CircleDashed, Loader, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CLIENT_REQUEST_STATUS_LABELS, type ClientRequestStatus } from '@/shared/types';

const ICONS = {
  nouvelle: CircleDashed,
  prise_en_compte: Loader,
  traitee: CheckCircle2,
} as const;

export function RequestStatusBadge({ status }: { status: ClientRequestStatus }) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium',
        status === 'traitee' ? 'bg-foreground text-background border-transparent' : 'bg-surface-2',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {CLIENT_REQUEST_STATUS_LABELS[status]}
    </span>
  );
}
