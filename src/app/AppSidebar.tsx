import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  LayoutGrid,
  Library,
  LifeBuoy,
  ListChecks,
  LogOut,
  Search,
  Settings,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { openGlobalSearch } from '@/lib/appShortcuts';
import { UserAvatar } from '@/components/UserAvatar';
import { NotificationBell } from '@/components/NotificationBell';
import { FeedbackButton } from '@/components/FeedbackButton';
import type { AppNotification } from '@/shared/types';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useIsPlatformAdmin } from '@/app/platform/usePlatform';
import { useSignOut } from '@/auth/useAuthActions';
import { ROLE_LABELS } from '@/shared/constants/roles';
import { countReviewQueue } from '@/services/posts';
import { countNewAlerts } from '@/services/alerts';
import { useOpenRequestCount } from '@/app/requests/useRequests';

function hrefForInternal(n: AppNotification): string {
  if (n.type === 'job_failed') return '/app/parametres/jobs';
  if (n.postId) return `/app/planning?post=${n.postId}`;
  return '/app';
}

/** Barre latérale de l'espace agence. */
export function AppSidebar() {
  const { data: profile } = useCurrentProfile();
  const { data: isPlatformAdmin } = useIsPlatformAdmin();
  const signOut = useSignOut();
  const isManager = profile?.role === 'lead' || profile?.role === 'admin';

  const reviewCount = useQuery({
    queryKey: ['review-queue', 'count'],
    queryFn: countReviewQueue,
    enabled: Boolean(profile),
  });
  const alertCount = useQuery({
    queryKey: ['alerts', 'new-count'],
    queryFn: countNewAlerts,
    enabled: Boolean(profile),
  });
  const requestCount = useOpenRequestCount(Boolean(profile));

  return (
    <div className="bg-surface flex h-full w-[248px] shrink-0 flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
        <span className="flex-1 text-[15px] font-semibold tracking-tight">Cadence</span>
        <NotificationBell hrefFor={hrefForInternal} align="start" />
      </div>

      <div className="px-3 pb-1 pt-2">
        <button
          type="button"
          onClick={openGlobalSearch}
          className="border-border bg-surface-2/60 text-muted-foreground hover:bg-surface-2 hover:text-foreground flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Rechercher</span>
          <kbd className="border-border bg-surface text-muted-foreground rounded border px-1 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        <Item to="/app" end icon={LayoutGrid}>
          Accueil
        </Item>
        <Item to="/app/planning" icon={CalendarDays} dataTour="nav-planning">
          Planning
        </Item>

        <Group
          label="Validation"
          icon={ListChecks}
          match={['/app/a-valider', '/app/demandes']}
          dataTour="nav-validation"
        >
          <SubItem to="/app/a-valider" badge={reviewCount.data}>
            À valider
          </SubItem>
          <SubItem to="/app/demandes" badge={requestCount.data}>
            Demandes clients
          </SubItem>
        </Group>

        <Item to="/app/clients" icon={Users} dataTour="nav-clients">
          Clients
        </Item>

        <Group
          label="Bibliothèque"
          icon={Library}
          match={['/app/idees', '/app/templates', '/app/marronniers', '/app/campagnes']}
          dataTour="nav-library"
        >
          <SubItem to="/app/idees">Idées</SubItem>
          <SubItem to="/app/templates">Templates</SubItem>
          <SubItem to="/app/marronniers">Marronniers</SubItem>
          <SubItem to="/app/campagnes">Campagnes</SubItem>
        </Group>

        <Item
          to="/app/alertes"
          icon={Bell}
          badge={alertCount.data}
          badgeTone="danger"
          dataTour="nav-alerts"
        >
          Alertes
        </Item>
      </nav>

      <div className="border-border/70 space-y-1 border-t px-3 py-3">
        {isManager && (
          <Item to="/app/corbeille" icon={Trash2}>
            Corbeille
          </Item>
        )}
        {profile?.role === 'admin' && (
          <Item to="/app/parametres" icon={Settings}>
            Paramètres
          </Item>
        )}
        {isPlatformAdmin && (
          <Item to="/app/plateforme" icon={Shield}>
            Admin plateforme
          </Item>
        )}
        <Item to="/app/aide" icon={LifeBuoy} dataTour="nav-help">
          Aide
        </Item>
        <FeedbackButton />
      </div>

      <div className="border-border/70 bg-surface shadow-xs m-3 mt-0 flex items-center gap-2.5 rounded-xl border p-2.5">
        <NavLink
          to="/app/mon-compte"
          className="hover:bg-surface-2 -m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-colors"
        >
          <UserAvatar
            name={profile?.fullName || profile?.email || '?'}
            avatarUrl={profile?.avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {profile?.fullName || profile?.email}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {profile && ROLE_LABELS[profile.role]}
            </p>
          </div>
        </NavLink>
        <button
          type="button"
          onClick={() => signOut.mutate()}
          aria-label="Se déconnecter"
          className="text-muted-foreground hover:bg-surface-2 hover:text-foreground rounded-md p-1.5 transition-colors"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

type IconType = typeof Bell;

function itemClass(active: boolean) {
  return cn(
    'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.9rem] font-medium transition-colors duration-150',
    active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
  );
}

function Item({
  to,
  end,
  icon: Icon,
  children,
  badge,
  badgeTone,
  dataTour,
}: {
  to: string;
  end?: boolean;
  icon: IconType;
  children: ReactNode;
  badge?: number;
  badgeTone?: 'danger';
  dataTour?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-tour={dataTour}
      className={({ isActive }) => itemClass(isActive)}
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('h-5 w-5 shrink-0', !isActive && 'text-muted-foreground')}
            aria-hidden="true"
            strokeWidth={2}
          />
          <span className="flex-1 truncate">{children}</span>
          <CountBadge value={badge} tone={badgeTone} onDark={isActive} />
        </>
      )}
    </NavLink>
  );
}

function Group({
  label,
  icon: Icon,
  match,
  children,
  dataTour,
}: {
  label: string;
  icon: IconType;
  match: string[];
  children: ReactNode;
  dataTour?: string;
}) {
  const { pathname } = useLocation();
  const containsActive = match.some((m) => pathname.startsWith(m));
  const [open, setOpen] = useState(containsActive);

  return (
    <div data-tour={dataTour}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.9rem] font-medium transition-colors',
          containsActive && !open
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        )}
        aria-expanded={open}
      >
        <Icon className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden="true" strokeWidth={2} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight
          className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-1 space-y-1 pl-4">{children}</div>}
    </div>
  );
}

function SubItem({
  to,
  children,
  badge,
}: {
  to: string;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg py-2.5 pl-3.5 pr-2 text-[0.9rem] transition-colors',
          isActive
            ? 'bg-primary-surface text-primary-strong font-medium'
            : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              isActive ? 'bg-primary' : 'bg-muted-foreground/50',
            )}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{children}</span>
          <CountBadge value={badge} />
        </>
      )}
    </NavLink>
  );
}

function CountBadge({
  value,
  tone,
  onDark,
}: {
  value?: number;
  tone?: 'danger';
  onDark?: boolean;
}) {
  if (!value || value <= 0) return null;
  return (
    <span
      className={cn(
        'min-w-[1.25rem] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums leading-5',
        tone === 'danger'
          ? 'bg-danger text-danger-foreground'
          : onDark
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-primary-surface text-primary-strong',
      )}
    >
      {value}
    </span>
  );
}
