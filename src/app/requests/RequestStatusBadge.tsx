import { CircleDashed, Loader, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toneClasses } from '@/components/statusTone';
import { CLIENT_REQUEST_STATUS_LABELS, type ClientRequestStatus } from '@/shared/types';
import type { StatusTone } from '@/shared/constants/postStatus';

const CONFIG: Record<ClientRequestStatus, { icon: typeof CircleDashed; tone: StatusTone }> = {
  nouvelle: { icon: CircleDashed, tone: { kind: 'neutral', fill: 'outline' } },
  prise_en_compte: { icon: Loader, tone: { kind: 'info', fill: 'soft' } },
  traitee: { icon: CheckCircle2, tone: { kind: 'success', fill: 'soft' } },
};

export function RequestStatusBadge({ status }: { status: ClientRequestStatus }) {
  const { icon: Icon, tone } = CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium',
        toneClasses(tone),
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {CLIENT_REQUEST_STATUS_LABELS[status]}
    </span>
  );
}
