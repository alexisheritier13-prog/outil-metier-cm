import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';
import { useBulkActions } from '@/app/posts/useBulkActions';
import * as postsService from '@/services/posts';

vi.mock('@/services/posts');

const mk = (over: Partial<Post>): Post =>
  ({
    id: over.id ?? Math.random().toString(),
    clientId: 'c1',
    network: 'instagram',
    scheduledAt: '2026-07-01T08:00:00.000Z',
    caption: 'Post',
    status: over.status ?? 'draft',
    authorId: 'me',
    campaignId: null,
    originType: null,
    originId: null,
    performanceNote: null,
    performanceVisibleToClient: false,
    ...over,
  }) as Post;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

afterEach(() => vi.resetAllMocks());

describe('useBulkActions.changeStatus', () => {
  it('ignore les posts hors transition et rapporte les échecs serveur', async () => {
    // a: scheduled → published OK ; b: draft → published refus a priori ;
    // c: scheduled → published mais le serveur refuse.
    vi.mocked(postsService.changePostStatus).mockImplementation(async (id) => {
      if (id === 'c') throw new Error('accès refusé');
      return mk({ id });
    });

    const posts = [
      mk({ id: 'a', status: 'scheduled' }),
      mk({ id: 'b', status: 'draft' }),
      mk({ id: 'c', status: 'scheduled' }),
    ];
    const { result } = renderHook(
      () => useBulkActions({ posts, clientName: () => 'S', role: 'lead' as Role }),
      { wrapper },
    );

    let report: Awaited<ReturnType<typeof result.current.changeStatus>>;
    await waitFor(async () => {
      report = await result.current.changeStatus(['a', 'b', 'c'], 'published');
    });

    expect(postsService.changePostStatus).toHaveBeenCalledTimes(2); // a et c seulement
    expect(report!.succeeded).toBe(1);
    expect(report!.failures).toHaveLength(2);
    expect(report!.failures.map((f) => f.postId).sort()).toEqual(['b', 'c']);
  });

  it('transmet le commentaire aux transitions qui l’exigent', async () => {
    vi.mocked(postsService.changePostStatus).mockResolvedValue(mk({}));
    const posts = [mk({ id: 'a', status: 'internal_review' })];
    const { result } = renderHook(
      () => useBulkActions({ posts, clientName: () => 'S', role: 'lead' as Role }),
      { wrapper },
    );

    await waitFor(async () => {
      await result.current.changeStatus(['a'], 'draft', 'à revoir');
    });

    expect(postsService.changePostStatus).toHaveBeenCalledWith('a', 'draft', 'à revoir');
  });
});
