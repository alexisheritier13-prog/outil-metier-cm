import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormBody, FormField, FormFooter, FormSection } from '@/components/form';
import { ImageUploadField } from '@/components/ImageUploadField';
import type { ClientInput } from '@/services/clients';

const schema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  logoUrl: z.string().trim(),
  sector: z.string().trim(),
  skipClientReview: z.boolean(),
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      logoUrl: '',
      sector: '',
      skipClientReview: false,
      ...defaultValues,
    },
  });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={handleSubmit((v) =>
        onSubmit({
          name: v.name,
          logoUrl: v.logoUrl || null,
          sector: v.sector || null,
          skipClientReview: v.skipClientReview,
        }),
      )}
    >
      <FormBody>
        <FormSection title="Identité">
          <FormField label="Nom" htmlFor="cf-name" error={errors.name?.message}>
            <Input id="cf-name" {...register('name')} aria-invalid={errors.name ? true : undefined} />
          </FormField>
          <FormField label="Secteur d'activité" htmlFor="cf-sector">
            <Input id="cf-sector" placeholder="Restauration, mode, immobilier…" {...register('sector')} />
          </FormField>
          <ImageUploadField
            label="Logo"
            hint="Affiché sur la fiche, dans les listes et dans l'espace client."
            folder="clients"
            value={watch('logoUrl')}
            onChange={(url) => setValue('logoUrl', url, { shouldDirty: true })}
          />
        </FormSection>

        <FormSection title="Circuit de validation">
          <label className="border-border bg-surface-2/60 flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 h-4 w-4"
              {...register('skipClientReview')}
            />
            <span>
              <span className="font-medium">Ce client ne valide pas les posts</span>
              <span className="text-muted-foreground block text-xs">
                L'étape « à valider client » est sautée : un rôle interne passe le post directement
                en validé. Le mode « CM seul » (Paramètres → Circuit de validation) fait de même pour
                la validation interne, sur toute l'agence.
              </span>
            </span>
          </label>
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
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : submitLabel}
        </Button>
      </FormFooter>
    </form>
  );
}
