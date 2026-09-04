import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type IconType = LucideIcon;

/** Dégradé doux (même teinte, deux arrêts) pour les tuiles d'icône — un peu de relief sans sortir du système sémantique existant. */
export const ACCENT_GRADIENT = {
  primary: 'from-primary to-primary/80',
  info: 'from-info to-info/80',
  success: 'from-success to-success/80',
  warning: 'from-warning to-warning/80',
  danger: 'from-danger to-danger/80',
} as const;

export type Accent = keyof typeof ACCENT_GRADIENT;

/** En-tête (tuile d'icône + titre/sous-titre + action) suivi de sa carte de contenu. */
export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  action,
  accent = 'primary',
  className,
  bodyClassName,
  dataTour,
  children,
}: {
  icon: IconType;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  accent?: Accent;
  className?: string;
  bodyClassName?: string;
  dataTour?: string;
  children: ReactNode;
}) {
  return (
    <section data-tour={dataTour} className={cn('flex min-w-0 flex-col', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'shadow-primary grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white',
              ACCENT_GRADIENT[accent],
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-section truncate leading-tight">{title}</h2>
            {subtitle && <p className="text-muted-foreground truncate text-xs">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={cn('surface-card', bodyClassName)}>{children}</div>
    </section>
  );
}
