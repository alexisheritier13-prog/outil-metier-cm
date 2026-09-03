import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TOUR_STEPS } from './tourSteps';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PAD = 6;
const TOOLTIP_W = 328;
const MARGIN = 12;

type Box = { top: number; left: number; width: number; height: number };

function measure(selector: string): Box | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Depuis `from`, avance dans `dir` jusqu'à une étape dont la cible existe. -1 si aucune. */
function resolve(from: number, dir: 1 | -1): number {
  for (let n = from; n >= 0 && n < TOUR_STEPS.length; n += dir) {
    if (measure(TOUR_STEPS[n]!.selector)) return n;
  }
  return -1;
}

export function InterfaceTour({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [idx, setIdx] = useState(-1);
  const [box, setBox] = useState<Box | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Ouverture : se placer sur le tableau de bord (certaines étapes y pointent).
  useEffect(() => {
    if (!open) {
      setIdx(-1);
      setBox(null);
      return;
    }
    if (pathname !== '/app') navigate('/app');
  }, [open, pathname, navigate]);

  // Une fois sur /app, démarrer à la première étape résolvable.
  useEffect(() => {
    if (open && idx === -1 && pathname === '/app') {
      const first = resolve(0, 1);
      if (first === -1) onClose();
      else setIdx(first);
    }
  }, [open, idx, pathname, onClose]);

  const step = idx >= 0 ? TOUR_STEPS[idx] : undefined;

  const reposition = useCallback(() => {
    if (!step) return;
    setBox(measure(step.selector));
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const raf = requestAnimationFrame(reposition);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [step, reposition]);

  useEffect(() => {
    if (step) primaryRef.current?.focus();
  }, [step]);

  const go = useCallback(
    (dir: 1 | -1) => {
      const next = resolve(idx + dir, dir);
      if (next === -1) onClose();
      else setIdx(next);
    },
    [idx, onClose],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go, onClose]);

  if (!open || !step || !box) {
    // Voile d'attente pendant la navigation / le calcul de position.
    return open
      ? createPortal(
          <div className="fixed inset-0 bg-foreground/40" style={{ zIndex: 1400 }} aria-hidden="true" />,
          document.body,
        )
      : null;
  }

  const holeTop = box.top - PAD;
  const holeLeft = box.left - PAD;
  const holeW = box.width + PAD * 2;
  const holeH = box.height + PAD * 2;

  // Placement de la bulle
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let ttLeft: number;
  let ttTop: number;
  if (step.placement === 'right') {
    ttLeft = holeLeft + holeW + MARGIN;
    ttTop = box.top;
  } else if (step.placement === 'left') {
    ttLeft = holeLeft - MARGIN - TOOLTIP_W;
    ttTop = box.top;
  } else {
    ttLeft = box.left;
    ttTop = holeTop + holeH + MARGIN;
  }
  // Repli si ça déborde à droite
  if (ttLeft + TOOLTIP_W > vw - MARGIN) ttLeft = holeLeft - MARGIN - TOOLTIP_W;
  if (ttLeft < MARGIN) ttLeft = Math.min(holeLeft + holeW + MARGIN, vw - TOOLTIP_W - MARGIN);
  if (ttLeft < MARGIN) ttLeft = MARGIN;
  ttTop = Math.max(MARGIN, Math.min(ttTop, vh - 220 - MARGIN));

  const total = TOUR_STEPS.filter((s) => !s.optional || measure(s.selector)).length;
  const position =
    TOUR_STEPS.slice(0, idx + 1).filter((s) => !s.optional || measure(s.selector)).length;
  const isLast = resolve(idx + 1, 1) === -1;

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 1400 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Visite guidée : ${step.title}`}
    >
      {/* capte les clics hors bulle */}
      <button
        type="button"
        aria-label="Fermer la visite"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={() => onClose()}
      />

      {/* trou lumineux */}
      <div
        className="pointer-events-none absolute transition-all duration-200 ease-out"
        style={{
          top: holeTop,
          left: holeLeft,
          width: holeW,
          height: holeH,
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(17,20,28,0.55), 0 0 0 2px var(--primary)',
        }}
      />

      {/* bulle */}
      <div
        className="bg-surface shadow-panel absolute rounded-xl border p-4"
        style={{ top: ttTop, left: ttLeft, width: TOOLTIP_W }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            {position} / {total}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la visite"
            className="text-muted-foreground hover:bg-surface-2 hover:text-foreground -mr-1 ml-auto rounded-md p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-section mb-1">{step.title}</h3>
        <p className="text-muted-foreground mb-3 text-sm leading-relaxed">{step.body}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Passer la visite
          </Button>
          <div className="ml-auto flex gap-1.5">
            {idx > 0 && resolve(idx - 1, -1) !== -1 && (
              <Button variant="outline" size="sm" onClick={() => go(-1)} aria-label="Précédent">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Button ref={primaryRef} size="sm" onClick={() => go(1)}>
              {isLast ? 'Terminer' : 'Suivant'}
              {!isLast && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
