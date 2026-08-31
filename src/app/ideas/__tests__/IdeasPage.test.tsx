import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { IdeasPage } from '@/app/ideas/IdeasPage';
import * as ideasService from '@/services/ideas';
import * as clientsService from '@/services/clients';
import * as tagsService from '@/services/tags';
import * as authService from '@/services/auth';
import type { Idea, Profile } from '@/shared/types';

vi.mock('@/services/ideas');
vi.mock('@/services/clients');
vi.mock('@/services/tags');
vi.mock('@/services/auth');

const prof: Profile = {
  id: 'me',
  fullName: 'Moi',
  email: 'me@a.test',
  role: 'cm',
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const idea = (over: Partial<Idea>): Idea => ({
  id: 'i1',
  title: 'Carrousel astuces',
  description: '5 conseils',
  clientId: null,
  originRequestId: null,
  createdBy: 'me',
  createdAt: '',
  updatedAt: '',
  ...over,
});

function setup(ideas: Idea[]) {
  vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof);
  vi.mocked(clientsService.listClients).mockResolvedValue([
    { id: 'c1', name: 'Studio Lumen' } as never,
  ]);
  vi.mocked(tagsService.listTags).mockResolvedValue([]);
  vi.mocked(ideasService.listIdeas).mockResolvedValue(ideas);
  vi.mocked(ideasService.getIdeaTagIds).mockResolvedValue([]);
}

describe('IdeasPage', () => {
  afterEach(() => vi.resetAllMocks());

  it('liste les idées et ouvre le formulaire de création', async () => {
    setup([idea({})]);
    renderWithProviders(<IdeasPage />);

    expect(await screen.findByText('Carrousel astuces')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /nouvelle idée/i }));
    expect(screen.getByLabelText('Titre')).toBeInTheDocument();
  });

  it('« Créer le brouillon » exige un client quand l’idée n’en a pas', async () => {
    setup([idea({ clientId: null })]);
    renderWithProviders(<IdeasPage />);

    await userEvent.click(await screen.findByText('Carrousel astuces'));
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByLabelText('Client du post')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /créer le brouillon/i })).toBeDisabled();
  });

  it('idée déjà rattachée à un client : pas de sélecteur, bouton actif', async () => {
    setup([idea({ clientId: 'c1' })]);
    renderWithProviders(<IdeasPage />);

    await userEvent.click(await screen.findByText('Carrousel astuces'));
    const panel = await screen.findByRole('dialog');
    expect(within(panel).queryByLabelText('Client du post')).not.toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /créer le brouillon/i })).toBeEnabled();
  });
});
