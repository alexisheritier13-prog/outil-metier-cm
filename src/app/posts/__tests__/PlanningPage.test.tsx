import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { PlanningPage } from '@/app/posts/PlanningPage';
import * as postsSvc from '@/services/posts';
import * as clientsSvc from '@/services/clients';
import * as authSvc from '@/services/auth';
import type { Client, Post, Profile } from '@/shared/types';

vi.mock('@/services/posts');
vi.mock('@/services/clients');
vi.mock('@/services/auth');
vi.mock('@/services/users', () => ({ listInternalUsers: vi.fn().mockResolvedValue([]) }));
// Évite de charger FullCalendar dans jsdom.
vi.mock('@/app/posts/CalendarView', () => ({
  CalendarView: ({ posts }: { posts: Post[] }) => <div>calendrier ({posts.length})</div>,
}));

const me: Profile = {
  id: 'me',
  fullName: 'Admin',
  email: 'a@a.test',
  role: 'admin',
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const client: Client = {
  id: 'c1',
  name: 'Studio Lumen',
  logoUrl: null,
  sector: null,
  isArchived: false,
  archivedAt: null,
  deletedAt: null,
  createdAt: '',
  updatedAt: '',
};

const post: Post = {
  id: 'p1',
  clientId: 'c1',
  network: 'instagram',
  scheduledAt: '2026-07-01T08:00:00.000Z',
  caption: 'Bonjour le monde',
  canvaUrl: null,
  canvaThumbnailUrl: null,
  canvaThumbnailSource: null,
  canvaFetchedAt: null,
  status: 'draft',
  authorId: 'me',
  campaignId: null,
  originType: null,
  originId: null,
  performanceNote: null,
  performanceVisibleToClient: false,
  statusChangedAt: '',
  deletedAt: null,
  createdAt: '',
  updatedAt: '',
};

afterEach(() => vi.resetAllMocks());

describe('PlanningPage', () => {
  it('bascule entre calendrier et liste', async () => {
    vi.mocked(authSvc.getCurrentProfile).mockResolvedValue(me);
    vi.mocked(clientsSvc.listClients).mockResolvedValue([client]);
    vi.mocked(postsSvc.listPosts).mockResolvedValue([post]);

    renderWithProviders(<PlanningPage />);

    // Vue mois par défaut → CalendarView mocké
    expect(await screen.findByText('calendrier (1)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Liste' }));
    expect(await screen.findByText('Bonjour le monde')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Kanban' }));
    expect(await screen.findAllByText('Brouillon')).not.toHaveLength(0);
  });

  it('désactive « Nouveau post » sans client', async () => {
    vi.mocked(authSvc.getCurrentProfile).mockResolvedValue(me);
    vi.mocked(clientsSvc.listClients).mockResolvedValue([]);
    vi.mocked(postsSvc.listPosts).mockResolvedValue([]);

    renderWithProviders(<PlanningPage />);
    expect(await screen.findByRole('button', { name: /nouveau post/i })).toBeDisabled();
  });
});
