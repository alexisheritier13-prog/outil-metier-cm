import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
      <header className="bg-surface sticky top-0 z-sticky flex items-center justify-between gap-4 border-b px-6 py-2.5">
        <nav className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
          <span className="mr-3 text-[15px] font-semibold tracking-tight">Outil métier CM</span>
          <NavItem to="/app" end>
            Calendrier
          </NavItem>
          <NavItem to="/app/a-valider">
            À valider
            <NavBadge count={reviewCount.data} />
          </NavItem>
          <NavItem to="/app/alertes">
            Alertes
            <NavBadge count={alertCount.data} tone="danger" />
          </NavItem>
          <NavItem to="/app/demandes">
            Demandes
            <NavBadge count={requestCount.data} />
          </NavItem>
          <NavItem to="/app/clients">Clients</NavItem>
          <NavGroup
            label="Contenu"
            items={[
              { to: '/app/campagnes', label: 'Campagnes' },
              { to: '/app/idees', label: 'Idées' },
              { to: '/app/templates', label: 'Templates' },
              { to: '/app/marronniers', label: 'Marronniers' },
            ]}
          />
          {(profile?.role === 'lead' || profile?.role === 'admin') && (
            <NavItem to="/app/corbeille">Corbeille</NavItem>
          )}
          {profile?.role === 'admin' && <NavItem to="/app/parametres">Paramètres</NavItem>}
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

function NavGroup({ label, items }: { label: string; items: { to: string; label: string }[] }) {
  const { pathname } = useLocation();
  const active = items.some((i) => pathname.startsWith(i.to));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors',
            active
              ? 'bg-muted text-foreground font-medium'
              : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
          )}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) =>
              cn(
                'block rounded px-2 py-1.5 text-sm',
                isActive ? 'bg-muted font-medium' : 'hover:bg-surface-2',
              )
            }
          >
            {i.label}
          </NavLink>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function NavBadge({ count, tone }: { count?: number; tone?: 'danger' }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={cn(
        'ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums',
        tone === 'danger'
          ? 'bg-danger text-danger-foreground'
          : 'bg-foreground text-background',
      )}
    >
      {count}
    </span>
  );
}

function NavItem({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center rounded-md px-2.5 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-muted text-foreground font-medium'
            : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        )
      }
    >
      {children}
    </NavLink>
  );
}
