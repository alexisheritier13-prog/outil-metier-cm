import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useAccountSettings } from '@/app/account/useAccount';
import { GlobalSearch } from '@/components/GlobalSearch';
import { OnboardingHost } from '@/onboarding/OnboardingHost';
import { useGlobalShortcuts } from '@/lib/appShortcuts';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';

export function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const { data: me } = useCurrentProfile();
  const account = useAccountSettings();

  useGlobalShortcuts();
  useEffect(() => setDrawer(false), [pathname]);

  // Admin sur un compte non configuré → assistant de bienvenue.
  if (me?.role === 'admin' && account.data && !account.data.onboarded) {
    return <Navigate to="/bienvenue" replace />;
  }

  return (
    <div className="bg-background min-h-dvh lg:h-dvh lg:overflow-hidden">
      <div className="flex min-h-dvh w-full gap-5 p-4 lg:h-dvh lg:overflow-hidden">
        {/* Sidebar : panneau blanc flottant, sticky (desktop) */}
        <aside className="hidden shrink-0 lg:block">
          <div className="bg-surface shadow-panel sticky top-4 h-[calc(100dvh-2rem)] w-[248px] overflow-hidden rounded-3xl">
            <AppSidebar />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:h-full lg:overflow-hidden lg:py-0">
          <AppTopBar drawerOpen={drawer} onToggleDrawer={() => setDrawer((v) => !v)} />

          <main className="min-w-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      <GlobalSearch />
      <OnboardingHost />

      {/* Drawer (mobile / tablette) */}
      {drawer && (
        <div className="z-modal fixed inset-0 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="bg-foreground/30 absolute inset-0"
            onClick={() => setDrawer(false)}
          />
          <div className="animate-in slide-in-from-left absolute inset-y-0 left-0 h-full w-[280px] p-3 duration-200">
            <div className="bg-surface shadow-panel h-full w-full overflow-hidden rounded-3xl">
              <AppSidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
