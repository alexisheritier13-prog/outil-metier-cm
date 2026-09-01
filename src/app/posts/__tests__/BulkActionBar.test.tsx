import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { BulkActionBar } from '@/app/posts/BulkActionBar';
import type { Post } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';
import * as postsService from '@/services/posts';

vi.mock('@/services/posts');

const mk = (over: Partial<Post>): Post =>
  ({
    id: over.id ?? Math.random().toString(),
    clientId: 'c1',
    network: 'instagram',
    scheduledAt: '2026-07-01T08:00:00.000Z',
    caption: over.caption ?? 'Post',
    status: over.status ?? 'draft',
    authorId: 'me',
    campaignId: null,
    pillarId: null,
    originType: null,
    originId: null,
    performanceNote: null,
    performanceVisibleToClient: false,
    ...over,
  }) as Post;

function setup(posts: Post[], selectedIds: string[]) {
  return renderWithProviders(
    <BulkActionBar
      selectedIds={selectedIds}
      posts={posts}
      clientName={() => 'Studio'}
      role={'lead' as Role}
      canReassign
      authors={[]}
      onSelectAll={() => {}}
      onClear={() => {}}
    />,
  );
}

afterEach(() => vi.resetAllMocks());

describe('BulkActionBar', () => {
  it('duplique chaque post sélectionné et affiche le récap', async () => {
    vi.mocked(postsService.duplicatePost).mockResolvedValue(mk({}));
    const posts = [mk({ id: 'a' }), mk({ id: 'b' })];
    setup(posts, ['a', 'b']);

    await userEvent.click(screen.getByRole('button', { name: /Dupliquer/i }));

    await waitFor(() => expect(postsService.duplicatePost).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('2 réussies')).toBeInTheDocument();
  });

  it('met à la corbeille chaque post sélectionné après confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(postsService.trashPost).mockResolvedValue();
    const posts = [mk({ id: 'a' }), mk({ id: 'b' }), mk({ id: 'c' })];
    setup(posts, ['a', 'b', 'c']);

    await userEvent.click(screen.getByRole('button', { name: /Corbeille/i }));

    await waitFor(() => expect(postsService.trashPost).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('3 réussies')).toBeInTheDocument();
  });
});
