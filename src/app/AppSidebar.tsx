import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  Inbox,
  LayoutGrid,
  Library,
  LifeBuoy,
  ListChecks,
  LogOut,
  Megaphone,
  MessageSquareText,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useSignOut } from '@/auth/useAuthActions';
import { ROLE_LABELS } from '@/shared/constants/roles';
import { countReviewQueue } from '@/services/posts';
import { countNewAlerts } from '@/services/alerts';
import { useOpenRequestCount } from '@/app/requests/useRequests';

/** Barre latérale de l'espace agence. */
export function AppSidebar() {
  const { data: profile } = useCurrentProfile();
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
    <div className="bg-surface-2 flex h-full w-60 shrink-0 flex-col border-r">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <span className="bg-primary text-primary-foreground grid h-7 w-7 place-items-center rounded-lg text-xs font-bold">
          CM
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Outil métier CM</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
        <Item to="/app" end icon={LayoutGrid}>
          Accueil
        </Item>
        <Item to="/app/planning" icon={CalendarDays}>
          Planning
        </Item>

        <Group label="Validation" icon={ListChecks} match={['/app/a-valider', '/app/demandes']}>
          <SubItem to="/app/a-valider" icon={Inbox} badge={reviewCount.data}>
            À valider
          </SubItem>
          <SubItem to="/app/demandes" icon={MessageSquareText} badge={requestCount.data}>
            Demandes clients
          </SubItem>
        </Group>

        <Item to="/app/clients" icon={Users}>
          Clients
        </Item>

        <Group
          label="Bibliothèque"
          icon={Library}
          match={['/app/idees', '/app/templates', '/app/marronniers', '/app/campagnes']}
        >
          <SubItem to="/app/idees" icon={Sparkles}>
            Idées
          </SubItem>
          <SubItem to="/app/templates" icon={FileText}>
            Templates
          </SubItem>
          <SubItem to="/app/marronniers" icon={CalendarDays}>
            Marronniers
          </SubItem>
          <SubItem to="/app/campagnes" icon={Megaphone}>
            Campagnes
          </SubItem>
        </Group>

        <Item to="/app/alertes" icon={Bell} badge={alertCount.data} badgeTone="danger">
          Alertes
        </Item>
      </nav>

      <div className="space-y-0.5 border-t px-2.5 py-3">
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
        <a
          href="mailto:support@example.test"
          className="text-muted-foreground hover:bg-surface-3 hover:text-foreground flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm"
        >
          <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden="true" />
          Aide
        </a>
      </div>

      <div className="flex items-center gap-2.5 border-t px-3 py-3">
        <span className="bg-primary-surface text-primary-strong grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold">
          {(profile?.fullName || profile?.email || '?').slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{profile?.fullName || profile?.email}</p>
          <p className="text-muted-foreground truncate text-xs">
            {profile && ROLE_LABELS[profile.role]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut.mutate()}
          aria-label="Se déconnecter"
          className="text-muted-foreground hover:bg-surface-3 hover:text-foreground rounded-md p-1.5"
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
    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
    active
      ? 'bg-background text-foreground shadow-card font-medium'
      : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
  );
}

function Item({
  to,
  end,
  icon: Icon,
  children,
  badge,
  badgeTone,
}: {
  to: string;
  end?: boolean;
  icon: IconType;
  children: ReactNode;
  badge?: number;
  badgeTone?: 'danger';
}) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => itemClass(isActive)}>
      {({ isActive }) => (
        <>
          <Icon
            className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{children}</span>
          <CountBadge value={badge} tone={badgeTone} />
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
}: {
  label: string;
  icon: IconType;
  match: string[];
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const containsActive = match.some((m) => pathname.startsWith(m));
  const [open, setOpen] = useState(containsActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
          containsActive && !open
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
        )}
        aria-expanded={open}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-0.5 space-y-0.5 pl-3.5">{children}</div>}
    </div>
  );
}

function SubItem({
  to,
  icon: Icon,
  children,
  badge,
}: {
  to: string;
  icon: IconType;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md py-1.5 pl-2.5 pr-2 text-sm transition-colors',
          isActive
            ? 'bg-background text-foreground shadow-card font-medium'
            : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} aria-hidden="true" />
          <span className="flex-1 truncate">{children}</span>
          <CountBadge value={badge} />
        </>
      )}
    </NavLink>
  );
}

function CountBadge({ value, tone }: { value?: number; tone?: 'danger' }) {
  if (!value || value <= 0) return null;
  return (
    <span
      className={cn(
        'rounded-full px-1.5 text-[11px] font-medium tabular-nums leading-5',
        tone === 'danger' ? 'bg-danger text-danger-foreground' : 'bg-surface-3 text-muted-foreground',
      )}
    >
      {value}
    </span>
  );
}
