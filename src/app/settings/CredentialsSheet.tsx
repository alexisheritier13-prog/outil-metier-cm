import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormBody, FormField, FormFooter, FormSection, FormSheet } from '@/components/form';
import { updateUserCredentials } from '@/services/users';

/**
 * Panneau « e-mail et mot de passe » d'un compte (Admin). Applique immédiatement
 * (pas d'e-mail de confirmation) ; « Générer un lien » produit une URL de
 * définition de mot de passe à transmettre à la personne.
 */
export function CredentialsSheet({
  userId,
  currentEmail,
  personLabel,
  invalidateKeys = [],
  open,
  onOpenChange,
}: {
  userId: string | null;
  currentEmail: string;
  personLabel: string;
  invalidateKeys?: readonly (readonly unknown[])[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [link, setLink] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: (opts: { email?: string; password?: string; sendLink?: boolean }) =>
      updateUserCredentials({ userId: userId as string, ...opts }),
    onSuccess: (res, vars) => {
      if (vars.sendLink) setLink(res.actionLink);
      if (vars.email) setEmail('');
      if (vars.password) setPassword('');
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k as unknown[] }));
    },
  });

  const emailChanged = email.trim() !== '' && email.trim().toLowerCase() !== currentEmail;
  const passwordOk = password.length >= 8;

  return (
    <FormSheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setEmail('');
          setPassword('');
          setLink(null);
          run.reset();
        }
      }}
      title="E-mail et mot de passe"
      description={personLabel}
    >
      <FormBody>
        <FormSection title="Adresse e-mail">
          <FormField label="Nouvelle adresse" htmlFor="cr-email" hint={`Actuelle : ${currentEmail}`}>
            <Input
              id="cr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={currentEmail}
            />
          </FormField>
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!emailChanged || run.isPending || !userId}
              onClick={() => run.mutate({ email: email.trim() })}
            >
              Changer l'e-mail
            </Button>
          </div>
        </FormSection>

        <FormSection
          title="Mot de passe"
          description="Définit un mot de passe immédiatement, ou génère un lien à transmettre."
        >
          <FormField label="Nouveau mot de passe" htmlFor="cr-pw" hint="8 caractères minimum.">
            <Input
              id="cr-pw"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!passwordOk || run.isPending || !userId}
              onClick={() => run.mutate({ password })}
            >
              Définir ce mot de passe
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={run.isPending || !userId}
              onClick={() => run.mutate({ sendLink: true })}
            >
              Générer un lien
            </Button>
          </div>
          {link && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs">
                Lien de définition du mot de passe (à transmettre) :
              </p>
              <code className="bg-surface-2 border-border block overflow-x-auto rounded-lg border p-3 text-xs">
                {link}
              </code>
            </div>
          )}
        </FormSection>

        {run.isError && (
          <p className="text-danger-strong text-sm" role="alert">
            {run.error instanceof Error ? run.error.message : 'La mise à jour a échoué.'}
          </p>
        )}
        {run.isSuccess && !link && (
          <p className="text-success-strong text-sm" role="status">
            Enregistré.
          </p>
        )}
      </FormBody>

      <FormFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
      </FormFooter>
    </FormSheet>
  );
}
