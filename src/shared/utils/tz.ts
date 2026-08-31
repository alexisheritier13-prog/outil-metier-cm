/**
 * Fuseau horaire métier : les heures de publication sont saisies et affichées en
 * **Europe/Paris**, mais stockées en UTC (`timestamptz`). Toujours passer par ces
 * helpers — ne jamais faire `new Date(str)` nu pour une valeur métier affichée.
 */

export const BUSINESS_TZ = 'Europe/Paris';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Décompose un instant en heure « murale » d'Europe/Paris. */
export function toParisParts(instant: Date | string): WallClock {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === '24' ? '00' : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Décalage d'Europe/Paris par rapport à UTC, en minutes, pour un instant donné (60 ou 120). */
export function parisOffsetMinutes(instant: Date): number {
  const p = toParisParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/**
 * Convertit une heure murale d'Europe/Paris (ex. saisie dans un formulaire) en instant UTC.
 * Gère le changement d'heure été/hiver.
 */
export function parisWallTimeToUtc(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): Date {
  const naiveUtc = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0);
  // Première approximation, puis correction avec l'offset réel à cet instant.
  const guess = new Date(naiveUtc);
  const offset = parisOffsetMinutes(guess);
  const corrected = new Date(naiveUtc - offset * 60_000);
  // Deuxième passe pour les instants proches d'une bascule DST.
  const offset2 = parisOffsetMinutes(corrected);
  return offset2 === offset ? corrected : new Date(naiveUtc - offset2 * 60_000);
}

/** `YYYY-MM-DD` de l'instant en Europe/Paris (utile pour regrouper par jour du calendrier). */
export function parisDateKey(instant: Date | string): string {
  const p = toParisParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** `HH:MM` de l'instant en Europe/Paris. */
export function parisTimeLabel(instant: Date | string): string {
  const p = toParisParts(instant);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/**
 * Date lisible en français, en Europe/Paris — ex. `10 sept. 2026`. Pour l'affichage
 * (jamais pour une clé de regroupement : utiliser `parisDateKey`).
 */
export function parisDateLabel(
  instant: Date | string,
  opts: { year?: boolean } = { year: true },
): string {
  const p = toParisParts(instant);
  const base = `${p.day} ${MONTHS_SHORT[p.month - 1]}`;
  return opts.year === false ? base : `${base} ${p.year}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
