import type { Post } from '@/shared/types';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { POST_STATUS_LABELS } from '@/shared/constants/postStatus';
import { toParisParts } from './tz';

/**
 * Export calendrier iCalendar (RFC 5545), Story 9.2. Fonction pure : prend les posts
 * du résultat filtré et rend un `.ics` valide, importable dans Google Agenda / Outlook.
 * Le fuseau métier (Europe/Paris) est déclaré via un composant `VTIMEZONE` statique
 * (règles CET/CEST) et des `DTSTART;TZID=Europe/Paris`.
 */

const PRODID = '-//outil-metier-cm//calendrier//FR';
const DEFAULT_DURATION_MIN = 30;

/** Europe/Paris — transitions DST stables depuis 1996 (dernier dimanche mars / octobre). */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Paris',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** Échappement des valeurs texte (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Pliage des lignes à 75 octets (RFC 5545 §3.1), continuation par espace. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = enc.encode(char).length;
    // 74 pour laisser la place à l'espace de continuation.
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  if (current) out.push(current);
  return out.join('\r\n ');
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** `YYYYMMDDTHHMMSS` en heure murale d'Europe/Paris. */
function localStamp(instant: string): string {
  const p = toParisParts(instant);
  return `${p.year}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

/** `YYYYMMDDTHHMMSSZ` UTC (pour DTSTAMP). */
function utcStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export interface IcsOptions {
  clientName: (clientId: string) => string;
  /** Durée d'un événement, minutes (défaut 30). */
  durationMinutes?: number;
  /** Date de génération (injectable pour les tests). */
  now?: Date;
}

function summaryFor(post: Post, clientName: (id: string) => string): string {
  const caption = post.caption.trim().replace(/\s+/g, ' ');
  const extract = caption.length > 60 ? `${caption.slice(0, 60)}…` : caption || 'sans légende';
  return `[${clientName(post.clientId)}] ${NETWORK_LABELS[post.network]} — ${extract}`;
}

function descriptionFor(post: Post): string {
  const lines = [
    post.caption.trim() || '(sans légende)',
    '',
    `Statut : ${POST_STATUS_LABELS[post.status]}`,
  ];
  if (post.canvaUrl) lines.push(`Canva : ${post.canvaUrl}`);
  return lines.join('\n');
}

function vevent(post: Post, opts: Required<Pick<IcsOptions, 'clientName'>> & IcsOptions): string[] {
  const duration = opts.durationMinutes ?? DEFAULT_DURATION_MIN;
  const start = localStamp(post.scheduledAt);
  const endDate = new Date(new Date(post.scheduledAt).getTime() + duration * 60_000);
  const end = localStamp(endDate.toISOString());
  return [
    'BEGIN:VEVENT',
    `UID:${post.id}@outil-metier-cm`,
    `DTSTAMP:${utcStamp(opts.now ?? new Date())}`,
    `DTSTART;TZID=Europe/Paris:${start}`,
    `DTEND;TZID=Europe/Paris:${end}`,
    `SUMMARY:${escapeText(summaryFor(post, opts.clientName))}`,
    `DESCRIPTION:${escapeText(descriptionFor(post))}`,
    'END:VEVENT',
  ];
}

export function postsToIcs(posts: Post[], opts: IcsOptions): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE,
    ...posts.flatMap((p) => vevent(p, opts)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
