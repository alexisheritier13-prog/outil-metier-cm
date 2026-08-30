import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NETWORKS, NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { parisWallTimeToUtc, toParisParts } from '@/shared/utils/tz';
import type { Client, Profile } from '@/shared/types';
import type { PostInput } from '@/services/posts';

const schema = z.object({
  clientId: z.string().min(1, 'Client requis'),
  network: z.enum(NETWORKS),
  scheduledLocal: z.string().min(1, 'Date et heure requises'),
  caption: z.string(),
  canvaUrl: z.string().trim().url('URL invalide').or(z.literal('')),
  authorId: z.string().optional(),
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
    authorId: string;
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
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: defaults?.clientId ?? clients[0]?.id ?? '',
      network: defaults?.network ?? 'instagram',
      scheduledLocal: defaults?.scheduledAt ? toLocalInput(defaults.scheduledAt) : '',
      caption: defaults?.caption ?? '',
      canvaUrl: defaults?.canvaUrl ?? '',
      authorId: defaults?.authorId,
    },
  });

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
          canvaUrl: v.canvaUrl || null,
          authorId: canReassign ? v.authorId : undefined,
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

      <div className="space-y-1.5">
        <Label htmlFor="pf-canva">Lien Canva</Label>
        <Input id="pf-canva" placeholder="https://www.canva.com/design/…" {...register('canvaUrl')} />
        {errors.canvaUrl && (
          <p className="text-destructive text-sm" role="alert">
            {errors.canvaUrl.message}
          </p>
        )}
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
