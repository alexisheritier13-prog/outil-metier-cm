import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trashClient } from '@/services/clients';
import { Page } from '@/components/Page';
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
import { ContactsTab } from './tabs/ContactsTab';
import { GuidelinesTab } from './tabs/GuidelinesTab';
import { OnboardingTab } from './tabs/OnboardingTab';
import { ActivityTab } from './tabs/ActivityTab';
import { onboardingKey } from './tabs/onboardingKeys';
import { useQuery } from '@tanstack/react-query';
import { listOnboardingItems } from '@/services/onboarding';

export function ClientDetailPage() {
  const { clientId = '' } = useParams();
  const { data: me } = useCurrentProfile();
  const canWrite = me?.role === 'lead' || me?.role === 'admin';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const client = useClient(clientId);
  const update = useUpdateClient(clientId);
  const archive = useSetClientArchived(clientId);
  const trash = useMutation({
    mutationFn: () => trashClient(clientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      navigate('/app/clients');
    },
  });
  const onboarding = useQuery({
    queryKey: onboardingKey(clientId),
    queryFn: () => listOnboardingItems(clientId),
    enabled: Boolean(clientId),
  });
  const [editOpen, setEditOpen] = useState(false);

  if (client.isLoading) return <FullPageSpinner />;
  if (!client.data) {
    return (
      <Page>
        <EmptyState
          title="Client introuvable"
          description="Ce client n'existe pas ou ne vous est pas accessible."
          action={
            <Button asChild variant="outline">
              <Link to="/app/clients">Retour aux clients</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const c = client.data;

  return (
    <Page>
      <nav
        className="text-muted-foreground mb-3 flex items-center gap-1 text-xs"
        aria-label="Fil d'Ariane"
      >
        <Link to="/app/clients" className="hover:text-foreground">
          Clients
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-foreground font-medium">{c.name}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ClientAvatar name={c.name} logoUrl={c.logoUrl} size="lg" />
          <div className="space-y-1">
            <h1 className="text-title tracking-tight">{c.name}</h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
              <span>{c.sector || 'Secteur non renseigné'}</span>
              <span aria-hidden="true">·</span>
              <span className={c.isArchived ? 'text-warning-strong' : 'text-success-strong'}>
                {c.isArchived ? 'Archivé' : 'Actif'}
              </span>
              {onboarding.data && onboarding.data.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Onboarding {onboarding.data.filter((i) => i.isDone).length}/
                    {onboarding.data.length}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={`/app/clients/${clientId}/export`}>Exporter PDF</Link>
          </Button>
          {canWrite && (
            <>
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
            <Button
              variant="ghost"
              disabled={trash.isPending}
              onClick={() => {
                if (
                  confirm(
                    `Mettre « ${c.name} » à la corbeille ? Récupérable pendant 60 jours.`,
                  )
                )
                  trash.mutate();
              }}
            >
              Corbeille
            </Button>
            </>
          )}
        </div>
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

        <TabsContent value="contacts">
          <ContactsTab clientId={c.id} />
        </TabsContent>

        <TabsContent value="guidelines">
          <GuidelinesTab clientId={c.id} />
        </TabsContent>

        <TabsContent value="onboarding">
          <OnboardingTab clientId={c.id} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab clientId={c.id} />
        </TabsContent>
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
    </Page>
  );
}
