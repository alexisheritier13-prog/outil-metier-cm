import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { Page, PageHeader } from '@/components/Page';

const LINKS = [
  {
    to: '/app/parametres/compte',
    label: 'Compte',
    desc: 'Organisation, réseaux proposés, nom et logo dans l’espace client.',
  },
  {
    to: '/app/parametres/utilisateurs',
    label: 'Utilisateurs',
    desc: 'Comptes internes, rôles, e-mail et mot de passe, clients assignés.',
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
