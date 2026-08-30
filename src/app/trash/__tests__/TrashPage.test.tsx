import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { TrashPage } from '@/app/trash/TrashPage';
import * as postsSvc from '@/services/posts';
import * as clientsSvc from '@/services/clients';
import * as authSvc from '@/services/auth';
import type { Post, Profile } from '@/shared/types';

vi.mock('@/services/posts');
vi.mock('@/services/clients');
vi.mock('@/services/auth');

const prof = (role: Profile['role']): Profile => ({
  id: 'me',
  fullName: '',
  email: 'me@a.test',
  role,
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

const trashedPost: Post = {
  id: 'p1',
  clientId: 'c1',
  network: 'instagram',
  scheduledAt: '2026-07-01T08:00:00Z',
  caption: 'Post supprimé',
  canvaUrl: null,
  canvaThumbnailUrl: null,
  canvaThumbnailSource: null,
  canvaFetchedAt: null,
  status: 'draft',
  authorId: 'me',
  campaignId: null,
  performanceNote: null,
  performanceVisibleToClient: false,
  statusChangedAt: '',
  deletedAt: '2026-08-01T10:00:00Z',
  createdAt: '',
  updatedAt: '',
};

afterEach(() => vi.resetAllMocks());

describe('TrashPage', () => {
  it('un CM n\'y a pas accès', async () => {
    vi.mocked(authSvc.getCurrentProfile).mockResolvedValue(prof('cm'));
    vi.mocked(postsSvc.listTrashedPosts).mockResolvedValue([]);
    vi.mocked(clientsSvc.listTrashedClients).mockResolvedValue([]);
    vi.mocked(clientsSvc.listClients).mockResolvedValue([]);
    const { container } = renderWithProviders(<TrashPage />);
    // rendu null → pas de titre
    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector('h1')).toBeNull();
  });

  it('un Lead voit les posts en corbeille et peut restaurer ; pas de bouton Purger', async () => {
    vi.mocked(authSvc.getCurrentProfile).mockResolvedValue(prof('lead'));
    vi.mocked(postsSvc.listTrashedPosts).mockResolvedValue([trashedPost]);
    vi.mocked(clientsSvc.listTrashedClients).mockResolvedValue([]);
    vi.mocked(clientsSvc.listClients).mockResolvedValue([]);
    vi.mocked(postsSvc.restorePost).mockResolvedValue();

    renderWithProviders(<TrashPage />);

    expect(await screen.findByText('Post supprimé')).toBeInTheDocument();
    expect(screen.getByText(/purge le/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /purger/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restaurer/i })).toBeInTheDocument();
  });

  it('un Admin a le bouton Purger', async () => {
    vi.mocked(authSvc.getCurrentProfile).mockResolvedValue(prof('admin'));
    vi.mocked(postsSvc.listTrashedPosts).mockResolvedValue([trashedPost]);
    vi.mocked(clientsSvc.listTrashedClients).mockResolvedValue([]);
    vi.mocked(clientsSvc.listClients).mockResolvedValue([]);

    renderWithProviders(<TrashPage />);
    expect(await screen.findByRole('button', { name: /purger/i })).toBeInTheDocument();
  });
});
