import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ReviewQueuePage } from '@/app/review/ReviewQueuePage';
import * as postsService from '@/services/posts';
import * as clientsService from '@/services/clients';
import * as usersService from '@/services/users';
import * as authService from '@/services/auth';
import type { Post, Profile } from '@/shared/types';

vi.mock('@/services/posts');
vi.mock('@/services/clients');
vi.mock('@/services/users');
vi.mock('@/services/auth');

const prof = (role: Profile['role']): Profile => ({
  id: 'me',
  fullName: 'Moi',
  email: 'me@a.test',
  role,
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

const post = (over: Partial<Post>): Post => ({
  id: 'p1',
  clientId: 'c1',
  network: 'instagram',
  scheduledAt: '2026-10-01T08:00:00Z',
  caption: 'Une légende',
  canvaUrl: null,
  canvaThumbnailUrl: null,
  canvaThumbnailSource: null,
  canvaFetchedAt: null,
  status: 'internal_review',
  authorId: 'a1',
  campaignId: null,
  originType: null,
  originId: null,
  performanceNote: null,
  performanceVisibleToClient: false,
  statusChangedAt: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(),
  deletedAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('ReviewQueuePage', () => {
  afterEach(() => vi.resetAllMocks());

  it('liste les posts à valider en interne avec client, rédacteur et ancienneté', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('lead'));
    vi.mocked(clientsService.listClients).mockResolvedValue([
      { id: 'c1', name: 'Studio Lumen' } as never,
    ]);
    vi.mocked(usersService.listInternalUsers).mockResolvedValue([
      { id: 'a1', fullName: 'Alex CM', email: 'alex@a.test' } as never,
    ]);
    vi.mocked(postsService.listReviewQueue).mockResolvedValue([post({})]);

    renderWithProviders(<ReviewQueuePage />);

    const row = (await screen.findByRole('cell', { name: 'Studio Lumen' })).closest('tr')!;
    expect(within(row).getByText('Alex CM')).toBeInTheDocument();
    expect(within(row).getByText('3 jours')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /valider en interne/i })).toBeInTheDocument();
  });

  it('bascule sur « En attente du client » et propose la relance', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('cm'));
    vi.mocked(clientsService.listClients).mockResolvedValue([
      { id: 'c1', name: 'Studio Lumen' } as never,
    ]);
    vi.mocked(usersService.listInternalUsers).mockResolvedValue([]);
    vi.mocked(postsService.listReviewQueue).mockImplementation((kind) =>
      Promise.resolve(kind === 'client' ? [post({ status: 'client_review' })] : []),
    );

    renderWithProviders(<ReviewQueuePage />);

    await userEvent.click(await screen.findByRole('tab', { name: /en attente du client/i }));
    expect(await screen.findByRole('button', { name: /relancer le client/i })).toBeInTheDocument();
    // un CM ne voit pas « Valider en interne »
    expect(screen.queryByRole('button', { name: /valider en interne/i })).not.toBeInTheDocument();
  });

  it('état vide', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('admin'));
    vi.mocked(clientsService.listClients).mockResolvedValue([]);
    vi.mocked(usersService.listInternalUsers).mockResolvedValue([]);
    vi.mocked(postsService.listReviewQueue).mockResolvedValue([]);

    renderWithProviders(<ReviewQueuePage />);
    expect(await screen.findByText(/aucun post en attente de validation interne/i)).toBeInTheDocument();
  });
});
