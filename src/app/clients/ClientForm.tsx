import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ClientInput } from '@/services/clients';

const schema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  logoUrl: z.string().trim().url('URL invalide').or(z.literal('')),
  sector: z.string().trim(),
});
type Values = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Values>;
  submitLabel: string;
  pending: boolean;
  error?: unknown;
  onSubmit: (input: ClientInput) => void;
  onCancel?: () => void;
}

export function ClientForm({ defaultValues, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', logoUrl: '', sector: '', ...defaultValues },
  });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit((v) =>
        onSubmit({ name: v.name, logoUrl: v.logoUrl || null, sector: v.sector || null }),
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="cf-name">Nom</Label>
        <Input id="cf-name" {...register('name')} aria-invalid={errors.name ? true : undefined} />
        {errors.name && (
          <p className="text-destructive text-sm" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-logo">Logo (URL)</Label>
        <Input
          id="cf-logo"
          placeholder="https://…"
          {...register('logoUrl')}
          aria-invalid={errors.logoUrl ? true : undefined}
        />
        {errors.logoUrl && (
          <p className="text-destructive text-sm" role="alert">
            {errors.logoUrl.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-sector">Secteur d'activité</Label>
        <Input id="cf-sector" {...register('sector')} />
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
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
