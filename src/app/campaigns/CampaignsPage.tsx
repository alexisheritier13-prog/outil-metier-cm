import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Page, PageHeader } from '@/components/Page';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { listClients } from '@/services/clients';
import { CampaignForm } from './CampaignForm';
import { useCampaigns, useCreateCampaign } from './useCampaigns';

export function CampaignsPage() {
  const campaigns = useCampaigns();
  const clients = useQuery({
    queryKey: ['clients', { includeArchived: false }],
    queryFn: () => listClients(false),
  });
  const create = useCreateCampaign();
  const [open, setOpen] = useState(false);

  const clientName = useMemo(() => {
    const m = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [clients.data]);

  if (campaigns.isLoading) return <FullPageSpinner />;
  const rows = campaigns.data ?? [];

  return (
    <Page>
      <PageHeader
        title="Campagnes"
        description="Regroupez des posts par thème ou période."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={(clients.data ?? []).length === 0}>
                <Plus className="h-4 w-4" /> Nouvelle campagne
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle campagne</DialogTitle>
              </DialogHeader>
              <CampaignForm
                clients={clients.data ?? []}
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
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aucune campagne"
          description="Créez une campagne pour regrouper les posts d'un temps fort."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="p-3 font-medium">Campagne</th>
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Période</th>
                <th className="p-3 font-medium">Posts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2/60 border-t">
                  <td className="p-3">
                    <Link to={`/app/campagnes/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground p-3">{clientName(c.clientId)}</td>
                  <td className="text-muted-foreground p-3">
                    {c.startsOn} → {c.endsOn}
                  </td>
                  <td className="p-3">{c.postCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
