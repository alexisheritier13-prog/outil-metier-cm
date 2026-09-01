import type { ClientPillar } from '@/shared/types';

export interface PillarStat {
  id: string | null;
  label: string;
  count: number;
  actualPct: number;
  targetPct: number | null;
}

/**
 * Répartition des posts par rubrique vs cible (pur, testé). Les posts sans
 * rubrique — ou rattachés à une rubrique supprimée — sont regroupés en
 * « Non classé ».
 */
export function pillarBalance(
  pillars: ClientPillar[],
  posts: { pillarId: string | null }[],
): PillarStat[] {
  const total = posts.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const counts = new Map<string | null, number>();
  for (const p of posts) counts.set(p.pillarId, (counts.get(p.pillarId) ?? 0) + 1);

  const known = new Set(pillars.map((p) => p.id));
  const stats: PillarStat[] = pillars.map((pl) => {
    const c = counts.get(pl.id) ?? 0;
    return { id: pl.id, label: pl.label, count: c, actualPct: pct(c), targetPct: pl.targetPct };
  });

  let unclassified = counts.get(null) ?? 0;
  for (const [k, v] of counts) if (k !== null && !known.has(k)) unclassified += v;
  if (unclassified > 0) {
    stats.push({
      id: null,
      label: 'Non classé',
      count: unclassified,
      actualPct: pct(unclassified),
      targetPct: null,
    });
  }

  return stats;
}
