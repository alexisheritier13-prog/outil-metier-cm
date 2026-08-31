import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useSignOut } from '@/auth/useAuthActions';
import { listMyClients } from '@/services/portal';
import { PortalClientContext } from './PortalClientContext';
import { usePortalPendingCount } from './usePortal';

const STORE_KEY = 'portal.clientId';

function readStored(): string | null {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

export function PortalLayout() {
  const { data: profile } = useCurrentProfile();
  const signOut = useSignOut();
  const clients = useQuery({ queryKey: ['portal', 'my-clients'], queryFn: listMyClients });

  const [clientId, setClientId] = useState<string | null>(() => readStored());

  const list = clients.data ?? [];
  const active = list.find((c) => c.id === clientId) ?? list[0] ?? null;
  const pending = usePortalPendingCount(active?.id ?? null);

  useEffect(() => {
    if (active && active.id !== clientId) setClientId(active.id);
  }, [active, clientId]);

  function choose(id: string) {
    setClientId(id);
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {
      /* stockage indisponible : le choix vaut pour la session */
    }
  }

  if (clients.isLoading) return <FullPageSpinner />;

  if (list.length === 0 || !active) {
    return (
      <main className="min-h-dvh p-8">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Espace client</h1>
          <Button variant="outline" onClick={() => signOut.mutate()}>
            Déconnexion
          </Button>
        </header>
        <EmptyState
          title="Aucun client rattaché"
          description="Votre compte n'est rattaché à aucun client actif. Contactez votre agence."
        />
      </main>
    );
  }

  return (
    <PortalClientContext.Provider value={active}>
      <div className="min-h-dvh">
        <header className="bg-surface sticky top-0 z-sticky flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            {active.logoUrl ? (
              <img
                src={active.logoUrl}
                alt=""
                className="h-9 w-9 rounded-md border object-contain"
                loading="lazy"
              />
            ) : (
              <span className="bg-surface-2 grid h-9 w-9 place-items-center rounded-md border text-xs font-semibold">
                {active.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            {list.length > 1 ? (
              <select
                className="field font-medium"
                value={active.id}
                onChange={(e) => choose(e.target.value)}
                aria-label="Choisir le client"
              >
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[15px] font-semibold tracking-tight">{active.name}</span>
            )}
          </div>

          <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-2 sm:mx-0 sm:w-auto sm:px-0">
            <PortalNav to="/portail" end>
              Calendrier
            </PortalNav>
            <PortalNav to="/portail/a-valider">
              À valider
              {(pending.data ?? 0) > 0 && (
                <span className="bg-foreground text-background ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums">
                  {pending.data}
                </span>
              )}
            </PortalNav>
            <PortalNav to="/portail/publies">Publiés</PortalNav>
            <PortalNav to="/portail/briefs">Briefs</PortalNav>
          </nav>

          <div className="order-2 flex items-center gap-3 sm:order-3">
            {profile && (
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {profile.fullName || profile.email}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => signOut.mutate()}>
              Déconnexion
            </Button>
          </div>
        </header>

        <Outlet />
      </div>
    </PortalClientContext.Provider>
  );
}

function PortalNav({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'inline-flex min-h-[36px] items-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-muted font-medium'
            : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        )
      }
    >
      {children}
    </NavLink>
  );
}
