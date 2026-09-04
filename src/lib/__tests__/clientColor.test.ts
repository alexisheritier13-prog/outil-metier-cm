import { describe, expect, it } from 'vitest';
import { clientColor, clientInitials } from '../clientColor';

describe('clientColor', () => {
  it('est déterministe pour un même id', () => {
    const id = 'c06f7906-ce9c-494e-8a58-004f3868be83';
    expect(clientColor(id)).toEqual(clientColor(id));
  });

  it('varie selon l’id', () => {
    const a = clientColor('client-a');
    const b = clientColor('client-b');
    expect(a.color).not.toBe(b.color);
  });

  it('renvoie des chaînes oklch exploitables en CSS', () => {
    const c = clientColor('studio-lumen');
    expect(c.color).toMatch(/^oklch\(/);
    expect(c.soft).toMatch(/^oklch\(/);
    expect(c.ink).toMatch(/^oklch\(/);
  });
});

describe('clientInitials', () => {
  it('prend la 1re lettre des deux premiers mots', () => {
    expect(clientInitials('Studio Lumen')).toBe('SL');
    expect(clientInitials('Studio Lumen (démo)')).toBe('SL');
  });

  it('un seul mot => une seule lettre', () => {
    expect(clientInitials('Nordvik')).toBe('N');
  });
});
