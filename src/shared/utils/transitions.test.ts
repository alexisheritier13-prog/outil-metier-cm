import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  canTransition,
  transitionDirection,
  transitionNeedsComment,
} from '@/shared/utils/transitions';

describe('canTransition — parcours nominal', () => {
  it('cm soumet son brouillon en relecture interne', () => {
    expect(canTransition('draft', 'internal_review', 'cm').allowed).toBe(true);
  });
  it('lead valide en interne (→ à valider client)', () => {
    expect(canTransition('internal_review', 'client_review', 'lead').allowed).toBe(true);
  });
  it('le contact client approuve', () => {
    expect(canTransition('client_review', 'approved', 'client').allowed).toBe(true);
  });
  it('planification puis publication par le cm', () => {
    expect(canTransition('approved', 'scheduled', 'cm').allowed).toBe(true);
    expect(canTransition('scheduled', 'published', 'cm').allowed).toBe(true);
  });
});

describe('canTransition — droits', () => {
  it('un cm ne peut pas valider en interne', () => {
    const r = canTransition('internal_review', 'client_review', 'cm');
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/rôle/);
  });
  it('un cm ne peut pas approuver côté client', () => {
    expect(canTransition('client_review', 'approved', 'cm').allowed).toBe(false);
  });
  it('published → scheduled : lead/admin uniquement', () => {
    expect(canTransition('published', 'scheduled', 'lead').allowed).toBe(true);
    expect(canTransition('published', 'scheduled', 'cm').allowed).toBe(false);
  });
});

describe('canTransition — commentaire obligatoire', () => {
  it('renvoi en brouillon depuis la relecture interne exige un commentaire', () => {
    const r = canTransition('internal_review', 'draft', 'lead');
    expect(r.allowed).toBe(true);
    expect(r.needsComment).toBe(true);
  });
  it('une validation simple ne demande pas de commentaire', () => {
    expect(canTransition('draft', 'internal_review', 'cm').needsComment).toBe(false);
  });
  it('transitionNeedsComment cohérent', () => {
    expect(transitionNeedsComment('internal_review', 'draft')).toBe(true);
    expect(transitionNeedsComment('draft', 'internal_review')).toBe(false);
  });
});

describe('canTransition — cas limites', () => {
  it('même statut refusé', () => {
    expect(canTransition('draft', 'draft', 'lead').allowed).toBe(false);
  });
  it('transition inexistante (draft → published) refusée', () => {
    expect(canTransition('draft', 'published', 'lead').reason).toMatch(/inexistante/);
  });
});

describe('allowedTransitions', () => {
  it('depuis client_review, le lead peut tirer le post en arrière', () => {
    expect(allowedTransitions('client_review', 'lead').sort()).toEqual(['draft', 'internal_review']);
  });
  it('depuis published, un cm ne peut rien faire', () => {
    expect(allowedTransitions('published', 'cm')).toEqual([]);
  });
  it('depuis client_review, le contact client peut approuver', () => {
    expect(allowedTransitions('client_review', 'client')).toEqual(['approved']);
  });
});

describe('transitionDirection', () => {
  it('classe avant / arrière / inexistant', () => {
    expect(transitionDirection('draft', 'internal_review')).toBe('forward');
    expect(transitionDirection('client_review', 'draft')).toBe('backward');
    expect(transitionDirection('draft', 'published')).toBe('none');
  });
});
