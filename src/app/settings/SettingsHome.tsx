import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';

const LINKS = [
  { to: '/app/parametres/utilisateurs', label: 'Utilisateurs', desc: 'Comptes internes, rôles, clients assignés.' },
  { to: '/app/parametres/alertes', label: 'Seuils des alertes', desc: 'Réglage du moteur de détection.' },
  { to: '/app/parametres/jobs', label: 'Tâches planifiées', desc: 'Journal des jobs (alertes, purge).' },
];

export function SettingsHome() {
  const { data: me } = useCurrentProfile();
  if (!me || me.role !== 'admin') return null;

  return (
    <section className="max-w-xl p-6">
      <h1 className="text-title mb-4">Paramètres</h1>
      <ul className="divide-y rounded-md border">
        {LINKS.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              className={({ isActive }) =>
                cn('block p-3 text-sm hover:bg-surface-2/60', isActive && 'bg-muted')
              }
            >
              <span className="font-medium">{l.label}</span>
              <span className="text-muted-foreground block text-xs">{l.desc}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
