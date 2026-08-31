import { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { NetworkIcon } from '@/components/NetworkIcon';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
import { usePortalClient } from './PortalClientContext';
import { usePortalPosts } from './usePortal';
import { PortalPostDetail } from './PortalPostDetail';

/** File des posts en attente de la réponse du contact (Story 6.3). */
export function PortalReviewPage() {
  const client = usePortalClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const posts = usePortalPosts(client.id, { statuses: ['client_review'] });

  const rows = posts.data ?? [];
  const open = rows.find((p) => p.id === openId) ?? null;

  if (posts.isLoading) return <FullPageSpinner />;

  return (
    <section className="p-4 sm:p-6">
      <h1 className="text-title mb-4">À valider ({rows.length})</h1>

      {rows.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title="Rien à valider"
          description="Vous êtes à jour. Les posts qui attendent votre retour apparaîtront ici."
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpenId(p.id)}
                className="hover:bg-surface-2/60 flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left text-sm"
              >
                <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                  {parisDateKey(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
                </span>
                <NetworkIcon network={p.network} />
                <span className="min-w-0 flex-1 truncate">
                  {p.caption || <span className="text-muted-foreground italic">Sans légende</span>}
                </span>
                <span className="text-muted-foreground text-xs">Ouvrir →</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <PortalPostDetail post={open} onClose={() => setOpenId(null)} />
    </section>
  );
}
