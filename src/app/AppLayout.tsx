import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useAccountSettings } from '@/app/account/useAccount';
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const { data: me } = useCurrentProfile();
  const account = useAccountSettings();

  useEffect(() => setDrawer(false), [pathname]);

  // Admin sur un compte non configuré → assistant de bienvenue.
  if (me?.role === 'admin' && account.data && !account.data.onboarded) {
    return <Navigate to="/bienvenue" replace />;
  }

  return (
    <div className="bg-background min-h-dvh lg:h-dvh lg:overflow-hidden lg:p-4">
      {/* Conteneur flottant unique : coins arrondis + ombre douce (desktop). */}
      <div className="bg-surface lg:shadow-panel lg:h-[calc(100dvh-2rem)] mx-auto flex min-h-dvh w-full overflow-hidden lg:min-h-0 lg:rounded-3xl lg:border">
        {/* Sidebar (desktop) */}
        <aside className="border-border hidden shrink-0 border-r lg:block">
          <AppSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-surface flex items-center gap-3 border-b px-4 py-2.5 lg:hidden">
            <button
              type="button"
              aria-label={drawer ? 'Fermer le menu' : 'Ouvrir le menu'}
              onClick={() => setDrawer((v) => !v)}
              className="hover:bg-surface-2 rounded-md p-1.5"
            >
              {drawer ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm font-semibold tracking-tight">Cadence</span>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Drawer (mobile / tablette) */}
      {drawer && (
        <div className="z-modal fixed inset-0 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="bg-foreground/30 absolute inset-0"
            onClick={() => setDrawer(false)}
          />
          <div className="animate-in slide-in-from-left absolute inset-y-0 left-0 h-full duration-200">
            <AppSidebar />
          </div>
        </div>
      )}
    </div>
  );
}
