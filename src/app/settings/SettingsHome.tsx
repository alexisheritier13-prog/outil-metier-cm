import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentProfile, CURRENT_PROFILE_KEY } from '@/auth/useCurrentProfile';
import { updateMyProfile } from '@/services/auth';
import type { Profile } from '@/shared/types';
import { Page, PageHeader } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';

const LINKS = [
  {
    to: '/app/parametres/compte',
    label: 'Compte',
    desc: 'Organisation, réseaux proposés, nom et logo dans l’espace client.',
  },
  {
    to: '/app/parametres/utilisateurs',
    label: 'Utilisateurs',
    desc: 'Comptes internes, rôles, clients assignés.',
  },
  {
    to: '/app/parametres/workflow',
    label: 'Circuit de validation',
    desc: 'Mode « CM seul » : validation interne optionnelle.',
  },
  {
    to: '/app/parametres/alertes',
    label: 'Seuils des alertes',
    desc: 'Réglage du moteur de détection.',
  },
  {
    to: '/app/parametres/jobs',
    label: 'Tâches planifiées',
    desc: 'Journal des jobs (alertes, purge).',
  },
];

export function SettingsHome() {
  const { data: me } = useCurrentProfile();
  if (!me || me.role !== 'admin') return null;
  return (
    <Page size="form">
      <PageHeader title="Paramètres" />
      <MyProfileCard me={me} />
      <ul className="surface-card divide-y overflow-hidden">
        {LINKS.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              className="hover:bg-surface-2/60 flex items-center justify-between gap-3 p-3.5 text-sm"
            >
              <span>
                <span className="font-medium">{l.label}</span>
                <span className="text-muted-foreground block text-xs">{l.desc}</span>
              </span>
              <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
            </NavLink>
          </li>
        ))}
      </ul>
    </Page>
  );
}

function MyProfileCard({ me }: { me: Profile }) {
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
    <section className="surface-card mb-6 p-5">
      <h2 className="text-section mb-4">Mon profil</h2>
      <div className="flex items-start gap-4">
        <UserAvatar name={fullName || me.email} avatarUrl={avatarUrl} size="lg" />
        <div className="grid flex-1 gap-3">
          <div className="grid gap-1 text-sm">
            <label htmlFor="profile-name" className="text-muted-foreground text-xs">
              Nom affiché
            </label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-1 text-sm">
            <label htmlFor="profile-avatar" className="text-muted-foreground text-xs">
              Photo de profil (URL)
            </label>
            <Input
              id="profile-avatar"
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
