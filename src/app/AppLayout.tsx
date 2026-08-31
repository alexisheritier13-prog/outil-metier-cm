import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setDrawer(false), [pathname]);

  return (
    <div className="bg-background flex min-h-dvh">
      {/* Sidebar fixe (desktop) */}
      <aside className="sticky top-0 hidden h-dvh lg:block">
        <AppSidebar />
      </aside>

      {/* Drawer (mobile / tablette) */}
      {drawer && (
        <div className="fixed inset-0 z-modal lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setDrawer(false)}
          />
          <div className="animate-in slide-in-from-left absolute inset-y-0 left-0 h-full duration-200">
            <AppSidebar />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-surface-2 flex items-center gap-3 border-b px-4 py-2.5 lg:hidden">
          <button
            type="button"
            aria-label={drawer ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setDrawer((v) => !v)}
            className="hover:bg-surface-3 rounded-md p-1.5"
          >
            {drawer ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-sm font-semibold tracking-tight">Outil métier CM</span>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
