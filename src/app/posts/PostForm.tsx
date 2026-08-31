import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormBody,
  FormField,
  FormFooter,
  FormSection,
  selectClass,
  textareaClass,
} from '@/components/form';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { useActiveNetworks } from '@/app/account/useAccount';
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

  const activeNetworks = useActiveNetworks();
  const netOptions: Network[] = activeNetworks.includes(network)
    ? activeNetworks
    : [network, ...activeNetworks];

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
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
      <FormBody>
        <FormSection title="Post">
          {isCreation && applicableTemplates.length > 0 && (
            <FormField label="Partir d'un template" htmlFor="pf-template">
              <select
                id="pf-template"
                className={selectClass}
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
            </FormField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Client" htmlFor="pf-client" error={errors.clientId?.message}>
              <select id="pf-client" className={selectClass} {...register('clientId')}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Réseau" htmlFor="pf-network">
              <select id="pf-network" className={selectClass} {...register('network')}>
                {netOptions.map((n) => (
                  <option key={n} value={n}>
                    {NETWORK_LABELS[n]}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField
            label="Date et heure de publication"
            htmlFor="pf-date"
            hint={
              networkSpecs ? (
                <span className="flex gap-1.5">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {networkSpecs}
                </span>
              ) : (
                'Fuseau Europe/Paris.'
              )
            }
            error={errors.scheduledLocal?.message}
          >
            <Input id="pf-date" type="datetime-local" {...register('scheduledLocal')} />
          </FormField>
        </FormSection>

        <FormSection title="Contenu">
          <FormField label="Légende" htmlFor="pf-caption">
            <textarea id="pf-caption" rows={5} className={textareaClass} {...register('caption')} />
          </FormField>

          <div>
            <MediaField
              clientId={clientId}
              postId={postId}
              stagedFiles={postId ? undefined : staged}
              onStagedChange={postId ? undefined : setStaged}
            />
            {mediaError && <p className="text-danger-strong mt-1.5 text-sm">{mediaError}</p>}
          </div>

          <FormField
            label="Lien Canva (interne)"
            htmlFor="pf-canva"
            hint="Lien de travail vers le design. Jamais montré au client."
          >
            <Input
              id="pf-canva"
              placeholder="https://www.canva.com/design/…"
              value={canvaUrl}
              onChange={(e) => setCanvaUrl(e.target.value)}
            />
          </FormField>
        </FormSection>

        <FormSection title="Classement">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Campagne" htmlFor="pf-campaign">
              <select id="pf-campaign" className={selectClass} {...register('campaignId')}>
                <option value="">Aucune</option>
                {(campaigns.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="Tags"
              htmlFor="pf-tags"
              hint="Séparés par des virgules. Créés à la volée."
            >
              <Input id="pf-tags" placeholder="urgent, promo, UGC" {...register('tagsText')} />
            </FormField>
          </div>

          {canReassign && authors.length > 0 && (
            <FormField label="Rédacteur" htmlFor="pf-author">
              <select id="pf-author" className={selectClass} {...register('authorId')}>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName || a.email}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </FormSection>

        {error != null && (
          <p className="text-destructive text-sm" role="alert">
            {error instanceof Error ? error.message : "L'enregistrement a échoué."}
          </p>
        )}
      </FormBody>

      <FormFooter>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={pending || uploading || clients.length === 0}>
          {pending || uploading ? 'Enregistrement…' : submitLabel}
        </Button>
      </FormFooter>
    </form>
  );
}
