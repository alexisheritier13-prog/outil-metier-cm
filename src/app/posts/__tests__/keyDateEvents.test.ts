import { describe, expect, it } from 'vitest';
import { keyDateOccurrences } from '@/app/posts/keyDateEvents';
import type { KeyDate } from '@/shared/types';

const kd = (over: Partial<KeyDate>): KeyDate => ({
  id: 'k1',
  name: 'Fête des mères',
  eventDate: '2020-05-31',
  recurringAnnually: true,
  scope: 'global',
  sector: null,
  clientId: null,
  description: '',
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('keyDateOccurrences', () => {
  it('projette un marronnier récurrent sur chaque année demandée', () => {
    const occ = keyDateOccurrences([kd({})], [2026, 2027]);
    expect(occ).toEqual([
      { id: 'k1:2026', date: '2026-05-31', name: 'Fête des mères' },
      { id: 'k1:2027', date: '2027-05-31', name: 'Fête des mères' },
    ]);
  });

  it('un marronnier ponctuel n’apparaît que si son année est demandée', () => {
    const one = kd({ id: 'k2', recurringAnnually: false, eventDate: '2026-11-14', name: 'Salon' });
    expect(keyDateOccurrences([one], [2026, 2027])).toEqual([
      { id: 'k2', date: '2026-11-14', name: 'Salon' },
    ]);
    expect(keyDateOccurrences([one], [2027])).toEqual([]);
  });
});
