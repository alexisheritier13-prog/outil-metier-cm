import { Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ACCENT_GRADIENT, type Accent, type IconType } from './SectionCard';

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
const TONE_GRADIENT = {
  danger: 'from-danger to-danger/80',
  warning: 'from-warning to-warning/80',
} as const;

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
        'surface-card group relative flex items-center gap-3 p-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
        tone && TONE_CARD[tone],
      )}
    >
      <Maximize2
        className="text-muted-foreground/50 group-hover:text-muted-foreground absolute right-3 top-3 h-3.5 w-3.5 transition-colors"
        aria-hidden="true"
      />
      <span
        className={cn(
          'shadow-primary grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white',
          tone ? TONE_GRADIENT[tone] : ACCENT_GRADIENT[accent],
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        {loading ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span className="block text-[1.6875rem] font-extrabold leading-none tabular-nums tracking-tight">
            {value ?? 0}
          </span>
        )}
        <span
          className={cn('mt-1 block truncate text-xs font-medium', tone ? TONE_TEXT[tone] : 'text-muted-foreground')}
        >
          {label}
        </span>
        {context && (
          <span className="text-muted-foreground/80 mt-0.5 block truncate text-[11px]">{context}</span>
        )}
      </span>
    </Link>
  );
}
