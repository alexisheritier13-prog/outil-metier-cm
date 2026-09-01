import { describe, expect, it } from 'vitest';
import { pillarBalance } from '../pillarBalance';
import type { ClientPillar } from '@/shared/types';

const pillars: ClientPillar[] = [
  { id: 'a', clientId: 'c', label: 'Produit', targetPct: 40, sortOrder: 0 },
  { id: 'b', clientId: 'c', label: 'Coulisses', targetPct: 30, sortOrder: 1 },
];

describe('pillarBalance', () => {
  it('calcule les parts réelles et garde les cibles', () => {
    const s = pillarBalance(pillars, [
      { pillarId: 'a' },
      { pillarId: 'a' },
      { pillarId: 'b' },
      { pillarId: null },
    ]);
    expect(s).toEqual([
      { id: 'a', label: 'Produit', count: 2, actualPct: 50, targetPct: 40 },
      { id: 'b', label: 'Coulisses', count: 1, actualPct: 25, targetPct: 30 },
      { id: null, label: 'Non classé', count: 1, actualPct: 25, targetPct: null },
    ]);
  });

  it('regroupe une rubrique supprimée dans « Non classé »', () => {
    const s = pillarBalance(pillars, [{ pillarId: 'a' }, { pillarId: 'zzz' }]);
    expect(s.find((x) => x.label === 'Non classé')?.count).toBe(1);
  });

  it('aucun post ⇒ 0 %, pas de ligne « Non classé »', () => {
    const s = pillarBalance(pillars, []);
    expect(s.every((x) => x.actualPct === 0)).toBe(true);
    expect(s).toHaveLength(2);
  });
});
