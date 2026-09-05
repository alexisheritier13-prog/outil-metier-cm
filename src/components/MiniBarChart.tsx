import { cn } from '@/lib/utils';

export interface MiniBarSegment {
  value: number;
  /** Couleur CSS (token ou valeur directe) du segment. */
  color: string;
  label: string;
}

export interface MiniBar {
  key: string;
  label: string;
  segments: MiniBarSegment[];
}

/**
 * Petit histogramme empilé, sans dépendance — une barre par entrée, chaque barre
 * pouvant empiler plusieurs segments (ex. planifiés + publiés). La barre la plus
 * haute peut être mise en avant (dégradé + ombre colorée) plutôt que de reposer
 * sur une infobulle au survol.
 */
export function MiniBarChart({
  bars,
  highlightKey,
  height = 96,
}: {
  bars: MiniBar[];
  highlightKey?: string;
  height?: number;
}) {
  const totals = bars.map((b) => b.segments.reduce((s, seg) => s + seg.value, 0));
  const max = Math.max(...totals, 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {bars.map((bar, i) => {
        const total = totals[i] ?? 0;
        const highlighted = bar.key === highlightKey;
        const barHeight = total === 0 ? 3 : Math.max((total / max) * (height - 20), 4);
        return (
          <div key={bar.key} className="group relative flex flex-1 flex-col items-center gap-1.5">
            {highlighted && total > 0 && (
              <span className="text-primary-strong text-[10px] font-semibold tabular-nums">
                {total}
              </span>
            )}
            <div
              className={cn(
                'mx-auto flex w-full max-w-[30px] flex-col-reverse overflow-hidden rounded-[10px]',
                highlighted && 'shadow-primary',
              )}
              style={{ height: barHeight }}
            >
              {bar.segments.map((seg, si) => {
                const segHeight = total === 0 ? 0 : (seg.value / total) * 100;
                return (
                  <div
                    key={si}
                    style={{
                      height: `${segHeight}%`,
                      background: highlighted && si === bar.segments.length - 1 ? undefined : seg.color,
                      backgroundImage:
                        highlighted && si === bar.segments.length - 1
                          ? `linear-gradient(to top, ${seg.color}, color-mix(in oklch, ${seg.color} 70%, white))`
                          : undefined,
                    }}
                  />
                );
              })}
            </div>
            <span className={cn('text-[11px]', highlighted ? 'text-foreground font-bold' : 'text-muted-foreground')}>
              {bar.label}
            </span>

            {total > 0 && (
              <div
                role="tooltip"
                className="bg-surface-inverse text-surface-inverse-foreground invisible pointer-events-none absolute bottom-full left-1/2 z-tooltip mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-medium opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              >
                {bar.segments.map((s) => `${s.label} ${s.value}`).join(' · ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
