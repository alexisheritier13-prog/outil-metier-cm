import { describe, expect, it } from 'vitest';
import { templatePrefill } from '@/app/posts/applyTemplate';
import type { PostTemplate } from '@/shared/types';

const tpl = (over: Partial<PostTemplate>): PostTemplate => ({
  id: 't1',
  name: 'Citation du lundi',
  description: '',
  network: 'instagram',
  captionTemplate: 'Citation :\n\n« … »\n\n#motivation',
  defaultTags: [],
  clientId: null,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('templatePrefill', () => {
  it('reprend réseau et légende du template', () => {
    expect(templatePrefill(tpl({}))).toEqual({
      network: 'instagram',
      caption: 'Citation :\n\n« … »\n\n#motivation',
    });
  });

  it('réseau nul → pas de réseau imposé', () => {
    expect(templatePrefill(tpl({ network: null }))).toEqual({
      network: null,
      caption: 'Citation :\n\n« … »\n\n#motivation',
    });
  });
});
