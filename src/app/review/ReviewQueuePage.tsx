import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/Segmented';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Page, PageHeader } from '@/components/Page';
import { NetworkIcon } from '@/components/NetworkIcon';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { listClients } from '@/services/clients';
import { listInternalUsers } from '@/services/users';
import { listReviewQueue, remindClientReview } from '@/services/posts';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import type { Post } from '@/shared/types';
import { PostSheet } from '@/app/posts/PostSheet';
import { useChangePostStatus } from '@/app/posts/usePosts';

type Kind = 'internal' | 'client';

function ageLabel(since: string): string {
  const ms = Date.now() - new Date(since).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "moins d'une heure";
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1 jour' : `${d} jours`;
}

export function ReviewQueuePage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>('internal');
  const [clientFilter, setClientFilter] = useState('');
  const [openPost, setOpenPost] = useState<Post | null>(null);

  const canValidateInternal = me?.role === 'lead' || me?.role === 'admin';

  const clients = useQuery({
    queryKey: ['clients', { includeArchived: false }],
    queryFn: () => listClients(false),
  });
  const authors = useQuery({ queryKey: ['internal-users-lite'], queryFn: listInternalUsers });
  const queue = useQuery({
    queryKey: ['review-queue', kind],
    queryFn: () => listReviewQueue(kind),
  });

  const change = useChangePostStatus();
  const remind = useMutation({
    mutationFn: remindClientReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['review-queue'] }),
  });

  const clientName = useMemo(() => {
    const m = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [clients.data]);
  const authorName = useMemo(() => {
    const m = new Map((authors.data ?? []).map((u) => [u.id, u.fullName || u.email]));
    return (id: string) => m.get(id) ?? '—';
  }, [authors.data]);

  const rows = useMemo(() => {
    const list = queue.data ?? [];
    return clientFilter ? list.filter((p) => p.clientId === clientFilter) : list;
  }, [queue.data, clientFilter]);

  const currentOpen = useMemo(
    () =>
      openPost
        ? ((queue.data ?? []).find((p) => p.id === openPost.id) ?? openPost)
        : null,
    [openPost, queue.data],
  );

  if (!me || !isInternalRole(me.role)) return null;
  const loading = queue.isLoading || clients.isLoading;

  return (
    <Page>
      <PageHeader
        title="À valider"
        description="Les posts en attente de validation, du plus ancien au plus récent."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel="Type de validation"
          value={kind}
          onChange={(v) => setKind(v as Kind)}
          options={[
            { value: 'internal', label: 'À valider en interne' },
            { value: 'client', label: 'En attente du client' },
          ]}
        />

        <select
          className="field"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          aria-label="Filtrer par client"
        >
          <option value="">Tous les clients</option>
          {(clients.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Rien à valider"
          description={
            kind === 'internal'
              ? 'Aucun post en attente de validation interne.'
              : "Aucun post en attente d'une réponse du client."
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-border-strong border-b-2">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Client</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Réseau</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Prévu le</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Légende</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Rédacteur</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">En attente depuis</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-border/70 border-b">
                  <td className="p-3">{clientName(p.clientId)}</td>
                  <td className="p-3">
                    <NetworkIcon network={p.network} />
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap p-3">
                    {parisDateLabel(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
                  </td>
                  <td className="text-muted-foreground max-w-xs truncate p-3">
                    {p.caption || 'Sans légende'}
                  </td>
                  <td className="p-3">{authorName(p.authorId)}</td>
                  <td className="text-muted-foreground whitespace-nowrap p-3">
                    {ageLabel(p.statusChangedAt)}
                  </td>
                  <td className="space-x-2 whitespace-nowrap p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setOpenPost(p)}>
                      Ouvrir
                    </Button>
                    {kind === 'internal' && canValidateInternal && (
                      <Button
                        size="sm"
                        disabled={change.isPending}
                        onClick={() =>
                          change.mutate({ id: p.id, to: 'client_review' })
                        }
                      >
                        Valider en interne
                      </Button>
                    )}
                    {kind === 'client' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={remind.isPending}
                        onClick={() => remind.mutate(p.id)}
                      >
                        Relancer le client
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PostSheet
        post={currentOpen}
        clients={clients.data ?? []}
        authors={authors.data ?? []}
        onClose={() => setOpenPost(null)}
      />
    </Page>
  );
}
