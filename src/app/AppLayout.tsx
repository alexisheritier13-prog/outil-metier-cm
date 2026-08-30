import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useSignOut } from '@/auth/useAuthActions';
import { ROLE_LABELS } from '@/shared/constants/roles';

export function AppLayout() {
  const { data: profile } = useCurrentProfile();
  const signOut = useSignOut();

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-1">
          <span className="mr-4 font-semibold">Outil métier CM</span>
          <NavItem to="/app" end>
            Calendrier
          </NavItem>
          <NavItem to="/app/clients">Clients</NavItem>
          <NavItem to="/app/campagnes">Campagnes</NavItem>
          {profile?.role === 'admin' && (
            <NavItem to="/app/parametres/utilisateurs">Utilisateurs</NavItem>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-muted-foreground text-sm">
              {profile.fullName || profile.email} · {ROLE_LABELS[profile.role]}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => signOut.mutate()}>
            Déconnexion
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function NavItem({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded px-3 py-1.5 text-sm',
          isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {children}
    </NavLink>
  );
}
