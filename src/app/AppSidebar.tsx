import type { ReactNode } from 'react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AudioWaveform,
  Bell,
  CalendarDays,
  CalendarHeart,
  ChevronRight,
  LayoutGrid,
  Library,
  LifeBuoy,
  ListChecks,
  LogOut,
  Settings,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { FeedbackButton } from '@/components/FeedbackButton';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useIsPlatformAdmin } from '@/app/platform/usePlatform';
import { useSignOut } from '@/auth/useAuthActions';
import { ROLE_LABELS } from '@/shared/constants/roles';
import { countReviewQueue } from '@/services/posts';
import { countNewAlerts } from '@/services/alerts';
import { countUnattachedKeyDatesThisMonth } from '@/services/keyDates';
import { useOpenRequestCount } from '@/app/requests/useRequests';

/** Barre latérale de l'espace agence : panneau flottant, navigation groupée. */
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
  const unattachedKeyDates = useQuery({
    queryKey: ['key-dates', 'unattached-this-month'],
    queryFn: countUnattachedKeyDatesThisMonth,
    enabled: Boolean(profile),
  });
  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <span className="bg-primary text-primary-foreground grid h-8 w-8 shrink-0 place-items-center rounded-xl">
          <AudioWaveform className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={2.25} />
        </span>
        <span className="flex-1 text-[15px] font-bold tracking-tight">Cadence</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <SectionLabel>Pilotage</SectionLabel>
        <Item to="/app" end icon={LayoutGrid}>
          Accueil
        </Item>
        <Item to="/app/planning" icon={CalendarDays} dataTour="nav-planning">
          Planning
        </Item>

        <ValidationSection reviewCount={reviewCount.data} requestCount={requestCount.data} />

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

        <SectionLabel>Espace</SectionLabel>
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
      </nav>

      {Boolean(unattachedKeyDates.data) && (
        <div className="mx-3 mt-2 space-y-2.5 rounded-2xl bg-gradient-to-br from-primary to-primary-strong p-4 text-primary-foreground">
          <span className="bg-primary-foreground/15 grid h-8 w-8 place-items-center rounded-lg">
            <CalendarHeart className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold leading-snug">
            {unattachedKeyDates.data} marronnier{(unattachedKeyDates.data ?? 0) > 1 ? 's' : ''} en{' '}
            {monthLabel}
          </p>
          <p className="text-primary-foreground/80 text-xs leading-snug">
            Pas encore rattaché{(unattachedKeyDates.data ?? 0) > 1 ? 's' : ''} à un post.
          </p>
          <NavLink
            to="/app/planning"
            className="bg-surface text-foreground hover:bg-surface-2 block rounded-lg py-2 text-center text-sm font-medium transition-colors"
          >
            Voir le calendrier
          </NavLink>
        </div>
      )}

      <div className="m-3 mt-2 flex items-center gap-2.5 rounded-2xl p-2.5">
        <NavLink
          to="/app/mon-compte"
          className="hover:bg-surface-2 -m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 transition-colors"
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
          className="text-muted-foreground hover:bg-surface-2 hover:text-foreground rounded-lg p-1.5 transition-colors"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-label-foreground px-3.5 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-wider first:pt-1">
      {children}
    </p>
  );
}

type IconType = typeof Bell;

function itemClass(active: boolean) {
  return cn(
    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9rem] font-medium transition-colors duration-150',
    active
      ? 'bg-primary text-primary-foreground shadow-primary'
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

/**
 * Groupe « Validation » : toujours déplié (pas de repli), sous-items décalés
 * reliés par un filet vertical, précédés d'une pastille de la couleur du
 * statut qu'ils représentent.
 */
function ValidationSection({
  reviewCount,
  requestCount,
}: {
  reviewCount?: number;
  requestCount?: number;
}) {
  return (
    <div>
      <div className="text-muted-foreground flex items-center gap-3 px-3.5 py-2.5 text-[0.9rem] font-medium">
        <ListChecks className="h-5 w-5 shrink-0" aria-hidden="true" strokeWidth={2} />
        <span className="flex-1 text-left">Validation</span>
      </div>
      <div className="border-border ml-[0.65rem] space-y-1 border-l pb-1 pl-3">
        <SubItem to="/app/a-valider" dot="info" badge={reviewCount}>
          À valider
        </SubItem>
        <SubItem to="/app/demandes" dot="warning" badge={requestCount}>
          Demandes clients
        </SubItem>
      </div>
    </div>
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
          'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9rem] font-medium transition-colors',
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
      {open && (
        <div className="border-border ml-[0.65rem] mt-1 space-y-1 border-l pl-3">{children}</div>
      )}
    </div>
  );
}

const DOT_COLOR = {
  neutral: 'bg-muted-foreground/50',
  info: 'bg-info',
  warning: 'bg-warning',
} as const;

function SubItem({
  to,
  children,
  badge,
  dot = 'neutral',
}: {
  to: string;
  children: ReactNode;
  badge?: number;
  /** Couleur du statut représenté — reste affichée que l'item soit actif ou non. */
  dot?: keyof typeof DOT_COLOR;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-xl py-2.5 pl-2.5 pr-2 text-[0.9rem] transition-colors',
          isActive
            ? 'bg-primary-surface text-primary-strong font-medium'
            : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        )
      }
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_COLOR[dot])} aria-hidden="true" />
      <span className="flex-1 truncate">{children}</span>
      <CountBadge value={badge} />
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
          ? 'bg-danger-surface text-danger-strong'
          : onDark
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-primary-surface text-primary-strong',
      )}
    >
      {value}
    </span>
  );
}
