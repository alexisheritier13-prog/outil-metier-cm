import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Page } from '@/components/Page';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { EmptyState } from '@/components/EmptyState';
import { NetworkIcon } from '@/components/NetworkIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { listPosts } from '@/services/posts';
import { getClient } from '@/services/clients';
import { parisDateLabel, parisTimeLabel } from '@/shared/utils/tz';
import { useCampaign } from './useCampaigns';

export function CampaignDetailPage() {
  const { campaignId = '' } = useParams();
  const campaign = useCampaign(campaignId);
  const client = useQuery({
    queryKey: ['client', campaign.data?.clientId],
    queryFn: () => getClient(campaign.data!.clientId),
    enabled: Boolean(campaign.data?.clientId),
  });
  const posts = useQuery({
    queryKey: ['posts', { campaignId }],
    queryFn: () => listPosts({ clientIds: campaign.data ? [campaign.data.clientId] : [] }),
    enabled: Boolean(campaign.data),
    select: (all) => all.filter((p) => p.campaignId === campaignId),
  });

  if (campaign.isLoading) return <FullPageSpinner />;
  if (!campaign.data) {
    return (
      <Page>
        <EmptyState
          title="Campagne introuvable"
          action={
            <Button asChild variant="outline">
              <Link to="/app/campagnes">Retour</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const c = campaign.data;

  return (
    <Page>
      <nav className="text-muted-foreground mb-4 flex items-center gap-1 text-sm">
        <Link to="/app/campagnes" className="hover:underline">
          Campagnes
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="text-foreground">{c.name}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-title">{c.name}</h1>
        <p className="text-muted-foreground text-sm">
          {client.data?.name ?? '—'} · {c.startsOn} → {c.endsOn}
        </p>
        {c.description && <p className="mt-2 max-w-2xl text-sm">{c.description}</p>}
      </header>

      <h2 className="text-section mb-2">Posts ({posts.data?.length ?? 0})</h2>
      {(posts.data ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun post rattaché à cette campagne.</p>
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {(posts.data ?? []).map((p) => (
                <tr key={p.id} className="border-t first:border-t-0">
                  <td className="p-3 whitespace-nowrap">
                    {parisDateLabel(p.scheduledAt)} · {parisTimeLabel(p.scheduledAt)}
                  </td>
                  <td className="p-3">
                    <NetworkIcon network={p.network} />
                  </td>
                  <td className="text-muted-foreground max-w-md truncate p-3">
                    {p.caption || 'Sans légende'}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={p.status} />
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
