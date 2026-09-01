import { describe, expect, it } from 'vitest';
import { seriesDates, type SeriesConfig } from '../series';

const base: SeriesConfig = {
  startDate: '2026-06-01', // lundi
  weekdays: [2, 4], // mardi, jeudi
  time: '10:00',
  mode: 'count',
  count: 4,
  until: '',
};

describe('seriesDates', () => {
  it('respecte les jours choisis et le compte', () => {
    const d = seriesDates(base).map((iso) => iso.slice(0, 10));
    expect(d).toEqual(['2026-06-02', '2026-06-04', '2026-06-09', '2026-06-11']);
  });

  it("commence après la date de début si le jour n'y est pas", () => {
    const d = seriesDates({ ...base, startDate: '2026-06-03', count: 2 }).map((x) => x.slice(0, 10));
    expect(d).toEqual(['2026-06-04', '2026-06-09']);
  });

  it('mode « until » s\'arrête à la date de fin', () => {
    const d = seriesDates({ ...base, mode: 'until', until: '2026-06-10' }).map((x) => x.slice(0, 10));
    expect(d).toEqual(['2026-06-02', '2026-06-04', '2026-06-09']);
  });

  it('heure de Paris → UTC (été = +2h)', () => {
    expect(seriesDates(base)[0]).toBe('2026-06-02T08:00:00.000Z');
  });

  it('aucun jour coché ⇒ rien ; plafond à 60', () => {
    expect(seriesDates({ ...base, weekdays: [] })).toEqual([]);
    expect(seriesDates({ ...base, weekdays: [0, 1, 2, 3, 4, 5, 6], count: 999 })).toHaveLength(60);
  });
});
