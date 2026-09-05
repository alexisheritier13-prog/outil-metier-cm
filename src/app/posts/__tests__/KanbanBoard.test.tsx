import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { KanbanBoard } from '@/app/posts/KanbanBoard';
import type { Post } from '@/shared/types';
import type { Role } from '@/shared/constants/roles';

vi.mock('@/services/posts');
vi.mock('@/services/clients');
vi.mock('@/services/workflowSettings', () => ({
  getWorkflowSettings: vi.fn().mockResolvedValue({ skipInternalReview: false }),
}));

const mk = (over: Partial<Post>): Post => ({
  id: Math.random().toString(),
  clientId: 'c1',
  network: 'instagram',
  scheduledAt: '2026-07-01T08:00:00.000Z',
  caption: 'Un post',
  canvaUrl: null,
  status: 'draft',
  authorId: 'me',
  campaignId: null,
  pillarId: null,
  originType: null,
  originId: null,
  performanceNote: null,
  performanceVisibleToClient: false,
  statusChangedAt: '',
  deletedAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

afterEach(() => vi.resetAllMocks());

describe('KanbanBoard', () => {
  it('répartit les posts dans les colonnes de statut', () => {
    renderWithProviders(
      <KanbanBoard
        posts={[
          mk({ status: 'draft', caption: 'Brouillon A' }),
          mk({ status: 'approved', caption: 'Validé B' }),
        ]}
        role={'lead' as Role}
        clientName={() => 'Studio'}
        authorById={new Map()}
        onOpen={() => {}}
      />,
    );

    // Une colonne par statut, y compris « Publié » (posts déjà publiés non masqués).
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByText('Validé')).toBeInTheDocument();
    expect(screen.getByText('Publié')).toBeInTheDocument();
    expect(screen.getByText('Brouillon A')).toBeInTheDocument();
    expect(screen.getByText('Validé B')).toBeInTheDocument();
  });
});
