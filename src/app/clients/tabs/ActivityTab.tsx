import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/EmptyState';
import { NetworkIcon } from '@/components/NetworkIcon';
import { listClientActivity } from '@/services/clientActivity';
import { ACTIVITY_FILTERS, activityCategory, activityLabel } from './activity';
import { parisDateTimeLabel } from '@/shared/utils/tz';

/** Onglet « Activité » de la fiche client (Story 5.5). */
export function ActivityTab({ clientId }: { clientId: string }) {
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const activity = useQuery({
    queryKey: ['client-activity', clientId, from, to],
    queryFn: () =>
      listClientActivity(clientId, {
        from: from ? new Date(from).toISOString() : null,
        to: to ? new Date(to + 'T23:59:59').toISOString() : null,
      }),
  });

  const rows = useMemo(() => {
    const all = activity.data ?? [];
    if (!type) return all;
    const cats = ACTIVITY_FILTERS.find((f) => f.value === type)?.match ?? [];
    return all.filter((e) => cats.includes(activityCategory(e)));
  }, [activity.data, type]);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Type d'action</span>
          <select
            className="field"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Toutes</option>
            {ACTIVITY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Du</span>
          <input
            type="date"
            className="field"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Au</span>
          <input
            type="date"
            className="field"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>

      {activity.isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucune activité"
          description="Rien ne correspond à ces filtres pour ce client."
        />
      ) : (
        <ol className="space-y-2">
          {rows.map((e) => (
            <li key={e.historyId} className="flex flex-col border-b pb-2 text-sm last:border-b-0">
              <span className="flex items-center gap-2">
                <NetworkIcon network={e.network} />
                <span className="font-medium">{activityLabel(e)}</span>
              </span>
              <span className="text-muted-foreground text-xs">
                {e.postCaption || 'Sans légende'} · {e.actorName || 'Système'} ·{' '}
                {parisDateTimeLabel(e.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
