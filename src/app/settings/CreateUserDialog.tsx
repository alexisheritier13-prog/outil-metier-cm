import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormBody,
  FormField,
  FormFooter,
  FormSection,
  FormSheet,
  selectClass,
} from '@/components/form';
import { ROLE_LABELS } from '@/shared/constants/roles';
import { useCreateUser } from './useUsersAdmin';

const schema = z.object({
  fullName: z.string().min(1, 'Nom requis'),
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  role: z.enum(['cm', 'lead', 'admin']),
  activate: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const create = useCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'cm', activate: true },
  });

  function close() {
    setOpen(false);
    setLink(null);
    setEmailed(false);
    create.reset();
    reset();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nouvel utilisateur</Button>
      <FormSheet
        open={open}
        onOpenChange={(v) => (v ? setOpen(true) : close())}
        title="Nouvel utilisateur interne"
        description="Le compte est créé sans email. Transmettez le lien affiché à la fin pour qu'il définisse son mot de passe."
      >
        {link ? (
          <>
            <FormBody>
              <p className="text-sm">
                Compte créé.
                {emailed
                  ? ' Un e-mail avec le lien d’accès a été envoyé.'
                  : ' Lien de définition du mot de passe à transmettre :'}
              </p>
              <code className="bg-surface-2 border-border block overflow-x-auto rounded-lg border p-3 text-xs">
                {link}
              </code>
            </FormBody>
            <FormFooter>
              <Button onClick={close}>Fermer</Button>
            </FormFooter>
          </>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit(async (values) => {
              const res = await create.mutateAsync(values);
              setEmailed(Boolean(res.emailed));
              setLink(res.actionLink ?? 'Aucun lien généré — utilisez « mot de passe oublié ».');
            })}
            noValidate
          >
            <FormBody>
              <FormSection title="Identité">
                <FormField label="Nom complet" htmlFor="cu-name" error={errors.fullName?.message}>
                  <Input id="cu-name" {...register('fullName')} autoComplete="off" />
                </FormField>
                <FormField label="Email" htmlFor="cu-email" error={errors.email?.message}>
                  <Input id="cu-email" type="email" {...register('email')} autoComplete="off" />
                </FormField>
              </FormSection>

              <FormSection title="Accès">
                <FormField label="Rôle" htmlFor="cu-role" error={errors.role?.message}>
                  <select id="cu-role" className={selectClass} {...register('role')}>
                    <option value="cm">{ROLE_LABELS.cm}</option>
                    <option value="lead">{ROLE_LABELS.lead}</option>
                    <option value="admin">{ROLE_LABELS.admin}</option>
                  </select>
                </FormField>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-primary h-4 w-4" {...register('activate')} />
                  Activer le compte immédiatement
                </label>
              </FormSection>

              {create.isError && (
                <p className="text-destructive text-sm" role="alert">
                  {create.error instanceof Error ? create.error.message : 'Échec de la création.'}
                </p>
              )}
            </FormBody>

            <FormFooter>
              <Button type="button" variant="ghost" onClick={close}>
                Annuler
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Création…' : "Créer l'utilisateur"}
              </Button>
            </FormFooter>
          </form>
        )}
      </FormSheet>
    </>
  );
}
