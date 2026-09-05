const OUTER = 132;
const INNER = 92;

/** Jauge demi-cercle (conic-gradient) — remplissage `rate`% dans le cadran haut. */
export function HalfGauge({
  rate,
  total,
  previousRate,
}: {
  rate: number;
  total: number;
  previousRate?: number | null;
}) {
  const fillDeg = (rate / 100) * 180;
  const delta = typeof previousRate === 'number' ? rate - previousRate : null;
  // Couleur de l'arc selon le niveau atteint, plutôt qu'une seule teinte fixe —
  // seuils volontairement larges (pas de métrique de référence chiffrée à ce jour).
  const tierColor = rate >= 66 ? 'var(--success)' : rate >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: OUTER, height: OUTER / 2 }}>
        <div
          className="absolute left-0 top-0 rounded-full"
          style={{
            width: OUTER,
            height: OUTER,
            background: `conic-gradient(from 180deg, ${tierColor} 0deg ${fillDeg}deg, var(--surface-3) ${fillDeg}deg 180deg, transparent 180deg 360deg)`,
          }}
        />
        <div
          className="bg-surface absolute rounded-full"
          style={{
            width: INNER,
            height: INNER,
            top: (OUTER - INNER) / 2,
            left: (OUTER - INNER) / 2,
          }}
        />
        <span className="absolute inset-x-0 bottom-0 text-center text-2xl font-extrabold tabular-nums">
          {rate}%
        </span>
      </div>
      <p className="text-muted-foreground mt-2 text-center text-[11px]">
        {total} post{total > 1 ? 's' : ''} · 30 j
        {delta !== null && (
          <>
            {' · '}
            <span className={delta >= 0 ? 'text-success-strong' : 'text-danger-strong'}>
              {delta >= 0 ? '+' : ''}
              {delta} pt{Math.abs(delta) > 1 ? 's' : ''} vs le mois dernier
            </span>
          </>
        )}
      </p>
    </div>
  );
}
