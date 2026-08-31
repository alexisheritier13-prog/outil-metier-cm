import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { PortalPostDetail } from '@/portal/PortalPostDetail';
import * as portalService from '@/services/portal';
import * as clientReview from '@/services/clientReview';
import type { Post } from '@/shared/types';

vi.mock('@/services/portal');
vi.mock('@/services/clientReview');

const post = (over: Partial<Post>): Post => ({
  id: 'p1',
  clientId: 'c1',
  network: 'instagram',
  scheduledAt: '2026-12-01T08:00:00Z',
  caption: 'Une légende',
  canvaUrl: null,
  status: 'client_review',
  authorId: 'a1',
  campaignId: null,
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

describe('PortalPostDetail', () => {
  afterEach(() => vi.resetAllMocks());

  it('propose Approuver / Demander une modification sur un post à valider', async () => {
    vi.mocked(portalService.listPortalComments).mockResolvedValue([]);
    renderWithProviders(<PortalPostDetail post={post({})} onClose={() => {}} />);

    expect(await screen.findByRole('button', { name: 'Approuver' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /demander une modification/i }),
    ).toBeInTheDocument();
  });

  it('le refus exige un commentaire puis appelle rejectPost', async () => {
    vi.mocked(portalService.listPortalComments).mockResolvedValue([]);
    vi.mocked(clientReview.rejectPost).mockResolvedValue(post({ status: 'draft' }));
    renderWithProviders(<PortalPostDetail post={post({})} onClose={() => {}} />);

    await userEvent.click(await screen.findByRole('button', { name: /demander une modification/i }));
    const send = screen.getByRole('button', { name: /envoyer la demande/i });
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/que faut-il modifier/i), 'Changer le visuel');
    expect(send).toBeEnabled();
    await userEvent.click(send);

    expect(clientReview.rejectPost).toHaveBeenCalledWith('p1', 'Changer le visuel');
  });

  it('pas d’actions de validation sur un post déjà validé', async () => {
    vi.mocked(portalService.listPortalComments).mockResolvedValue([]);
    renderWithProviders(<PortalPostDetail post={post({ status: 'approved' })} onClose={() => {}} />);

    expect(await screen.findByText('Une légende')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument();
  });

  it('permet d’ajouter un commentaire client', async () => {
    vi.mocked(portalService.listPortalComments).mockResolvedValue([]);
    vi.mocked(portalService.addPortalComment).mockResolvedValue({
      id: 'x',
      postId: 'p1',
      authorId: 'u1',
      body: 'Merci !',
      visibility: 'client',
      createdAt: '',
      updatedAt: '',
    });
    renderWithProviders(<PortalPostDetail post={post({ status: 'approved' })} onClose={() => {}} />);

    await userEvent.type(await screen.findByLabelText(/nouveau commentaire/i), 'Merci !');
    await userEvent.click(screen.getByRole('button', { name: 'Commenter' }));

    expect(portalService.addPortalComment).toHaveBeenCalledWith('p1', 'Merci !');
  });
});
