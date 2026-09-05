import { Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Accent, IconType } from './SectionCard';

const TONE_CARD = {
  danger: 'ring-danger-border bg-danger-surface ring-1',
  warning: 'ring-warning-border bg-warning-surface ring-1',
} as const;
const TONE_TEXT = {
  danger: 'text-danger-strong',
  warning: 'text-warning-strong',
} as const;
// Classes Tailwind écrites en toutes lettres (une classe interpolée à l'exécution
// ne serait pas détectée par le scan JIT).
const TONE_ICON_TILE = {
  danger: 'bg-danger-surface text-danger-strong',
  warning: 'bg-warning-surface text-warning-strong',
} as const;
/** Tuile d'icône en pastille ronde teintée (pas de dégradé plein) — cohérent
 *  avec les pastilles de statut/réseau utilisées ailleurs sur l'Accueil. */
const ACCENT_ICON_TILE: Record<Accent, string> = {
  primary: 'bg-primary-surface text-primary-strong',
  info: 'bg-info-surface text-info-strong',
  success: 'bg-success-surface text-success-strong',
  warning: 'bg-warning-surface text-warning-strong',
  danger: 'bg-danger-surface text-danger-strong',
};

export function KpiCard({
  to,
  icon: Icon,
  label,
  value,
  loading,
  accent = 'primary',
  tone,
  context,
}: {
  to: string;
  icon: IconType;
  label: string;
  value?: number;
  loading?: boolean;
  accent?: Accent;
  tone?: 'danger' | 'warning';
  /** Ligne de contexte réelle (ex. « le plus ancien : il y a 3 j »), jamais un chiffre inventé. */
  context?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'surface-card group relative flex flex-col gap-[11px] rounded-[20px] p-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
        tone && TONE_CARD[tone],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-foreground truncate text-[13px] font-semibold">{label}</span>
        <Maximize2
          className="text-muted-foreground/50 group-hover:text-muted-foreground h-3.5 w-3.5 shrink-0 transition-colors"
          aria-hidden="true"
        />
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-full',
            tone ? TONE_ICON_TILE[tone] : ACCENT_ICON_TILE[accent],
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        {loading ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span
            className={cn(
              'block text-[27px] font-extrabold leading-none tabular-nums tracking-tight',
              accent === 'danger' && 'text-danger-strong',
            )}
          >
            {value ?? 0}
          </span>
        )}
      </div>

      {context && (
        <span
          className={cn(
            'truncate text-[12.5px]',
            tone ? TONE_TEXT[tone] : 'text-muted-foreground',
          )}
        >
          {context}
        </span>
      )}
    </Link>
  );
}
