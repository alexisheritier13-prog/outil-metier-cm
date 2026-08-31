import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Page, PageHeader } from '@/components/Page';
import { UserAvatar } from '@/components/UserAvatar';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useCurrentProfile, CURRENT_PROFILE_KEY } from '@/auth/useCurrentProfile';
import { updateMyPassword, updateMyProfile } from '@/services/auth';
import type { Profile } from '@/shared/types';

export function MyAccountPage() {
  const { data: me, isLoading } = useCurrentProfile();
  if (isLoading || !me) return <FullPageSpinner />;
  return (
    <Page size="form">
      <PageHeader title="Mon compte" description={me.email} />
      <div className="space-y-6">
        <ProfileCard me={me} />
        <PasswordCard />
      </div>
    </Page>
  );
}

function ProfileCard({ me }: { me: Profile }) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(me.fullName);
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? '');

  const save = useMutation({
    mutationFn: () => updateMyProfile({ fullName, avatarUrl }),
    onSuccess: (p) => {
      qc.setQueryData(CURRENT_PROFILE_KEY, p);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const dirty = fullName !== me.fullName || avatarUrl !== (me.avatarUrl ?? '');

  return (
    <section className="surface-card p-5">
      <h2 className="text-section mb-4">Profil</h2>
      <div className="flex items-start gap-4">
        <UserAvatar name={fullName || me.email} avatarUrl={avatarUrl} size="lg" />
        <div className="grid flex-1 gap-3">
          <div className="grid gap-1 text-sm">
            <label htmlFor="ma-name" className="text-muted-foreground text-xs">
              Nom affiché
            </label>
            <Input id="ma-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid gap-1 text-sm">
            <label htmlFor="ma-avatar" className="text-muted-foreground text-xs">
              Photo de profil (URL)
            </label>
            <Input
              id="ma-avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {save.isError && <p className="text-danger-strong text-xs">L'enregistrement a échoué.</p>}
          <div>
            <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const save = useMutation({
    mutationFn: () => updateMyPassword(password),
    onSuccess: () => {
      setPassword('');
      setConfirm('');
    },
  });

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 8 && confirm === password && !save.isPending;

  return (
    <section className="surface-card p-5">
      <h2 className="text-section mb-1">Mot de passe</h2>
      <p className="text-muted-foreground mb-4 text-xs">
        Pour changer votre e-mail, demandez à un directeur.
      </p>
      <form
        className="grid max-w-sm gap-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) save.mutate();
        }}
      >
        <div className="grid gap-1 text-sm">
          <label htmlFor="ma-pw" className="text-muted-foreground text-xs">
            Nouveau mot de passe
          </label>
          <Input
            id="ma-pw"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {tooShort && <p className="text-danger-strong text-xs">Au moins 8 caractères.</p>}
        </div>
        <div className="grid gap-1 text-sm">
          <label htmlFor="ma-pw2" className="text-muted-foreground text-xs">
            Confirmation
          </label>
          <Input
            id="ma-pw2"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && (
            <p className="text-danger-strong text-xs">Les mots de passe ne correspondent pas.</p>
          )}
        </div>
        {save.isError && (
          <p className="text-danger-strong text-xs" role="alert">
            La mise à jour a échoué.
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {save.isPending ? 'Enregistrement…' : 'Changer le mot de passe'}
          </Button>
          {save.isSuccess && (
            <span
              className="text-success-strong inline-flex items-center gap-1 text-sm"
              role="status"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Modifié
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
