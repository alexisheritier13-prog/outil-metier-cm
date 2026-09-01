import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ClientCalendarExportPage } from '@/app/clients/ClientCalendarExportPage';
import type { Client, Post } from '@/shared/types';
import * as clientsService from '@/services/clients';
import * as postsService from '@/services/posts';

vi.mock('@/services/clients');
vi.mock('@/services/posts');
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ clientId: 'c1' }),
}));

const client: Client = {
  id: 'c1',
  name: 'Studio Lumen',
  sector: 'Décoration',
  logoUrl: null,
  isArchived: false,
} as Client;

const mkPost = (over: Partial<Post>): Post =>
  ({
    id: over.id ?? Math.random().toString(),
    clientId: 'c1',
    network: 'instagram',
    scheduledAt: over.scheduledAt ?? '2026-07-01T08:00:00.000Z',
    caption: over.caption ?? '',
    canvaUrl: null,
    status: over.status ?? 'scheduled',
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

describe('ClientCalendarExportPage', () => {
  it('rend un document imprimable groupé par jour avec en-tête client', async () => {
    vi.mocked(clientsService.getClient).mockResolvedValue(client);
    vi.mocked(postsService.listPosts).mockResolvedValue([
      mkPost({ id: 'a', caption: 'Post du 1er juillet', scheduledAt: '2026-07-01T08:00:00.000Z' }),
      mkPost({ id: 'b', caption: 'Autre le 1er', scheduledAt: '2026-07-01T14:00:00.000Z' }),
      mkPost({ id: 'c', caption: 'Post du 3', scheduledAt: '2026-07-03T09:00:00.000Z' }),
    ]);

    renderWithProviders(<ClientCalendarExportPage />, {
      route: '/app/clients/c1/export?from=2026-07-01&to=2026-07-31',
    });

    expect(await screen.findByRole('heading', { name: 'Studio Lumen' })).toBeInTheDocument();
    expect(screen.getByText('Post du 1er juillet')).toBeInTheDocument();
    expect(screen.getByText('Autre le 1er')).toBeInTheDocument();
    expect(screen.getByText('Post du 3')).toBeInTheDocument();
    expect(screen.getByText(/3 posts/)).toBeInTheDocument();
    // deux journées distinctes
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
    // filtre par client transmis au service
    expect(postsService.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({ clientIds: ['c1'] }),
    );
  });

  it('affiche la note de performance seulement si elle est partagée au client', async () => {
    vi.mocked(clientsService.getClient).mockResolvedValue(client);
    vi.mocked(postsService.listPosts).mockResolvedValue([
      mkPost({ id: 'a', caption: 'Visible', performanceNote: '820 likes', performanceVisibleToClient: true }),
      mkPost({ id: 'b', caption: 'Cachée', performanceNote: 'interne', performanceVisibleToClient: false }),
    ]);

    renderWithProviders(<ClientCalendarExportPage />, {
      route: '/app/clients/c1/export?from=2026-07-01&to=2026-07-31',
    });

    expect(await screen.findByText(/Performance : 820 likes/)).toBeInTheDocument();
    expect(screen.queryByText(/interne/)).not.toBeInTheDocument();
  });
});
