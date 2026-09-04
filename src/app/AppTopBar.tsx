import { Menu, Search, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { openGlobalSearch } from '@/lib/appShortcuts';
import { UserAvatar } from '@/components/UserAvatar';
import { NotificationBell } from '@/components/NotificationBell';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import type { AppNotification } from '@/shared/types';

function hrefForInternal(n: AppNotification): string {
  if (n.type === 'job_failed') return '/app/parametres/jobs';
  if (n.postId) return `/app/planning?post=${n.postId}`;
  return '/app';
}

/**
 * Barre persistante au-dessus du contenu (agence). Recherche globale + cloche +
 * avatar — auparavant logés dans la sidebar, désormais accessibles depuis
 * n'importe quel écran sans agrandir la sidebar. Sur mobile, porte aussi le
 * déclencheur du tiroir de navigation.
 */
export function AppTopBar({
  drawerOpen,
  onToggleDrawer,
}: {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}) {
  const { data: profile } = useCurrentProfile();

  return (
    <div className="flex h-11 shrink-0 items-center gap-3">
      <button
        type="button"
        aria-label={drawerOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        onClick={onToggleDrawer}
        className="border-border bg-surface hover:bg-surface-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl border lg:hidden"
      >
        {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <button
        type="button"
        onClick={openGlobalSearch}
        className="border-border bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-4 text-sm shadow-xs transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-left">Rechercher un post, un client, une idée…</span>
        <kbd className="border-border bg-surface-2 text-muted-foreground hidden shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="border-border bg-surface flex h-11 shrink-0 items-center gap-1 rounded-xl border px-1 shadow-xs">
        <NotificationBell hrefFor={hrefForInternal} align="end" />
      </div>

      <NavLink
        to="/app/mon-compte"
        aria-label="Mon compte"
        className="shrink-0"
      >
        <UserAvatar
          name={profile?.fullName || profile?.email || '?'}
          avatarUrl={profile?.avatarUrl}
          size="md"
        />
      </NavLink>
    </div>
  );
}
