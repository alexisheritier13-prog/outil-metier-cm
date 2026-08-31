import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientAvatar } from '@/components/ClientAvatar';
import { NetworkIcon } from '@/components/NetworkIcon';
import { FirstMediaThumb } from '@/components/MediaGallery';
import { StatusBadge } from '@/components/StatusBadge';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { EmptyState } from '@/components/EmptyState';
import { getClient } from '@/services/clients';
import { listPosts } from '@/services/posts';
import { listMediaForPosts } from '@/services/postMedia';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { parisDateKey, parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';

/** Décale une date ISO (jour) de `days`, renvoie `YYYY-MM-DD`. */
function shiftDay(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const todayKey = () => parisDateKey(new Date().toISOString());

/**
 * Vue imprimable du calendrier d'un client sur une période (Story 9.3). Page
 * autonome (hors coquille `/app`) : le Lead choisit la période puis « Imprimer /
 * Enregistrer en PDF » via la boîte d'impression du navigateur. Aucune dépendance,
 * aucune Edge Function — la pagination est gérée par le moteur d'impression.
 */
export function ClientCalendarExportPage() {
  const { clientId = '' } = useParams();
  const [params, setParams] = useSearchParams();

  const from = params.get('from') || todayKey();
  const to = params.get('to') || shiftDay(from, 30);

  const client = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId),
  });

  const posts = useQuery({
    queryKey: ['export-posts', clientId, from, to],
    queryFn: () =>
      listPosts({
        clientIds: [clientId],
        from: new Date(from + 'T00:00:00').toISOString(),
        to: new Date(to + 'T23:59:59').toISOString(),
      }),
    enabled: Boolean(clientId),
  });

  const postIds = (posts.data ?? []).map((p) => p.id);
  const mediaByPost = useQuery({
    queryKey: ['export-media', [...postIds].sort()],
    queryFn: () => listMediaForPosts(postIds),
    enabled: postIds.length > 0,
  });

  const byDay = useMemo(() => {
    const groups = new Map<string, Post[]>();
    const sorted = [...(posts.data ?? [])].sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    );
    for (const p of sorted) {
      const key = parisDateKey(p.scheduledAt);
      const bucket = groups.get(key);
      if (bucket) bucket.push(p);
      else groups.set(key, [p]);
    }
    return [...groups.entries()];
  }, [posts.data]);

  function setRange(key: 'from' | 'to', value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (!next.get('from')) next.set('from', from);
    if (!next.get('to')) next.set('to', to);
    setParams(next, { replace: true });
  }

  if (client.isLoading || posts.isLoading) return <FullPageSpinner />;

  if (!client.data) {
    return (
      <div className="p-8">
        <EmptyState
          title="Client introuvable"
          description="Ce client n'existe pas ou ne vous est pas accessible."
          action={
            <Button asChild variant="outline">
              <Link to="/app/clients">Retour aux clients</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const c = client.data;
  const total = posts.data?.length ?? 0;

  return (
    <div className="bg-surface-2 min-h-dvh print:bg-white">
      <style>{`
        @media print {
          @page { margin: 16mm 14mm; }
          .print-hide { display: none !important; }
          .print-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
          .post-row { break-inside: avoid; }
          .day-group { break-inside: avoid-page; }
        }
      `}</style>

      <div className="print-hide sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/app/clients/${clientId}`}>
              <ArrowLeft className="h-4 w-4" /> Fiche client
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-muted-foreground flex items-center gap-2">
              Du
              <input
                type="date"
                className="field"
                value={from}
                max={to}
                onChange={(e) => setRange('from', e.target.value)}
              />
            </label>
            <label className="text-muted-foreground flex items-center gap-2">
              au
              <input
                type="date"
                className="field"
                value={to}
                min={from}
                onChange={(e) => setRange('to', e.target.value)}
              />
            </label>
          </div>
          <Button className="ml-auto" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimer / Enregistrer en PDF
          </Button>
        </div>
      </div>

      <div className="print-sheet mx-auto my-6 max-w-3xl bg-white p-8 shadow-card print:my-0 print:p-0">
        <header className="mb-6 flex items-center gap-4 border-b pb-5">
          <ClientAvatar name={c.name} logoUrl={c.logoUrl} size="lg" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{c.name}</h1>
            <p className="text-muted-foreground text-sm">
              Calendrier éditorial · {parisDateLabel(from + 'T12:00:00Z')} —{' '}
              {parisDateLabel(to + 'T12:00:00Z')}
            </p>
          </div>
          <p className="text-muted-foreground ml-auto text-right text-xs">
            {total} post{total > 1 ? 's' : ''}
            <br />
            édité le {parisDateLabel(new Date().toISOString())}
          </p>
        </header>

        {byDay.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Aucun post planifié sur cette période.
          </p>
        ) : (
          <div className="space-y-6">
            {byDay.map(([day, dayPosts]) => (
              <section key={day} className="day-group">
                <h2 className="border-border mb-2 border-b pb-1 text-sm font-semibold capitalize">
                  {parisDateLabel(dayPosts[0]!.scheduledAt)}
                </h2>
                <ul className="divide-y">
                  {dayPosts.map((p) => (
                    <li key={p.id} className="post-row flex gap-4 py-3">
                      {(mediaByPost.data?.get(p.id) ?? []).length > 0 ? (
                        <FirstMediaThumb
                          media={mediaByPost.data!.get(p.id)!}
                          className="h-20 w-20 shrink-0 rounded border"
                        />
                      ) : (
                        <span className="bg-surface-2 grid h-20 w-20 shrink-0 place-items-center rounded border">
                          <NetworkIcon network={p.network} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="font-medium tabular-nums">
                            {parisTimeLabel(p.scheduledAt)}
                          </span>
                          <span className="text-muted-foreground">
                            {NETWORK_LABELS[p.network]}
                          </span>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="whitespace-pre-wrap text-sm">
                          {p.caption || (
                            <span className="text-muted-foreground italic">Sans légende</span>
                          )}
                        </p>
                        {p.performanceVisibleToClient && p.performanceNote && (
                          <p className="text-muted-foreground mt-1 text-xs italic">
                            Performance : {p.performanceNote}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
