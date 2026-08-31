import { useMemo, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { NetworkIcon } from '@/components/NetworkIcon';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { parisDateLabel } from '@/shared/utils/tz';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { usePortalClient } from './PortalClientContext';
import { usePortalPosts } from './usePortal';
import { PortalPostDetail } from './PortalPostDetail';

/** Historique des posts publiés du client (Story 6.4). */
export function PortalPublishedPage() {
  const client = usePortalClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [network, setNetwork] = useState<Network | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);

  const posts = usePortalPosts(client.id, {
    statuses: ['published'],
    q: debouncedQ.trim() || undefined,
    networks: network ? [network] : undefined,
    from: from ? new Date(from).toISOString() : null,
    to: to ? new Date(to + 'T23:59:59').toISOString() : null,
  });

  const rows = useMemo(
    () => [...(posts.data ?? [])].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [posts.data],
  );
  const open = rows.find((p) => p.id === openId) ?? null;

  return (
    <section className="mx-auto max-w-5xl p-4 sm:p-6 lg:py-8">
      <h1 className="text-title mb-5 tracking-tight">Publiés</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Recherche</span>
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mot-clé dans la légende"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Réseau</span>
          <select
            className="field"
            value={network}
            onChange={(e) => setNetwork(e.target.value as Network | '')}
          >
            <option value="">Tous</option>
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABELS[n]}
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

      {posts.isLoading ? (
        <FullPageSpinner />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title="Aucun post publié"
          description="Les posts marqués comme publiés par votre agence s'afficheront ici."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpenId(p.id)}
                className="hover:bg-surface-2/60 flex w-full gap-3 rounded-md border p-3 text-left"
              >
                {p.canvaThumbnailUrl ? (
                  <img
                    src={p.canvaThumbnailUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded border object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="bg-surface-2 grid h-16 w-16 shrink-0 place-items-center rounded border">
                    <NetworkIcon network={p.network} />
                  </span>
                )}
                <div className="min-w-0 text-sm">
                  <p className="text-muted-foreground text-xs">
                    {parisDateLabel(p.scheduledAt)} · {NETWORK_LABELS[p.network]}
                  </p>
                  <p className="line-clamp-2">{p.caption || 'Sans légende'}</p>
                  {p.performanceVisibleToClient && p.performanceNote && (
                    <p className="text-muted-foreground mt-1 line-clamp-1 text-xs italic">
                      Perf. : {p.performanceNote}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <PortalPostDetail post={open} onClose={() => setOpenId(null)} />
    </section>
  );
}
