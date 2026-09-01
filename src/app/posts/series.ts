import { parisWallTimeToUtc } from '@/shared/utils/tz';

/**
 * Génère les dates d'une série de posts (pure, testée). Jours de la semaine en
 * convention JS (`Date.getDay()` : 0 = dimanche … 6 = samedi), heure fixe en
 * heure de Paris. `mode` : nombre de posts, ou date de fin.
 */
export interface SeriesConfig {
  startDate: string; // 'YYYY-MM-DD'
  weekdays: number[]; // 0..6
  time: string; // 'HH:mm'
  mode: 'count' | 'until';
  count: number;
  until: string; // 'YYYY-MM-DD'
}

export const SERIES_MAX = 60;

export function seriesDates(cfg: SeriesConfig): string[] {
  const weekdays = new Set(cfg.weekdays);
  if (weekdays.size === 0) return [];

  const parts = cfg.time.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return [];

  const cur = new Date(`${cfg.startDate}T00:00:00`);
  if (Number.isNaN(cur.getTime())) return [];

  const target =
    cfg.mode === 'count' ? Math.max(0, Math.min(cfg.count, SERIES_MAX)) : SERIES_MAX;
  const until =
    cfg.mode === 'until' && cfg.until ? new Date(`${cfg.until}T23:59:59`) : null;
  if (cfg.mode === 'until' && (!until || Number.isNaN(until.getTime()))) return [];

  const out: string[] = [];
  for (let guard = 0; guard < 400 && out.length < target; guard += 1) {
    if (until && cur > until) break;
    if (weekdays.has(cur.getDay())) {
      out.push(
        parisWallTimeToUtc({
          year: cur.getFullYear(),
          month: cur.getMonth() + 1,
          day: cur.getDate(),
          hour: h,
          minute: m,
        }).toISOString(),
      );
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
