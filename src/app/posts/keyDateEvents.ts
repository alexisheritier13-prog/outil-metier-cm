import type { KeyDate } from '@/shared/types';

export interface KeyDateOccurrence {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

/**
 * Projette des marronniers sur des années données (Story 7.3). Les récurrents génèrent
 * une occurrence par année (mois + jour d'origine) ; les ponctuels une seule si leur
 * année est demandée.
 */
export function keyDateOccurrences(keyDates: KeyDate[], years: number[]): KeyDateOccurrence[] {
  const out: KeyDateOccurrence[] = [];
  for (const k of keyDates) {
    const [y, m, d] = k.eventDate.split('-');
    if (k.recurringAnnually) {
      for (const year of years) {
        out.push({ id: `${k.id}:${year}`, date: `${year}-${m}-${d}`, name: k.name });
      }
    } else if (years.includes(Number(y))) {
      out.push({ id: k.id, date: k.eventDate, name: k.name });
    }
  }
  return out;
}
