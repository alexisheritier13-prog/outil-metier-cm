import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { PortalBriefsPage } from '@/portal/PortalBriefsPage';
import { PortalClientContext } from '@/portal/PortalClientContext';
import * as requestsService from '@/services/clientRequests';
import type { Client, ClientRequest } from '@/shared/types';

vi.mock('@/services/clientRequests');

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

const req = (over: Partial<ClientRequest>): ClientRequest => ({
  id: 'r1',
  clientId: 'c1',
  createdBy: 'u1',
  title: 'Demande soldes',
  description: 'desc',
  wantedNetwork: 'instagram',
  wantedDate: null,
  status: 'nouvelle',
  createdAt: '',
  updatedAt: '',
  ...over,
});

function render(requests: ClientRequest[]) {
  vi.mocked(requestsService.listClientRequests).mockResolvedValue(requests);
  vi.mocked(requestsService.listPostsFromRequest).mockResolvedValue([]);
  vi.mocked(requestsService.listClientRequestComments).mockResolvedValue([]);
  return renderWithProviders(
    <PortalClientContext.Provider value={client}>
      <PortalBriefsPage />
    </PortalClientContext.Provider>,
  );
}

describe('PortalBriefsPage', () => {
  afterEach(() => vi.resetAllMocks());

  it('ouvre le formulaire de nouvelle demande', async () => {
    render([]);
    await userEvent.click(await screen.findByRole('button', { name: /nouvelle demande/i }));
    expect(screen.getByLabelText('Titre')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('« Modifier » proposé sur une demande encore ouverte', async () => {
    render([req({ id: 'r1', title: 'Brief soldes ete', status: 'nouvelle' })]);
    await userEvent.click(await screen.findByText('Brief soldes ete'));
    expect(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Modifier' }),
    ).toBeInTheDocument();
  });

  it('pas de « Modifier » sur une demande déjà traitée', async () => {
    render([req({ id: 'r2', title: 'Brief rentree', status: 'traitee' })]);
    await userEvent.click(await screen.findByText('Brief rentree'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
  });
});
