import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientAvatar } from '@/components/ClientAvatar';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { EmptyState } from '@/components/EmptyState';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useClient, useSetClientArchived, useUpdateClient } from './useClients';
import { ClientForm } from './ClientForm';
import { SocialAccountsTab } from './tabs/SocialAccountsTab';

export function ClientDetailPage() {
  const { clientId = '' } = useParams();
  const { data: me } = useCurrentProfile();
  const canWrite = me?.role === 'lead' || me?.role === 'admin';
  const client = useClient(clientId);
  const update = useUpdateClient(clientId);
  const archive = useSetClientArchived(clientId);
  const [editOpen, setEditOpen] = useState(false);

  if (client.isLoading) return <FullPageSpinner />;
  if (!client.data) {
    return (
      <section className="p-8">
        <EmptyState
          title="Client introuvable"
          description="Ce client n'existe pas ou ne vous est pas accessible."
          action={
            <Button asChild variant="outline">
              <Link to="/app/clients">Retour aux clients</Link>
            </Button>
          }
        />
      </section>
    );
  }

  const c = client.data;

  return (
    <section className="p-8">
      <nav className="text-muted-foreground mb-4 flex items-center gap-1 text-sm" aria-label="Fil d'Ariane">
        <Link to="/app/clients" className="hover:underline">
          Clients
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="text-foreground">{c.name}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ClientAvatar name={c.name} logoUrl={c.logoUrl} size="lg" />
          <div>
            <h1 className="text-title">{c.name}</h1>
            <p className="text-muted-foreground text-sm">
              {c.sector || 'Secteur non renseigné'} · {c.isArchived ? 'Archivé' : 'Actif'}
            </p>
          </div>
        </div>

        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Modifier
            </Button>
            <Button
              variant="ghost"
              disabled={archive.isPending}
              onClick={() => archive.mutate(!c.isArchived)}
            >
              {c.isArchived ? 'Réactiver' : 'Archiver'}
            </Button>
          </div>
        )}
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="social">Comptes sociaux</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="guidelines">Charte</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <dl className="grid max-w-md grid-cols-[10rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">Nom</dt>
            <dd>{c.name}</dd>
            <dt className="text-muted-foreground">Secteur</dt>
            <dd>{c.sector || '—'}</dd>
            <dt className="text-muted-foreground">Logo</dt>
            <dd className="truncate">
              {c.logoUrl ? (
                <a href={c.logoUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  {c.logoUrl}
                </a>
              ) : (
                '—'
              )}
            </dd>
            <dt className="text-muted-foreground">Créé le</dt>
            <dd>{new Date(c.createdAt).toLocaleDateString('fr-FR')}</dd>
          </dl>
        </TabsContent>

        <TabsContent value="social">
          <SocialAccountsTab clientId={c.id} />
        </TabsContent>

        {(['contacts', 'guidelines', 'onboarding', 'activity'] as const).map((v) => (
          <TabsContent key={v} value={v}>
            <p className="text-muted-foreground text-sm">
              Cette section arrive dans une prochaine story de l'Epic 2.
            </p>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <ClientForm
            submitLabel="Enregistrer"
            pending={update.isPending}
            error={update.isError ? update.error : undefined}
            defaultValues={{ name: c.name, logoUrl: c.logoUrl ?? '', sector: c.sector ?? '' }}
            onCancel={() => setEditOpen(false)}
            onSubmit={async (input) => {
              await update.mutateAsync(input);
              setEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
