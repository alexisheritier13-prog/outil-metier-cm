import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Panneau latéral pour un formulaire de création / édition. Le `children` est le
 * `<form>` lui-même : il doit être en `flex min-h-0 flex-1 flex-col`, avec un
 * corps `flex-1 overflow-y-auto` (utiliser `<FormBody>`) et un pied `<FormFooter>`.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  wide,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('gap-0 p-0', wide && 'sm:max-w-[560px]')}>
        <div className="bg-surface flex items-start justify-between gap-3 border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-title">{title}</SheetTitle>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fermer" className="-mr-1 -mt-1">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Corps défilant d'un formulaire en panneau. Fond « sol » teinté (`surface-2`) sur
 * lequel flottent les `<FormSection>` blancs — différenciation de couche.
 */
export function FormBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-2 flex-1 space-y-3.5 overflow-y-auto px-5 py-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Pied collant : actions alignées à droite. Blanc, pour trancher avec le corps teinté. */
export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="border-border bg-surface relative flex items-center justify-end gap-2 border-t px-5 py-3.5 shadow-[0_-10px_24px_-16px_oklch(0.42_0.04_262/0.18)]">
      {children}
    </div>
  );
}

/**
 * Groupe de champs présenté comme une carte blanche posée sur le corps teinté.
 * `cols=2` => 2 colonnes ≥ sm.
 */
export function FormSection({
  title,
  description,
  cols = 1,
  children,
}: {
  title?: string;
  description?: string;
  cols?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface rounded-xl border p-4 shadow-xs">
      {(title || description) && (
        <div className="mb-3 space-y-0.5">
          {title && <h3 className="text-section">{title}</h3>}
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}
      <div className={cn('grid gap-4', cols === 2 && 'sm:grid-cols-2')}>{children}</div>
    </section>
  );
}

/** Champ : label + contrôle + indice / erreur. */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

/** Classe commune pour les `<select>` / `<textarea>` natifs dans les formulaires. */
export const selectClass =
  'field w-full';
export const textareaClass =
  'border-input bg-surface focus-visible:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors';
