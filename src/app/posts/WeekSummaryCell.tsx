import { MiniWeekBars } from './MiniWeekBars';

interface Props {
  weekNumber: number;
  total: number;
  /** Charge lundi→vendredi (5 valeurs), pour le mini-histogramme. */
  counts: number[];
}

/** 8ᵉ colonne du mois : numéro de semaine, total, charge lundi→vendredi. */
export function WeekSummaryCell({ weekNumber, total, counts }: Props) {
  return (
    <div
      className="flex min-h-[112px] flex-col gap-2 rounded-[15px] p-[9px]"
      style={{
        background: 'linear-gradient(180deg, oklch(0.97 0.012 264), oklch(0.985 0.005 265))',
      }}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[11px] font-extrabold tabular-nums">S{weekNumber}</span>
        <span className="text-muted-foreground whitespace-nowrap text-[10.5px] font-bold">
          {total} post{total > 1 ? 's' : ''}
        </span>
      </div>
      <MiniWeekBars counts={counts} />
    </div>
  );
}
