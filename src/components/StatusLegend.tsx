import { POST_STATUS_LABELS, STEP_BAR_COLOR, type PostStatus } from '@/shared/constants/postStatus';

const LEGEND_STATUSES: PostStatus[] = [
  'draft',
  'internal_review',
  'client_review',
  'approved',
  'scheduled',
];

/** Rappel compact de la convention de couleur des statuts (pastille + libellé). */
export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ul className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {LEGEND_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: STEP_BAR_COLOR[s] }}
              aria-hidden="true"
            />
            {POST_STATUS_LABELS[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}
