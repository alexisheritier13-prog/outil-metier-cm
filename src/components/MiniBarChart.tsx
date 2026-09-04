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
          <div key={bar.key} className="flex flex-1 flex-col items-center gap-1.5">
            {highlighted && total > 0 && (
              <span className="text-primary-strong text-[10px] font-semibold tabular-nums">
                {total}
              </span>
            )}
            <div
              className={cn(
                'flex w-full flex-col-reverse overflow-hidden rounded-[10px]',
                highlighted && 'shadow-primary',
              )}
              style={{ height: barHeight }}
              title={bar.segments.map((s) => `${s.label} ${s.value}`).join(' · ')}
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
            <span className="text-muted-foreground text-[11px]">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}
