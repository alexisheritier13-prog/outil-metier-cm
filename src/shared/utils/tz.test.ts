import { describe, expect, it } from 'vitest';
import {
  parisDateKey,
  parisDateLabel,
  parisOffsetMinutes,
  parisTimeLabel,
  parisWallTimeToUtc,
  toParisParts,
} from '@/shared/utils/tz';

describe('toParisParts', () => {
  it('applique le décalage été (UTC+2)', () => {
    // 2026-07-01 08:00 UTC → 10:00 à Paris
    const p = toParisParts('2026-07-01T08:00:00Z');
    expect(p).toMatchObject({ year: 2026, month: 7, day: 1, hour: 10, minute: 0 });
  });

  it('applique le décalage hiver (UTC+1)', () => {
    // 2026-01-15 08:00 UTC → 09:00 à Paris
    const p = toParisParts('2026-01-15T08:00:00Z');
    expect(p).toMatchObject({ hour: 9 });
  });
});

describe('parisOffsetMinutes', () => {
  it('vaut 120 en été et 60 en hiver', () => {
    expect(parisOffsetMinutes(new Date('2026-07-01T12:00:00Z'))).toBe(120);
    expect(parisOffsetMinutes(new Date('2026-01-15T12:00:00Z'))).toBe(60);
  });
});

describe('parisWallTimeToUtc', () => {
  it('convertit une heure murale été', () => {
    const utc = parisWallTimeToUtc({ year: 2026, month: 7, day: 1, hour: 10, minute: 0 });
    expect(utc.toISOString()).toBe('2026-07-01T08:00:00.000Z');
  });

  it('convertit une heure murale hiver', () => {
    const utc = parisWallTimeToUtc({ year: 2026, month: 1, day: 15, hour: 9, minute: 30 });
    expect(utc.toISOString()).toBe('2026-01-15T08:30:00.000Z');
  });

  it('round-trip stable sur une date arbitraire', () => {
    const input = { year: 2026, month: 3, day: 12, hour: 14, minute: 45 };
    const back = toParisParts(parisWallTimeToUtc(input));
    expect(back).toMatchObject(input);
  });
});

describe('parisDateKey / parisTimeLabel', () => {
  it('regroupe par jour local', () => {
    // 23:30 UTC en été = 01:30 le lendemain à Paris
    expect(parisDateKey('2026-07-01T23:30:00Z')).toBe('2026-07-02');
    expect(parisTimeLabel('2026-07-01T23:30:00Z')).toBe('01:30');
  });
});

describe('parisDateLabel', () => {
  it('formate en français, en Europe/Paris', () => {
    expect(parisDateLabel('2026-09-10T08:00:00Z')).toBe('10 sept. 2026');
    // 23:30 UTC en été = le lendemain à Paris
    expect(parisDateLabel('2026-07-01T23:30:00Z')).toBe('2 juil. 2026');
  });

  it('omet l’année sur demande', () => {
    expect(parisDateLabel('2026-09-10T08:00:00Z', { year: false })).toBe('10 sept.');
  });
});
