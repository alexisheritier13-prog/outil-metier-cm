import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import { ClientAvatar } from '@/components/ClientAvatar';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { isInternalRole } from '@/shared/constants/roles';
import type { ClientOverview } from '@/shared/types';
import { useClientOverview, useCreateClient } from './useClients';
import { ClientForm } from './ClientForm';

type SortKey = 'name' | 'onboarding' | 'lastActivity';

export function ClientsPage() {
  const { data: me } = useCurrentProfile();
  const canWrite = me?.role === 'lead' || me?.role === 'admin';
  const [includeArchived, setIncludeArchived] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc',
  });
  const clients = useClientOverview(includeArchived);
  const create = useCreateClient();

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (clients.data ?? []).filter((c) => !term || c.name.toLowerCase().includes(term));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.key === 'name') return a.name.localeCompare(b.name) * dir;
      if (sort.key === 'onboarding') return (ratio(a) - ratio(b)) * dir;
      return (
        (new Date(a.lastActivityAt ?? 0).getTime() - new Date(b.lastActivityAt ?? 0).getTime()) *
        dir
      );
    });
  }, [clients.data, q, sort]);

  if (!me || !isInternalRole(me.role)) return null;

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  return (
    <Page>
      <PageHeader
        title="Clients"
        description="Le référentiel des comptes clients de l'agence."
        actions={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Nouveau client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau client</DialogTitle>
                </DialogHeader>
                <ClientForm
                  submitLabel="Créer"
                  pending={create.isPending}
                  error={create.isError ? create.error : undefined}
                  onCancel={() => setOpen(false)}
                  onSubmit={async (input) => {
                    await create.mutateAsync(input);
                    setOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Input
          placeholder="Rechercher un client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
          aria-label="Rechercher un client"
        />
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Inclure les clients archivés
        </label>
      </div>

      {clients.isLoading ? (
        <FullPageSpinner />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={q ? 'Aucun client ne correspond' : 'Aucun client pour le moment'}
          description={
            q
              ? 'Essayez un autre terme de recherche.'
              : canWrite
                ? 'Créez le premier client pour commencer à planifier du contenu.'
                : "Aucun client ne vous est assigné pour l'instant."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                <Th label="Client" active={sort.key === 'name'} dir={sort.dir} onClick={() => toggleSort('name')} />
                <th className="p-3 font-medium">Secteur</th>
                <th className="p-3 font-medium" title="Posts en attente — calculé à l'Epic 3">
                  À valider
                </th>
                <Th
                  label="Onboarding"
                  active={sort.key === 'onboarding'}
                  dir={sort.dir}
                  onClick={() => toggleSort('onboarding')}
                />
                <Th
                  label="Dernière activité"
                  active={sort.key === 'lastActivity'}
                  dir={sort.dir}
                  onClick={() => toggleSort('lastActivity')}
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2/60 border-t">
                  <td className="p-3">
                    <Link
                      to={`/app/clients/${c.id}`}
                      className="flex items-center gap-3 font-medium hover:underline"
                    >
                      <ClientAvatar name={c.name} logoUrl={c.logoUrl} size="sm" />
                      {c.name}
                      {c.isArchived && (
                        <span className="text-muted-foreground text-xs">(archivé)</span>
                      )}
                    </Link>
                  </td>
                  <td className="text-muted-foreground p-3">{c.sector || '—'}</td>
                  <td className="text-muted-foreground p-3">
                    {c.pendingInternal + c.pendingClient === 0
                      ? '—'
                      : `${c.pendingInternal} int. · ${c.pendingClient} client`}
                  </td>
                  <td className="p-3">
                    {c.onboardingTotal === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={c.onboardingDone === c.onboardingTotal ? '' : 'font-medium'}>
                        {c.onboardingDone}/{c.onboardingTotal}
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground p-3">
                    {c.lastActivityAt
                      ? new Date(c.lastActivityAt).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

function ratio(c: ClientOverview) {
  return c.onboardingTotal === 0 ? 1 : c.onboardingDone / c.onboardingTotal;
}

function Th({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <th
      className="p-0 font-medium"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-surface-2 flex w-full items-center gap-1 p-3 text-left"
      >
        {label}
        {active &&
          (dir === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          ))}
      </button>
    </th>
  );
}
