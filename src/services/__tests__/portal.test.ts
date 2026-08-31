import { describe, expect, it } from 'vitest';
import { redactClientPost } from '@/services/portal';
import type { Post } from '@/shared/types';

const base: Post = {
  id: 'p1',
  clientId: 'c1',
  network: 'instagram',
  scheduledAt: '',
  caption: '',
  canvaUrl: null,
  status: 'published',
  authorId: 'a1',
  campaignId: null,
  originType: null,
  originId: null,
  performanceNote: 'CPC interne',
  performanceVisibleToClient: false,
  statusChangedAt: '',
  deletedAt: null,
  createdAt: '',
  updatedAt: '',
};

describe('redactClientPost', () => {
  it('masque la note de performance quand elle n’est pas marquée visible', () => {
    expect(redactClientPost(base).performanceNote).toBeNull();
  });

  it('conserve la note quand elle est visible client', () => {
    const visible = { ...base, performanceVisibleToClient: true };
    expect(redactClientPost(visible).performanceNote).toBe('CPC interne');
  });
});
