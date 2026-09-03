import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trashClient } from '@/services/clients';
import { Page } from '@/components/Page';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormSheet } from '@/components/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientAvatar } from '@/components/ClientAvatar';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { EmptyState } from '@/components/EmptyState';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useClient, useSetClientArchived, useUpdateClient } from './useClients';
import { ClientForm } from './ClientForm';
import { SocialAccountsTab } from './tabs/SocialAccountsTab';
import { ContactsTab } from './tabs/ContactsTab';
import { OverviewTab } from './tabs/OverviewTab';
import { GuidelinesTab } from './tabs/GuidelinesTab';
import { ContractTab } from './tabs/ContractTab';
import { CredentialsTab } from './tabs/CredentialsTab';
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
  const [tab, setTab] = useState('overview');

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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="contract">Contrat</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="access">Accès</TabsTrigger>
          <TabsTrigger value="guidelines">Charte</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab client={c} onNavigate={setTab} />
        </TabsContent>

        <TabsContent value="contract" className="surface-card mt-4 p-5">
          <ContractTab clientId={c.id} />
        </TabsContent>

        <TabsContent value="contacts" className="surface-card mt-4 p-5">
          <ContactsTab clientId={c.id} />
        </TabsContent>

        <TabsContent value="access" className="mt-4 space-y-4">
          <section className="surface-card p-5">
            <h2 className="text-section mb-3">Comptes sociaux</h2>
            <SocialAccountsTab clientId={c.id} />
          </section>
          <section className="surface-card p-5">
            <h2 className="text-section mb-3">Codes de connexion</h2>
            <CredentialsTab clientId={c.id} />
          </section>
        </TabsContent>

        <TabsContent value="guidelines" className="surface-card mt-4 p-5">
          <GuidelinesTab clientId={c.id} />
        </TabsContent>

        <TabsContent value="onboarding" className="surface-card mt-4 p-5">
          <OnboardingTab clientId={c.id} />
        </TabsContent>

        <TabsContent value="activity" className="surface-card mt-4 p-5">
          <ActivityTab clientId={c.id} />
        </TabsContent>
      </Tabs>

      <FormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Modifier le client"
        description={c.name}
      >
        <ClientForm
          submitLabel="Enregistrer"
          pending={update.isPending}
          error={update.isError ? update.error : undefined}
          defaultValues={{
            name: c.name,
            logoUrl: c.logoUrl ?? '',
            sector: c.sector ?? '',
            skipClientReview: c.skipClientReview ?? false,
          }}
          onCancel={() => setEditOpen(false)}
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            setEditOpen(false);
          }}
        />
      </FormSheet>
    </Page>
  );
}
