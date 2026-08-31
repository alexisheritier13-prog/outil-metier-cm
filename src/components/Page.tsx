import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Coquille de page interne : padding et largeur homogènes. */
export function Page({
  children,
  className,
  size = 'full',
}: {
  children: ReactNode;
  className?: string;
  /** `full` = pleine largeur (calendrier, listes) ; `form` = colonne bornée (réglages). */
  size?: 'full' | 'form';
}) {
  return (
    <section
      className={cn(
        'animate-in fade-in slide-in-from-bottom-1 px-5 py-6 duration-300 ease-out sm:px-8 sm:py-8',
        size === 'form' && 'max-w-2xl',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** En-tête de page : titre + description + actions, alignés et espacés de façon constante. */
export function PageHeader({
  title,
  description,
  actions,
  aside,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Bloc d'actions aligné à droite (boutons). */
  actions?: ReactNode;
  /** Contrôles affichés à côté du titre (ex. sélecteur de vue). */
  aside?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1.5">
          <h1 className="text-title tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground max-w-[68ch] text-sm text-pretty">{description}</p>
          )}
        </div>
        {aside}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
