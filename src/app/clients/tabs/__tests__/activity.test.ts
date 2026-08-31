import { describe, expect, it } from 'vitest';
import type { ClientActivityEntry } from '@/shared/types';
import { activityCategory, activityLabel } from '../activity';

const e = (over: Partial<ClientActivityEntry>): ClientActivityEntry => ({
  historyId: 1,
  clientId: 'c1',
  postId: 'p1',
  postCaption: 'Légende',
  network: 'instagram',
  scheduledAt: '',
  action: 'status_change',
  field: null,
  oldValue: null,
  newValue: null,
  actorId: null,
  actorName: null,
  createdAt: '',
  ...over,
});

describe('activityCategory', () => {
  it('distingue refus client et renvoi interne (même statut cible « draft »)', () => {
    expect(activityCategory(e({ newValue: 'draft', oldValue: 'client_review' }))).toBe(
      'client_rejected',
    );
    expect(activityCategory(e({ newValue: 'draft', oldValue: 'internal_review' }))).toBe('returned');
  });

  it('mappe les transitions clés', () => {
    expect(activityCategory(e({ newValue: 'internal_review' }))).toBe('submitted');
    expect(activityCategory(e({ newValue: 'client_review' }))).toBe('internal_approved');
    expect(activityCategory(e({ newValue: 'approved' }))).toBe('client_approved');
    expect(activityCategory(e({ newValue: 'published' }))).toBe('published');
  });

  it('gère création, corbeille, modif de champ', () => {
    expect(activityCategory(e({ action: 'create' }))).toBe('create');
    expect(activityCategory(e({ action: 'trash' }))).toBe('trash');
    expect(activityLabel(e({ action: 'update', field: 'caption' }))).toBe(
      'Modification de la légende',
    );
  });
});
