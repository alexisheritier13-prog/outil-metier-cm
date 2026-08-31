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
import { probeFile, uploadPostMedia } from '@/services/postMedia';
import type { Client, Post, PostTemplate, Profile } from '@/shared/types';
import type { PostInput } from '@/services/posts';
import { MediaField } from './MediaField';
import { templatePrefill } from './applyTemplate';

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
  /** Templates disponibles — affiche « Partir d'un template » en création (Story 7.2). */
  templates?: PostTemplate[];
  /** Post existant : active la gestion « live » des visuels. Absent = création. */
  postId?: string;
  defaults?: Partial<{
    clientId: string;
    network: Network;
    scheduledAt: string;
    caption: string;
    canvaUrl: string | null;
    authorId: string;
    campaignId: string | null;
    tags: string[];
  }>;
  submitLabel: string;
  pending: boolean;
  error?: unknown;
  /** Doit créer/mettre à jour le post et le **retourner** (ne ferme pas la fenêtre). */
  onSubmit: (input: PostInput) => Promise<Post>;
  /** Appelé quand tout est fini (post + visuels) — ferme la fenêtre. */
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PostForm({
  clients,
  authors = [],
  canReassign = false,
  templates = [],
  postId,
  defaults,
  submitLabel,
  pending,
  error,
  onSubmit,
  onSuccess,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
  const [staged, setStaged] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const clientId = watch('clientId');
  const network = watch('network');

  const isCreation = !defaults;
  const applicableTemplates = templates.filter(
    (t) => t.clientId === null || t.clientId === clientId,
  );

  function applyTemplate(id: string) {
    const t = templates.find((tpl) => tpl.id === id);
    if (!t) return;
    const pre = templatePrefill(t);
    if (pre.network) setValue('network', pre.network);
    if (pre.caption) setValue('caption', pre.caption);
    if (pre.tagsText) setValue('tagsText', pre.tagsText);
  }
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
      onSubmit={handleSubmit(async (v) => {
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
        setMediaError(null);
        const post = await onSubmit({
          clientId: v.clientId,
          network: v.network,
          scheduledAt,
          caption: v.caption,
          canvaUrl: canvaUrl.trim() || null,
          authorId: canReassign ? v.authorId : undefined,
          campaignId: v.campaignId || null,
          tags: v.tagsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        });

        // Visuels mis en attente à la création → upload contre le post créé.
        if (staged.length > 0) {
          setUploading(true);
          try {
            for (let i = 0; i < staged.length; i++) {
              const probed = await probeFile(staged[i]!);
              await uploadPostMedia(post.clientId, post.id, probed, i);
            }
          } catch {
            setMediaError(
              'Le post est créé mais certains visuels n’ont pas pu être envoyés. Rouvrez le post pour réessayer.',
            );
          } finally {
            setUploading(false);
          }
        }
        onSuccess?.();
      })}
    >
      {isCreation && applicableTemplates.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="pf-template">Partir d'un template</Label>
          <select
            id="pf-template"
            className="border-input bg-surface h-10 w-full rounded-md border px-3 text-sm"
            defaultValue=""
            onChange={(e) => {
              applyTemplate(e.target.value);
              e.target.value = '';
            }}
          >
            <option value="">— Aucun —</option>
            {applicableTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="pf-client">Client</Label>
          <select
            id="pf-client"
            className="border-input bg-surface h-10 w-full rounded-md border px-3 text-sm"
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
            className="border-input bg-surface h-10 w-full rounded-md border px-3 text-sm"
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
          className="border-input bg-surface focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          {...register('caption')}
        />
      </div>

      <MediaField
        clientId={clientId}
        postId={postId}
        stagedFiles={postId ? undefined : staged}
        onStagedChange={postId ? undefined : setStaged}
      />
      {mediaError && <p className="text-danger-strong text-sm">{mediaError}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="pf-canva">Lien Canva (interne)</Label>
        <Input
          id="pf-canva"
          placeholder="https://www.canva.com/design/…"
          value={canvaUrl}
          onChange={(e) => setCanvaUrl(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Lien de travail vers le design. Jamais montré au client.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="pf-campaign">Campagne</Label>
          <select
            id="pf-campaign"
            className="border-input bg-surface h-10 w-full rounded-md border px-3 text-sm"
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
            className="border-input bg-surface h-10 w-full rounded-md border px-3 text-sm"
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
        <Button type="submit" disabled={pending || uploading || clients.length === 0}>
          {pending || uploading ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
