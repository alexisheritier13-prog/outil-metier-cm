/** Mini-histogramme lundi→vendredi de la colonne « Semaine » du planning. */
export function MiniWeekBars({ counts }: { counts: number[] }) {
  return (
    <div className="flex h-11 items-end gap-1" role="img" aria-label={weekBarsLabel(counts)}>
      {counts.map((n, i) => {
        const empty = n === 0;
        const height = empty ? 6 : Math.min(6 + n * 12, 44);
        const opacity = empty ? 1 : Math.min(0.4 + n * 0.2, 1);
        return (
          <span
            key={i}
            className="flex-1 rounded"
            style={{
              height,
              backgroundColor: empty ? 'oklch(0.93 0.008 265)' : 'var(--primary)',
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}

function weekBarsLabel(counts: number[]): string {
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
  return counts
    .map((n, i) => `${days[i]} : ${n} post${n > 1 ? 's' : ''}`)
    .join(', ');
}
