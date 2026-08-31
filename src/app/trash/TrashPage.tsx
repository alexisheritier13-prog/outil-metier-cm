import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { NetworkIcon } from '@/components/NetworkIcon';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import {
  listTrashedClients,
  purgeClientNow,
  restoreClient,
} from '@/services/clients';
import { listClients } from '@/services/clients';
import { listTrashedPosts, purgePostNow, restorePost } from '@/services/posts';
import { parisDateLabel } from '@/shared/utils/tz';

function purgeDate(deletedAt: string): string {
  const d = new Date(deletedAt);
  d.setDate(d.getDate() + 60);
  return parisDateLabel(d);
}

export function TrashPage() {
  const { data: me } = useCurrentProfile();
  const qc = useQueryClient();
  const isAdmin = me?.role === 'admin';

  const posts = useQuery({ queryKey: ['trash', 'posts'], queryFn: listTrashedPosts });
  const clients = useQuery({ queryKey: ['trash', 'clients'], queryFn: listTrashedClients });
  const allClients = useQuery({
    queryKey: ['clients', { includeArchived: true }],
    queryFn: () => listClients(true),
  });

  const clientName = useMemo(() => {
    const m = new Map(
      [...(allClients.data ?? []), ...(clients.data ?? [])].map((c) => [c.id, c.name]),
    );
    return (id: string) => m.get(id) ?? '—';
  }, [allClients.data, clients.data]);

  const invalidate = () => qc.invalidateQueries();

  const restorePostM = useMutation({ mutationFn: restorePost, onSuccess: invalidate });
  const purgePostM = useMutation({ mutationFn: purgePostNow, onSuccess: invalidate });
  const restoreClientM = useMutation({ mutationFn: restoreClient, onSuccess: invalidate });
  const purgeClientM = useMutation({ mutationFn: purgeClientNow, onSuccess: invalidate });

  if (!me || (me.role !== 'lead' && me.role !== 'admin')) return null;
  if (posts.isLoading || clients.isLoading) return <FullPageSpinner />;

  const trashedPosts = posts.data ?? [];
  const trashedClients = clients.data ?? [];

  return (
    <Page>
      <PageHeader
        title="Corbeille"
        description="Les éléments sont supprimés définitivement 60 jours après leur mise à la corbeille."
      />

      {trashedPosts.length === 0 && trashedClients.length === 0 ? (
        <EmptyState title="Corbeille vide" description="Rien à restaurer pour le moment." />
      ) : (
        <div className="space-y-8">
          {trashedClients.length > 0 && (
            <div>
              <h2 className="text-section mb-2">Clients ({trashedClients.length})</h2>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <tbody>
                    {trashedClients.map((c) => (
                      <tr key={c.id} className="border-t first:border-t-0">
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="text-muted-foreground p-3">
                          supprimé le {parisDateLabel(c.deletedAt!)} · purge le{' '}
                          {purgeDate(c.deletedAt!)}
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => restoreClientM.mutate(c.id)}>
                            Restaurer
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost" className="text-danger-strong hover:bg-danger-surface hover:text-danger-strong"
                              onClick={() => {
                                if (confirm(`Supprimer définitivement « ${c.name} » ?`))
                                  purgeClientM.mutate(c.id);
                              }}
                            >
                              Purger
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {trashedPosts.length > 0 && (
            <div>
              <h2 className="text-section mb-2">Posts ({trashedPosts.length})</h2>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <tbody>
                    {trashedPosts.map((p) => (
                      <tr key={p.id} className="border-t first:border-t-0">
                        <td className="p-3">
                          <NetworkIcon network={p.network} />
                        </td>
                        <td className="p-3">{clientName(p.clientId)}</td>
                        <td className="text-muted-foreground max-w-xs truncate p-3">
                          {p.caption || 'Sans légende'}
                        </td>
                        <td className="text-muted-foreground p-3">
                          purge le {purgeDate(p.deletedAt!)}
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => restorePostM.mutate(p.id)}>
                            Restaurer
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost" className="text-danger-strong hover:bg-danger-surface hover:text-danger-strong"
                              onClick={() => {
                                if (confirm('Supprimer définitivement ce post ?'))
                                  purgePostM.mutate(p.id);
                              }}
                            >
                              Purger
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
