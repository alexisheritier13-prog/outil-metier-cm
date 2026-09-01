import { describe, expect, it } from 'vitest';
import type { Post } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';
import {
  anyNeedsComment,
  failureReason,
  partitionByTransition,
  postLabel,
  summarize,
} from '@/app/posts/bulk';

const mk = (over: Partial<Post>): Post =>
  ({
    id: over.id ?? Math.random().toString(),
    clientId: 'c1',
    network: 'instagram',
    scheduledAt: '2026-07-01T08:00:00.000Z',
    caption: '',
    status: 'draft',
    authorId: 'me',
    campaignId: null,
    pillarId: null,
    originType: null,
    originId: null,
    performanceNote: null,
    performanceVisibleToClient: false,
    ...over,
  }) as Post;

describe('partitionByTransition', () => {
  it('sépare les posts selon la transition permise pour le rôle', () => {
    const posts = [
      mk({ id: 'a', status: 'draft' }), // draft → internal_review OK (cm)
      mk({ id: 'b', status: 'published' }), // published → internal_review : impossible
      mk({ id: 'c', status: 'internal_review' }), // déjà dans le statut cible
    ];
    const { eligible, ineligible } = partitionByTransition(posts, 'internal_review', 'cm' as Role);
    expect(eligible.map((p) => p.id)).toEqual(['a']);
    expect(ineligible.map((p) => p.id)).toEqual(['b', 'c']);
  });
});

describe('anyNeedsComment', () => {
  it('détecte une transition qui exige un commentaire', () => {
    expect(anyNeedsComment([mk({ status: 'internal_review' })], 'draft')).toBe(true);
    expect(anyNeedsComment([mk({ status: 'draft' })], 'internal_review')).toBe(false);
  });
});

describe('summarize', () => {
  it('formate le récapitulatif', () => {
    expect(summarize({ kind: 'duplicate', succeeded: 12, failures: [] })).toBe('12 réussies');
    expect(
      summarize({
        kind: 'status',
        succeeded: 12,
        failures: [{ postId: 'x', label: 'X', reason: 'non permise' }],
      }),
    ).toBe('12 réussies, 1 refusée');
  });
});

describe('postLabel', () => {
  it('tronque la légende et préfixe le client', () => {
    expect(postLabel(mk({ caption: 'Bonjour', clientId: 'c1' }), () => 'Studio')).toBe(
      'Studio · Bonjour',
    );
    expect(postLabel(mk({ caption: '' }), () => 'Studio')).toBe('Studio · sans légende');
    expect(postLabel(mk({ caption: 'x'.repeat(60) }), () => 'S')).toBe(`S · ${'x'.repeat(40)}…`);
  });
});

describe('failureReason', () => {
  it('extrait un message lisible', () => {
    expect(failureReason(new Error('boum'))).toBe('boum');
    expect(failureReason('texte')).toBe('texte');
    expect(failureReason({})).toBe('Échec inattendu.');
  });
});
