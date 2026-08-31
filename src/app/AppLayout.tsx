import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useSignOut } from '@/auth/useAuthActions';
import { ROLE_LABELS } from '@/shared/constants/roles';
import { countReviewQueue } from '@/services/posts';
import { useOpenRequestCount } from '@/app/requests/useRequests';
import { countNewAlerts } from '@/services/alerts';

export function AppLayout() {
  const { data: profile } = useCurrentProfile();
  const signOut = useSignOut();
  const reviewCount = useQuery({
    queryKey: ['review-queue', 'count'],
    queryFn: countReviewQueue,
    enabled: Boolean(profile),
  });
  const requestCount = useOpenRequestCount(Boolean(profile));
  const alertCount = useQuery({
    queryKey: ['alerts', 'new-count'],
    queryFn: countNewAlerts,
    enabled: Boolean(profile),
  });

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-1">
          <span className="mr-4 font-semibold">Outil métier CM</span>
          <NavItem to="/app" end>
            Calendrier
          </NavItem>
          <NavItem to="/app/a-valider">
            À valider
            {(reviewCount.data ?? 0) > 0 && (
              <span className="bg-foreground text-background ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                {reviewCount.data}
              </span>
            )}
          </NavItem>
          <NavItem to="/app/alertes">
            Alertes
            {(alertCount.data ?? 0) > 0 && (
              <span className="bg-foreground text-background ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                {alertCount.data}
              </span>
            )}
          </NavItem>
          <NavItem to="/app/demandes">
            Demandes
            {(requestCount.data ?? 0) > 0 && (
              <span className="bg-foreground text-background ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                {requestCount.data}
              </span>
            )}
          </NavItem>
          <NavItem to="/app/clients">Clients</NavItem>
          <NavItem to="/app/campagnes">Campagnes</NavItem>
          <NavItem to="/app/idees">Idées</NavItem>
          <NavItem to="/app/templates">Templates</NavItem>
          <NavItem to="/app/marronniers">Marronniers</NavItem>
          {(profile?.role === 'lead' || profile?.role === 'admin') && (
            <NavItem to="/app/corbeille">Corbeille</NavItem>
          )}
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
