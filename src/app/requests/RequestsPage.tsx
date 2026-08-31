import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { NetworkIcon } from '@/components/NetworkIcon';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { CLIENT_REQUEST_STATUS_LABELS, type ClientRequestStatus } from '@/shared/types';
import { listClients } from '@/services/clients';
import { RequestStatusBadge } from './RequestStatusBadge';
import { RequestComments } from './RequestComments';
import { parisDateLabel } from '@/shared/utils/tz';
import {
  useClientRequests,
  usePostsFromRequest,
  useRequestToPost,
  useSetRequestStatus,
} from './useRequests';

const STATUSES: ClientRequestStatus[] = ['nouvelle', 'prise_en_compte', 'traitee'];

export function RequestsPage() {
  const { data: me } = useCurrentProfile();
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientRequestStatus | ''>('');
  const [openId, setOpenId] = useState<string | null>(null);

  const clients = useQuery({
    queryKey: ['clients', { includeArchived: true }],
    queryFn: () => listClients(true),
  });
  const requests = useClientRequests();
  const setStatus = useSetRequestStatus();
  const toPost = useRequestToPost();

  const clientName = useMemo(() => {
    const m = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [clients.data]);

  const rows = useMemo(() => {
    let list = requests.data ?? [];
    if (clientFilter) list = list.filter((r) => r.clientId === clientFilter);
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    return list;
  }, [requests.data, clientFilter, statusFilter]);

  const open = (requests.data ?? []).find((r) => r.id === openId) ?? null;
  const linkedPosts = usePostsFromRequest(openId);

  if (!me || !isInternalRole(me.role)) return null;
  if (requests.isLoading) return <FullPageSpinner />;

  return (
    <Page>
      <PageHeader
        title="Demandes clients"
        description="Les briefs déposés par les clients dans leur espace."
      />

      <div className="mb-4 flex flex-wrap gap-3">
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
        <select
          className="field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ClientRequestStatus | '')}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_REQUEST_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucune demande" description="Rien à traiter pour l'instant." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-medium">Client</th>
                <th className="p-3 text-left font-medium">Demande</th>
                <th className="p-3 text-left font-medium">Souhait</th>
                <th className="p-3 text-left font-medium">Reçue le</th>
                <th className="p-3 text-left font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-surface-2/60 cursor-pointer border-t"
                  onClick={() => setOpenId(r.id)}
                >
                  <td className="p-3">{clientName(r.clientId)}</td>
                  <td className="max-w-xs truncate p-3">{r.title}</td>
                  <td className="text-muted-foreground p-3">
                    {r.wantedNetwork ? NETWORK_LABELS[r.wantedNetwork] : '—'}
                    {r.wantedDate ? ` · ${parisDateLabel(r.wantedDate)}` : ''}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap p-3">
                    {parisDateLabel(r.createdAt)}
                  </td>
                  <td className="p-3">
                    <RequestStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={Boolean(open)} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent>
          {open && (
            <>
              <header className="flex items-start justify-between border-b p-4">
                <div className="space-y-1">
                  <SheetTitle>{open.title}</SheetTitle>
                  <p className="text-muted-foreground text-sm">{clientName(open.clientId)}</p>
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto p-4">
                <p className="whitespace-pre-wrap text-sm">{open.description || '—'}</p>

                <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Réseau souhaité</dt>
                  <dd className="flex items-center gap-2">
                    {open.wantedNetwork ? (
                      <>
                        <NetworkIcon network={open.wantedNetwork} /> {NETWORK_LABELS[open.wantedNetwork]}
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                  <dt className="text-muted-foreground">Échéance souhaitée</dt>
                  <dd>
                    {open.wantedDate
                      ? parisDateLabel(open.wantedDate)
                      : '—'}
                  </dd>
                </dl>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-muted-foreground text-xs" htmlFor="req-status">
                    Statut
                  </label>
                  <select
                    id="req-status"
                    className="field"
                    value={open.status}
                    disabled={setStatus.isPending}
                    onChange={(e) =>
                      setStatus.mutate({ id: open.id, status: e.target.value as ClientRequestStatus })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {CLIENT_REQUEST_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                {(linkedPosts.data ?? []).length > 0 ? (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Post lié</p>
                    <ul className="list-disc pl-4">
                      {(linkedPosts.data ?? []).map((p) => (
                        <li key={p.id}>{p.caption.split('\n')[0] || 'Sans légende'}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    disabled={toPost.isPending}
                    onClick={() => toPost.mutate(open.id)}
                  >
                    Transformer en post
                  </Button>
                )}

                <div className="border-t pt-4">
                  <RequestComments requestId={open.id} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Page>
  );
}
