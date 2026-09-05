import { NetworkIcon } from '@/components/NetworkIcon';
import { activityCategory, activityLabel, type ActivityCategory } from '@/app/clients/tabs/activity';
import { relativeAge } from '@/lib/relativeTime';
import type { ClientActivityEntry } from '@/shared/types';

const VISIBLE = 5;

/** Teinte de la pastille par catégorie — jamais la couleur seule (le texte du
 *  libellé porte déjà le sens), juste un repère visuel rapide. */
const CATEGORY_TONE: Record<ActivityCategory, string> = {
  submitted: 'bg-info-surface text-info-strong',
  internal_approved: 'bg-success-surface text-success-strong',
  client_approved: 'bg-success-surface text-success-strong',
  scheduled: 'bg-success-surface text-success-strong',
  published: 'bg-success-surface text-success-strong',
  returned: 'bg-warning-surface text-warning-strong',
  client_rejected: 'bg-warning-surface text-warning-strong',
  create: 'bg-primary-surface text-primary-strong',
  update: 'bg-primary-surface text-primary-strong',
  trash: 'bg-surface-3 text-muted-foreground',
  restore: 'bg-surface-3 text-muted-foreground',
  note: 'bg-primary-surface text-primary-strong',
  other: 'bg-surface-3 text-muted-foreground',
};

export function ActivityFeed({
  rows,
  expanded,
  onExpand,
  clientName,
}: {
  rows: ClientActivityEntry[];
  expanded: boolean;
  onExpand: () => void;
  clientName: (id: string | null) => string;
}) {
  const visible = expanded ? rows : rows.slice(0, VISIBLE);
  const hidden = rows.slice(VISIBLE);
  const oldestHiddenAt = hidden[hidden.length - 1]?.createdAt;

  if (rows.length === 0) {
    return <p className="text-muted-foreground p-4 text-sm">Rien à afficher.</p>;
  }

  return (
    <ul className="divide-border/60 relative divide-y">
      {visible.map((e, i) => (
        <li key={e.historyId} className="relative flex items-start gap-3 p-3 text-sm">
          {i < visible.length - 1 && (
            <span className="bg-border absolute left-[1.6rem] top-9 h-[calc(100%-0.5rem)] w-px" />
          )}
          <span
            className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-full ${CATEGORY_TONE[activityCategory(e)]}`}
          >
            <NetworkIcon network={e.network} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">
              {activityLabel(e)}
              <span className="text-muted-foreground font-normal"> · {clientName(e.clientId)}</span>
            </span>
            <span className="text-muted-foreground text-xs">
              {e.actorName || 'Système'} · {relativeAge(e.createdAt)}
            </span>
          </span>
        </li>
      ))}
      {!expanded && hidden.length > 0 && (
        <li>
          <button
            type="button"
            onClick={onExpand}
            className="hover:bg-surface-2 text-muted-foreground flex w-full items-center gap-2 p-3 text-left text-sm transition-colors"
          >
            <span className="bg-surface-3 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-medium">
              +{hidden.length}
            </span>
            {hidden.length} action{hidden.length > 1 ? 's' : ''} de plus
            {oldestHiddenAt && <> · {relativeAge(oldestHiddenAt)}</>}
          </button>
        </li>
      )}
    </ul>
  );
}
