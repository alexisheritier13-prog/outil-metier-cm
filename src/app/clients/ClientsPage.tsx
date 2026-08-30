import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useClients, useCreateClient } from './useClients';
import { ClientForm } from './ClientForm';

export function ClientsPage() {
  const { data: me } = useCurrentProfile();
  const canWrite = me?.role === 'lead' || me?.role === 'admin';
  const [includeArchived, setIncludeArchived] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const clients = useClients(includeArchived);
  const create = useCreateClient();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (clients.data ?? []).filter((c) => !term || c.name.toLowerCase().includes(term));
  }, [clients.data, q]);

  if (!me || !isInternalRole(me.role)) return null;

  return (
    <section className="p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-title">Clients</h1>
          <p className="text-muted-foreground text-sm">
            Le référentiel des comptes clients de l'agence.
          </p>
        </div>
        {canWrite && (
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
        )}
      </header>

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
      ) : filtered.length === 0 ? (
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
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Secteur</th>
                <th className="p-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2/60 border-t">
                  <td className="p-3">
                    <Link
                      to={`/app/clients/${c.id}`}
                      className="flex items-center gap-3 font-medium hover:underline"
                    >
                      <ClientAvatar name={c.name} logoUrl={c.logoUrl} size="sm" />
                      {c.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground p-3">{c.sector || '—'}</td>
                  <td className="p-3">
                    {c.isArchived ? (
                      <span className="text-muted-foreground">Archivé</span>
                    ) : (
                      'Actif'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
