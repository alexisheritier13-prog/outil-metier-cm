import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INTRO_SLIDES } from './introSlides';

interface Props {
  open: boolean;
  /** Fermé (bouton Passer / Terminer / Échap) : l'intro est marquée comme vue. */
  onClose: () => void;
  /** L'utilisateur choisit d'enchaîner sur la visite guidée. */
  onStartTour: () => void;
}

export function IntroCarousel({ open, onClose, onStartTour }: Props) {
  const [i, setI] = useState(0);
  const last = i === INTRO_SLIDES.length - 1;
  const slide = INTRO_SLIDES[i] ?? INTRO_SLIDES[0]!;
  const Icon = slide.icon;

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <div className="flex items-center gap-2.5 border-b px-6 py-4">
          <span className="bg-primary text-primary-foreground grid h-8 w-8 shrink-0 place-items-center rounded-lg">
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-section truncate">{slide.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Présentation de Cadence, écran {i + 1} sur {INTRO_SLIDES.length}
            </DialogDescription>
          </div>
          <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
            {i + 1} / {INTRO_SLIDES.length}
          </span>
        </div>

        <div className="min-h-[13.5rem] space-y-4 px-6 py-5">
          <div key={slide.id} className="animate-in fade-in slide-in-from-right-2 duration-200">
            {slide.visual}
          </div>
          <p className="text-sm leading-relaxed">{slide.body}</p>
        </div>

        <div className="bg-surface-2 flex items-center gap-2 border-t px-6 py-3.5">
          <div className="flex gap-1.5" role="tablist" aria-label="Progression">
            {INTRO_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Écran ${idx + 1}`}
                aria-selected={idx === i}
                role="tab"
                onClick={() => setI(idx)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx === i ? 'bg-primary w-5' : 'bg-border hover:bg-border-strong w-1.5',
                )}
              />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {i > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setI((n) => n - 1)}>
                <ArrowLeft className="h-4 w-4" /> Précédent
              </Button>
            )}
            {!last ? (
              <>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Passer
                </Button>
                <Button size="sm" onClick={() => setI((n) => n + 1)}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Terminer
                </Button>
                <Button size="sm" onClick={onStartTour}>
                  <Sparkles className="h-4 w-4" /> Faire le tour de l’interface
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
