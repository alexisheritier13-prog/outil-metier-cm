import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    create.reset();
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button>Nouvel utilisateur</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur interne</DialogTitle>
          <DialogDescription>
            Le compte est créé sans email envoyé. Transmettez le lien affiché à la fin pour
            qu'il définisse son mot de passe.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-3">
            <p className="text-sm">Compte créé. Lien de définition du mot de passe :</p>
            <code className="bg-muted block overflow-x-auto rounded p-2 text-xs">{link}</code>
            <div className="flex justify-end">
              <Button onClick={close}>Fermer</Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              const res = await create.mutateAsync(values);
              setLink(res.actionLink ?? 'Aucun lien généré — utilisez « mot de passe oublié ».');
            })}
            noValidate
          >
            <Field label="Nom complet" error={errors.fullName?.message}>
              <Input {...register('fullName')} autoComplete="off" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register('email')} autoComplete="off" />
            </Field>
            <Field label="Rôle" error={errors.role?.message}>
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                {...register('role')}
              >
                <option value="cm">{ROLE_LABELS.cm}</option>
                <option value="lead">{ROLE_LABELS.lead}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('activate')} />
              Activer le compte immédiatement
            </label>

            {create.isError && (
              <p className="text-destructive text-sm" role="alert">
                {create.error instanceof Error ? create.error.message : 'Échec de la création.'}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Création…' : 'Créer'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
