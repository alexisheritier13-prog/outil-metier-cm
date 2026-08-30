import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { KanbanView } from '@/app/posts/KanbanView';
import type { Post } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';

vi.mock('@/services/posts');

const mk = (over: Partial<Post>): Post => ({
  id: Math.random().toString(),
  clientId: 'c1',
  network: 'instagram',
  scheduledAt: '2026-07-01T08:00:00.000Z',
  caption: 'Un post',
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
  deletedAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

afterEach(() => vi.resetAllMocks());

describe('KanbanView', () => {
  it('répartit les posts dans les colonnes de statut', () => {
    renderWithProviders(
      <KanbanView
        posts={[
          mk({ status: 'draft', caption: 'Brouillon A' }),
          mk({ status: 'approved', caption: 'Validé B' }),
        ]}
        role={'lead' as Role}
        clientName={() => 'Studio'}
        onOpen={() => {}}
      />,
    );

    // 6 colonnes de statut
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByText('Validé')).toBeInTheDocument();
    expect(screen.getByText('Brouillon A')).toBeInTheDocument();
    expect(screen.getByText('Validé B')).toBeInTheDocument();
  });
});
