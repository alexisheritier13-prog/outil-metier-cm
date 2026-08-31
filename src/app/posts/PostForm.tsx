import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { Info } from 'lucide-react';
import { parisWallTimeToUtc, toParisParts } from '@/shared/utils/tz';
import { listCampaignsForClient } from '@/services/campaigns';
import { listNetworks } from '@/services/socialAccounts';
import type { Client, Profile } from '@/shared/types';
import type { PostInput } from '@/services/posts';
import { CanvaField } from './CanvaField';

const schema = z.object({
  clientId: z.string().min(1, 'Client requis'),
  network: z.enum(NETWORKS),
  scheduledLocal: z.string().min(1, 'Date et heure requises'),
  caption: z.string(),
  authorId: z.string().optional(),
  campaignId: z.string().optional(),
  tagsText: z.string(),
});
type Values = z.infer<typeof schema>;

/** Convertit un instant UTC en valeur `datetime-local` (heure de Paris). */
function toLocalInput(iso: string): string {
  const p = toParisParts(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

interface Props {
  clients: Client[];
  authors?: Profile[];
  canReassign?: boolean;
  defaults?: Partial<{
    clientId: string;
    network: Network;
    scheduledAt: string;
    caption: string;
    canvaUrl: string | null;
    canvaThumbnailUrl: string | null;
    canvaThumbnailSource: 'auto' | 'manual' | null;
    authorId: string;
    campaignId: string | null;
    tags: string[];
  }>;
  submitLabel: string;
  pending: boolean;
  error?: unknown;
  onSubmit: (input: PostInput) => void;
  onCancel?: () => void;
}

export function PostForm({
  clients,
  authors = [],
  canReassign = false,
  defaults,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: defaults?.clientId ?? clients[0]?.id ?? '',
      network: defaults?.network ?? 'instagram',
      scheduledLocal: defaults?.scheduledAt ? toLocalInput(defaults.scheduledAt) : '',
      caption: defaults?.caption ?? '',
      authorId: defaults?.authorId,
      campaignId: defaults?.campaignId ?? '',
      tagsText: (defaults?.tags ?? []).join(', '),
    },
  });

  const [canvaUrl, setCanvaUrl] = useState(defaults?.canvaUrl ?? '');
  const [thumb, setThumb] = useState<{ url: string | null; source: 'auto' | 'manual' | null }>({
    url: defaults?.canvaThumbnailUrl ?? null,
    source: defaults?.canvaThumbnailSource ?? null,
  });

  const clientId = watch('clientId');
  const network = watch('network');
  const campaigns = useQuery({
    queryKey: ['campaigns-for-client', clientId],
    queryFn: () => listCampaignsForClient(clientId),
    enabled: Boolean(clientId),
  });
  const networks = useQuery({ queryKey: ['networks'], queryFn: listNetworks, staleTime: 5 * 60_000 });
  const networkSpecs = networks.data?.find((n) => n.code === network)?.specs;

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit((v) => {
        const [datePart, timePart] = v.scheduledLocal.split('T');
        const [y, m, d] = datePart!.split('-').map(Number);
        const [hh, mm] = timePart!.split(':').map(Number);
        const scheduledAt = parisWallTimeToUtc({
          year: y!,
          month: m!,
          day: d!,
          hour: hh!,
          minute: mm!,
        }).toISOString();
        onSubmit({
          clientId: v.clientId,
          network: v.network,
          scheduledAt,
          caption: v.caption,
          canvaUrl: canvaUrl.trim() || null,
          canvaThumbnailUrl: thumb.url,
          canvaThumbnailSource: thumb.source,
          authorId: canReassign ? v.authorId : undefined,
          campaignId: v.campaignId || null,
          tags: v.tagsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        });
      })}
    >
      <div className="flex flex-wrap gap-4">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="pf-client">Client</Label>
          <select
            id="pf-client"
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            {...register('clientId')}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.clientId && (
            <p className="text-destructive text-sm" role="alert">
              {errors.clientId.message}
            </p>
          )}
        </div>

        <div className="min-w-40 flex-1 space-y-1.5">
          <Label htmlFor="pf-network">Réseau</Label>
          <select
            id="pf-network"
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            {...register('network')}
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABELS[n]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {networkSpecs && (
        <p className="text-muted-foreground flex gap-1.5 text-xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {networkSpecs}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pf-date">Date et heure de publication (Europe/Paris)</Label>
        <Input id="pf-date" type="datetime-local" {...register('scheduledLocal')} />
        {errors.scheduledLocal && (
          <p className="text-destructive text-sm" role="alert">
            {errors.scheduledLocal.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-caption">Légende</Label>
        <textarea
          id="pf-caption"
          rows={5}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          {...register('caption')}
        />
      </div>

      <CanvaField
        url={canvaUrl}
        onUrlChange={setCanvaUrl}
        thumbnailUrl={thumb.url}
        thumbnailSource={thumb.source}
        onThumbnail={(url, source) => setThumb({ url, source })}
      />

      <div className="flex flex-wrap gap-4">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="pf-campaign">Campagne</Label>
          <select
            id="pf-campaign"
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            {...register('campaignId')}
          >
            <option value="">Aucune</option>
            {(campaigns.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="pf-tags">Tags</Label>
          <Input id="pf-tags" placeholder="urgent, promo, UGC" {...register('tagsText')} />
          <p className="text-muted-foreground text-xs">Séparés par des virgules. Créés à la volée.</p>
        </div>
      </div>

      {canReassign && authors.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="pf-author">Rédacteur</Label>
          <select
            id="pf-author"
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            {...register('authorId')}
          >
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName || a.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {error != null && (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof Error ? error.message : "L'enregistrement a échoué."}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={pending || clients.length === 0}>
          {pending ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
