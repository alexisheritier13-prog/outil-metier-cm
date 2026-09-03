import { Check, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reproduction non interactive de l'espace client (le portail), pour que l'équipe
 * agence (qui n'y a jamais accès) sache exactement ce que le client voit :
 * un calendrier en lecture seule + un écran de validation avec deux boutons.
 */

const CHIP = {
  approved: 'bg-success-surface text-success-strong border-success-border',
  review: 'bg-warning-surface text-warning-strong border-warning-border',
  published: 'bg-surface-3 text-muted-foreground border-border',
} as const;

function Chip({ tone, children }: { tone: keyof typeof CHIP; children: string }) {
  return (
    <span className={cn('block truncate rounded border px-1 py-px text-[9px] leading-tight', CHIP[tone])}>
      {children}
    </span>
  );
}

export function PortalPreviewMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-2 grid gap-3 rounded-xl border p-3 sm:grid-cols-[1.35fr_1fr]',
        className,
      )}
      aria-hidden="true"
    >
      {/* Écran calendrier */}
      <div className="bg-surface overflow-hidden rounded-lg border">
        <div className="flex items-center gap-1.5 border-b px-2.5 py-1.5">
          <span className="bg-primary-surface text-primary-strong grid h-5 w-5 place-items-center rounded text-[9px] font-bold">
            SL
          </span>
          <span className="text-[11px] font-semibold">Studio Lumen</span>
          <span className="text-muted-foreground ml-auto text-[9px]">Calendrier · À valider · Publiés</span>
        </div>
        <div className="grid grid-cols-4 gap-px p-2 text-[9px]">
          {[
            { d: 3, chip: ['approved', 'Validé'] as const },
            { d: 4, chip: null },
            { d: 5, chip: ['review', 'À valider'] as const },
            { d: 6, chip: null },
            { d: 10, chip: ['published', 'Publié'] as const },
            { d: 11, chip: null },
            { d: 12, chip: ['review', 'À valider'] as const },
            { d: 13, chip: null },
          ].map((cell) => (
            <div key={cell.d} className="border-border/60 min-h-[38px] rounded border p-1">
              <span className="text-muted-foreground">{cell.d}</span>
              {cell.chip && <Chip tone={cell.chip[0]}>{cell.chip[1]}</Chip>}
            </div>
          ))}
        </div>
      </div>

      {/* Écran validation */}
      <div className="bg-surface flex flex-col gap-2 rounded-lg border p-2.5">
        <div className="bg-surface-2 rounded border p-1.5">
          <div className="bg-surface-3 mb-1 h-10 rounded" />
          <p className="text-[9px] leading-snug">Nouveau coloris terracotta brûlée, dispo en boutique 🔥</p>
        </div>
        <div className="text-muted-foreground flex items-start gap-1 text-[9px]">
          <MessageSquare className="mt-px h-2.5 w-2.5 shrink-0" />
          <span>« On peut décaler à jeudi ? »</span>
        </div>
        <div className="mt-auto flex gap-1.5">
          <span className="bg-success text-success-foreground inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-medium">
            <Check className="h-2.5 w-2.5" /> Approuver
          </span>
          <span className="border-border text-foreground rounded border px-1.5 py-1 text-[9px] font-medium">
            Demander une modif.
          </span>
        </div>
      </div>
    </div>
  );
}
