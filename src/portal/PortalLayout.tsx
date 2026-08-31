import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useSignOut } from '@/auth/useAuthActions';
import { getAccountSettings } from '@/services/accountSettings';
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

const TABS = [
  { to: '/portail', label: 'Calendrier', end: true },
  { to: '/portail/a-valider', label: 'À valider', end: false },
  { to: '/portail/publies', label: 'Publiés', end: false },
  { to: '/portail/briefs', label: 'Briefs', end: false },
] as const;

export function PortalLayout() {
  const { data: profile } = useCurrentProfile();
  const signOut = useSignOut();
  const clients = useQuery({ queryKey: ['portal', 'my-clients'], queryFn: listMyClients });
  const account = useQuery({
    queryKey: ['account-settings'],
    queryFn: getAccountSettings,
    staleTime: 5 * 60_000,
  });
  const agencyName = account.data?.agencyName || 'Cadence';

  const [clientId, setClientId] = useState<string | null>(() => readStored());
  const [logoBroken, setLogoBroken] = useState(false);

  const list = clients.data ?? [];
  const active = list.find((c) => c.id === clientId) ?? list[0] ?? null;
  const pending = usePortalPendingCount(active?.id ?? null);

  useEffect(() => {
    if (active && active.id !== clientId) setClientId(active.id);
  }, [active, clientId]);

  useEffect(() => setLogoBroken(false), [active?.id]);

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
        <header className="mx-auto mb-8 flex max-w-3xl items-center justify-between">
          <span className="text-[15px] font-semibold tracking-tight">{agencyName}</span>
          <Button variant="outline" size="sm" onClick={() => signOut.mutate()}>
            Déconnexion
          </Button>
        </header>
        <div className="mx-auto max-w-3xl">
          <EmptyState
            title="Aucun client rattaché"
            description="Votre compte n'est rattaché à aucun client actif. Contactez votre agence."
          />
        </div>
      </main>
    );
  }

  return (
    <PortalClientContext.Provider value={active}>
      <div className="bg-background min-h-dvh">
        <header className="bg-surface sticky top-0 z-sticky border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              {active.logoUrl && !logoBroken ? (
                <img
                  src={active.logoUrl}
                  alt=""
                  onError={() => setLogoBroken(true)}
                  className="h-9 w-9 shrink-0 rounded-lg border object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="bg-primary-surface text-primary-strong grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold">
                  {active.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              {list.length > 1 ? (
                <select
                  className="field max-w-[14rem] truncate font-semibold"
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
                <span className="truncate text-[15px] font-semibold tracking-tight">
                  {active.name}
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {profile && (
                <NavLink
                  to="/portail/mon-compte"
                  className="text-muted-foreground hover:text-foreground hidden text-sm sm:inline"
                >
                  {profile.fullName || profile.email}
                </NavLink>
              )}
              <button
                type="button"
                onClick={() => signOut.mutate()}
                aria-label="Se déconnecter"
                className="text-muted-foreground hover:bg-surface-2 hover:text-foreground rounded-md p-2"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <nav className="mx-auto -mb-px flex max-w-5xl gap-1 overflow-x-auto px-3 sm:px-5">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'border-primary text-foreground font-medium'
                      : 'hover:text-foreground border-transparent text-muted-foreground',
                  )
                }
              >
                {t.label}
                {t.to === '/portail/a-valider' && (pending.data ?? 0) > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[11px] font-medium leading-5 tabular-nums">
                    {pending.data}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </header>

        <Outlet />

        <footer className="text-muted-foreground mx-auto max-w-5xl px-4 pb-8 pt-4 text-xs sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            {account.data?.agencyLogoUrl && (
              <img src={account.data.agencyLogoUrl} alt="" className="h-4 w-auto" loading="lazy" />
            )}
            Espace client — {agencyName}
          </span>
        </footer>
      </div>
    </PortalClientContext.Provider>
  );
}
