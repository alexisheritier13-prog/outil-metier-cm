import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { NetworkIcon } from '@/components/NetworkIcon';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { listClients } from '@/services/clients';
import { listInternalUsers } from '@/services/users';
import { listReviewQueue, remindClientReview } from '@/services/posts';
import { parisDateKey, parisTimeLabel } from '@/shared/utils/tz';
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
  if (queue.isLoading || clients.isLoading) return <FullPageSpinner />;

  return (
    <section className="p-6">
      <header className="mb-4">
        <h1 className="text-title">À valider</h1>
        <p className="text-muted-foreground text-sm">
          Les posts en attente de validation, du plus ancien au plus récent.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList>
            <TabsTrigger value="internal">À valider en interne</TabsTrigger>
            <TabsTrigger value="client">En attente du client</TabsTrigger>
          </TabsList>
        </Tabs>

        <select
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
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

      {rows.length === 0 ? (
        <EmptyState
          title="Rien à valider"
          description={
            kind === 'internal'
              ? 'Aucun post en attente de validation interne.'
              : "Aucun post en attente d'une réponse du client."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-medium">Client</th>
                <th className="p-3 text-left font-medium">Réseau</th>
                <th className="p-3 text-left font-medium">Prévu le</th>
                <th className="p-3 text-left font-medium">Légende</th>
                <th className="p-3 text-left font-medium">Rédacteur</th>
                <th className="p-3 text-left font-medium">En attente depuis</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{clientName(p.clientId)}</td>
                  <td className="p-3">
                    <NetworkIcon network={p.network} />
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap p-3">
                    {parisDateKey(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
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
    </section>
  );
}
