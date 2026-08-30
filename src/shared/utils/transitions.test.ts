import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  canTransition,
  transitionDirection,
  type TransitionContext,
} from '@/shared/utils/transitions';

const cm: TransitionContext = { role: 'cm', isAuthor: true, isOwnClientContact: false };
const cmOther: TransitionContext = { role: 'cm', isAuthor: false, isOwnClientContact: false };
const lead: TransitionContext = { role: 'lead', isAuthor: false, isOwnClientContact: false };
const client: TransitionContext = { role: 'client', isAuthor: false, isOwnClientContact: true };
const clientOther: TransitionContext = {
  role: 'client',
  isAuthor: false,
  isOwnClientContact: false,
};

describe('canTransition — parcours nominal', () => {
  it('cm soumet son brouillon en relecture interne', () => {
    expect(canTransition('draft', 'internal_review', cm).allowed).toBe(true);
  });

  it('lead valide en interne (→ à valider client)', () => {
    expect(canTransition('internal_review', 'client_review', lead).allowed).toBe(true);
  });

  it('le contact du client approuve', () => {
    expect(canTransition('client_review', 'approved', client).allowed).toBe(true);
  });

  it('planification puis publication par le cm auteur', () => {
    expect(canTransition('approved', 'scheduled', cm).allowed).toBe(true);
    expect(canTransition('scheduled', 'published', cm).allowed).toBe(true);
  });
});

describe('canTransition — droits', () => {
  it('un cm ne peut pas valider en interne', () => {
    const r = canTransition('internal_review', 'client_review', cm);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/rôle/);
  });

  it("un client d'un autre compte ne peut pas approuver", () => {
    const r = canTransition('client_review', 'approved', clientOther);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/contact/);
  });

  it('un cm non-auteur peut quand même agir (droits basés sur le rôle ici)', () => {
    // Les règles actuelles n'exigent pas isAuthor ; ce test fige ce choix.
    expect(canTransition('draft', 'internal_review', cmOther).allowed).toBe(true);
  });
});

describe('canTransition — commentaire obligatoire', () => {
  it('renvoi en brouillon depuis la relecture interne exige un commentaire', () => {
    const r = canTransition('internal_review', 'draft', lead);
    expect(r.allowed).toBe(true);
    expect(r.requiresComment).toBe(true);
  });

  it('refus client exige un commentaire', () => {
    const r = canTransition('client_review', 'draft', client);
    expect(r.allowed).toBe(true);
    expect(r.requiresComment).toBe(true);
  });

  it('une validation simple ne demande pas de commentaire', () => {
    expect(canTransition('draft', 'internal_review', cm).requiresComment).toBe(false);
  });
});

describe('canTransition — cas limites', () => {
  it('transition vers le même statut refusée', () => {
    expect(canTransition('draft', 'draft', lead).allowed).toBe(false);
  });

  it('transition inexistante (draft → published) refusée', () => {
    expect(canTransition('draft', 'published', lead).reason).toMatch(/inexistante/);
  });

  it('published → scheduled autorisé pour lead uniquement', () => {
    expect(canTransition('published', 'scheduled', lead).allowed).toBe(true);
    expect(canTransition('published', 'scheduled', cm).allowed).toBe(false);
  });
});

describe('allowedTransitions', () => {
  it('depuis client_review, le contact client peut approuver ou refuser', () => {
    expect(allowedTransitions('client_review', client).sort()).toEqual(['approved', 'draft']);
  });

  it('depuis client_review, le lead peut tirer le post en arrière', () => {
    expect(allowedTransitions('client_review', lead).sort()).toEqual(['draft', 'internal_review']);
  });

  it('depuis published, un cm ne peut rien faire', () => {
    expect(allowedTransitions('published', cm)).toEqual([]);
  });
});

describe('transitionDirection', () => {
  it('classe correctement avant / arrière / inexistant', () => {
    expect(transitionDirection('draft', 'internal_review')).toBe('forward');
    expect(transitionDirection('client_review', 'draft')).toBe('backward');
    expect(transitionDirection('draft', 'published')).toBe('none');
  });
});
