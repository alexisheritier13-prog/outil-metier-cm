import { describe, expect, it } from 'vitest';
import type { Post } from '@/shared/types';
import { escapeText, foldLine, postsToIcs } from '@/shared/utils/ics';

const mk = (over: Partial<Post>): Post =>
  ({
    id: over.id ?? 'p1',
    clientId: 'c1',
    network: 'instagram',
    scheduledAt: over.scheduledAt ?? '2026-07-01T08:00:00.000Z',
    caption: over.caption ?? 'Légende',
    canvaUrl: over.canvaUrl ?? null,
    status: over.status ?? 'scheduled',
    authorId: 'me',
    campaignId: null,
    originType: null,
    originId: null,
    performanceNote: null,
    performanceVisibleToClient: false,
    ...over,
  }) as Post;

const opts = { clientName: () => 'Studio Lumen', now: new Date('2026-06-01T12:00:00Z') };

describe('escapeText', () => {
  it('échappe les caractères réservés RFC 5545', () => {
    expect(escapeText('a; b, c\\ d\ne')).toBe('a\\; b\\, c\\\\ d\\ne');
  });
});

describe('foldLine', () => {
  it('ne touche pas une ligne courte', () => {
    expect(foldLine('SUMMARY:court')).toBe('SUMMARY:court');
  });
  it('plie une ligne longue à 75 octets avec continuation par espace', () => {
    const long = 'DESCRIPTION:' + 'x'.repeat(200);
    const folded = foldLine(long);
    expect(folded).toContain('\r\n ');
    for (const seg of folded.split('\r\n ')) {
      expect(new TextEncoder().encode(seg).length).toBeLessThanOrEqual(75);
    }
    // le contenu reste identique une fois déplié
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });
});

describe('postsToIcs', () => {
  it('produit un VCALENDAR avec VTIMEZONE Europe/Paris et un VEVENT par post', () => {
    const ics = postsToIcs([mk({ id: 'a' }), mk({ id: 'b' })], opts);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:Europe/Paris');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('UID:a@outil-metier-cm');
    expect(ics).toContain('UID:b@outil-metier-cm');
    // CRLF partout
    expect(ics.split('\n').every((l) => l === '' || l.endsWith('\r'))).toBe(true);
  });

  it('convertit scheduled_at en heure murale de Paris (été = UTC+2)', () => {
    const ics = postsToIcs([mk({ scheduledAt: '2026-07-01T08:00:00.000Z' })], opts);
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20260701T100000');
    expect(ics).toContain('DTEND;TZID=Europe/Paris:20260701T103000');
    expect(ics).toContain('DTSTAMP:20260601T120000Z');
  });

  it('gère l’hiver (UTC+1)', () => {
    const ics = postsToIcs([mk({ scheduledAt: '2026-01-15T09:00:00.000Z' })], opts);
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20260115T100000');
  });

  it('échappe la légende dans SUMMARY et DESCRIPTION et inclut le lien Canva', () => {
    const ics = postsToIcs(
      [mk({ caption: 'Promo; 20% , dès demain', canvaUrl: 'https://canva.com/x', status: 'approved' })],
      opts,
    );
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('SUMMARY:[Studio Lumen] Instagram — Promo\\; 20% \\, dès demain');
    expect(unfolded).toContain('Statut : Validé');
    expect(unfolded).toContain('Canva : https://canva.com/x');
  });

  it('structure RFC : BEGIN/END équilibrés, propriétés obligatoires présentes', () => {
    const ics = postsToIcs([mk({ id: 'a' }), mk({ id: 'b' })], opts);
    const lines = ics.replace(/\r\n /g, '').split('\r\n');
    const stack: string[] = [];
    for (const line of lines) {
      if (line.startsWith('BEGIN:')) stack.push(line.slice(6));
      else if (line.startsWith('END:')) expect(stack.pop()).toBe(line.slice(4));
    }
    expect(stack).toHaveLength(0);
    for (const block of ics.split('BEGIN:VEVENT').slice(1)) {
      expect(block).toMatch(/UID:/);
      expect(block).toMatch(/DTSTAMP:/);
      expect(block).toMatch(/DTSTART;TZID=Europe\/Paris:/);
    }
  });

  it('liste vide → calendrier valide sans VEVENT', () => {
    const ics = postsToIcs([], opts);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
