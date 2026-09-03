import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { Segmented } from '@/components/Segmented';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { listPortalPosts } from '@/services/portal';
import { usePortalClient } from './PortalClientContext';
import { PortalPostDetail } from './PortalPostDetail';

const CalendarView = lazy(() =>
  import('@/app/posts/CalendarView').then((m) => ({ default: m.CalendarView })),
);

export function PortalCalendarPage() {
  const client = usePortalClient();
  const [mode, setMode] = useState<'month' | 'list'>('month');
  const [openId, setOpenId] = useState<string | null>(null);

  const posts = useQuery({
    queryKey: ['portal', 'posts', client.id],
    queryFn: () => listPortalPosts(client.id),
  });

  const rows = posts.data ?? [];
  const open = rows.find((p) => p.id === openId) ?? null;

  if (posts.isLoading) return <FullPageSpinner />;

  return (
    <section className="animate-in fade-in slide-in-from-bottom-1 mx-auto max-w-5xl p-4 duration-300 ease-out sm:p-6 lg:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title tracking-tight">Calendrier</h1>
        <Segmented
          ariaLabel="Vue"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'month', label: 'Mois' },
            { value: 'list', label: 'Liste' },
          ]}
        />
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucun post à afficher"
          description="Les posts préparés par votre agence apparaîtront ici dès qu'ils vous seront soumis."
        />
      ) : mode === 'month' ? (
        <Suspense fallback={<FullPageSpinner />}>
          <div className="mb-3 flex flex-wrap gap-2">
            {(['client_review', 'approved', 'scheduled', 'published'] as const).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <CalendarView
            posts={rows}
            view="dayGridMonth"
            clientName={() => client.name}
            onOpen={(p: Post) => setOpenId(p.id)}
            editable={false}
          />
        </Suspense>
      ) : (
        <ul className="surface-card divide-y overflow-hidden">
          {rows.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpenId(p.id)}
                className="hover:bg-surface-2 flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3.5 text-left text-sm transition-colors"
              >
                <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                  {parisDateLabel(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
                </span>
                <NetworkIcon network={p.network} />
                <span className="min-w-0 flex-1 truncate">
                  {p.caption || <span className="text-muted-foreground italic">Sans légende</span>}
                </span>
                <StatusBadge status={p.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <PortalPostDetail post={open} onClose={() => setOpenId(null)} />
    </section>
  );
}
