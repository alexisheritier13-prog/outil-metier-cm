import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { PerformanceSection } from '@/app/posts/PerformanceSection';
import type { Post } from '@/shared/types';
import * as postsService from '@/services/posts';

vi.mock('@/services/posts');

const mk = (over: Partial<Post>): Post =>
  ({
    id: 'p1',
    clientId: 'c1',
    network: 'instagram',
    scheduledAt: '2026-07-01T08:00:00.000Z',
    caption: 'Post',
    status: over.status ?? 'published',
    authorId: 'me',
    campaignId: null,
    pillarId: null,
    originType: null,
    originId: null,
    performanceNote: over.performanceNote ?? null,
    performanceVisibleToClient: over.performanceVisibleToClient ?? false,
    ...over,
  }) as Post;

afterEach(() => vi.resetAllMocks());

describe('PerformanceSection', () => {
  it('éditable quand le post est publié : enregistre note + visibilité', async () => {
    vi.mocked(postsService.updatePostPerformance).mockResolvedValue(mk({}));
    renderWithProviders(<PerformanceSection post={mk({ status: 'published' })} />);

    await userEvent.type(screen.getByLabelText('Note de performance'), '820 likes');
    await userEvent.click(screen.getByLabelText(/Visible par le client/));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(postsService.updatePostPerformance).toHaveBeenCalledWith('p1', '820 likes', true),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/enregistré/i);
  });

  it('non éditable hors « publié » : lecture seule si une note existe', () => {
    renderWithProviders(
      <PerformanceSection post={mk({ status: 'draft', performanceNote: 'ancienne note' })} />,
    );
    expect(screen.getByText('ancienne note')).toBeInTheDocument();
    expect(screen.queryByLabelText('Note de performance')).not.toBeInTheDocument();
  });

  it('non éditable et sans note : rien affiché', () => {
    const { container } = renderWithProviders(
      <PerformanceSection post={mk({ status: 'draft', performanceNote: null })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('la case « visible client » est désactivée tant que la note est vide', () => {
    renderWithProviders(<PerformanceSection post={mk({ status: 'published' })} />);
    expect(screen.getByLabelText(/Visible par le client/)).toBeDisabled();
  });
});
