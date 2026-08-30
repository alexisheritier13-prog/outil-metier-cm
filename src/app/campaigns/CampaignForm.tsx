import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Client } from '@/shared/types';
import type { CampaignInput } from '@/services/campaigns';

const schema = z
  .object({
    clientId: z.string().min(1, 'Client requis'),
    name: z.string().trim().min(1, 'Nom requis'),
    startsOn: z.string().min(1, 'Date de début requise'),
    endsOn: z.string().min(1, 'Date de fin requise'),
    description: z.string(),
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: 'La fin doit être après le début',
    path: ['endsOn'],
  });
type Values = z.infer<typeof schema>;

interface Props {
  clients: Client[];
  defaults?: Partial<Values>;
  submitLabel: string;
  pending: boolean;
  error?: unknown;
  onSubmit: (input: CampaignInput) => void;
  onCancel?: () => void;
}

export function CampaignForm({ clients, defaults, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: defaults?.clientId ?? clients[0]?.id ?? '',
      name: defaults?.name ?? '',
      startsOn: defaults?.startsOn ?? '',
      endsOn: defaults?.endsOn ?? '',
      description: defaults?.description ?? '',
    },
  });

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => onSubmit(v))}>
      <div className="space-y-1.5">
        <Label htmlFor="cf-name">Nom</Label>
        <Input id="cf-name" {...register('name')} />
        {errors.name && <p className="text-destructive text-sm" role="alert">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-client">Client</Label>
        <select
          id="cf-client"
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
          {...register('clientId')}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="cf-start">Début</Label>
          <Input id="cf-start" type="date" {...register('startsOn')} />
          {errors.startsOn && (
            <p className="text-destructive text-sm" role="alert">{errors.startsOn.message}</p>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="cf-end">Fin</Label>
          <Input id="cf-end" type="date" {...register('endsOn')} />
          {errors.endsOn && (
            <p className="text-destructive text-sm" role="alert">{errors.endsOn.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-desc">Description</Label>
        <textarea
          id="cf-desc"
          rows={3}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          {...register('description')}
        />
      </div>
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
