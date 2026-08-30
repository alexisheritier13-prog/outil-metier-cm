import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ClientsPage } from '@/app/clients/ClientsPage';
import * as clientsService from '@/services/clients';
import * as authService from '@/services/auth';
import type { ClientOverview, Profile } from '@/shared/types';

vi.mock('@/services/clients');
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

const ov = (over: Partial<ClientOverview>): ClientOverview => ({
  id: 'c1',
  name: 'Studio Lumen',
  logoUrl: null,
  sector: 'design',
  isArchived: false,
  onboardingDone: 2,
  onboardingTotal: 7,
  pendingInternal: 0,
  pendingClient: 0,
  lastActivityAt: '2026-01-01',
  ...over,
});

function tree() {
  return (
    <Routes>
      <Route path="/" element={<ClientsPage />} />
      <Route path="/app/clients/:id" element={<div>fiche client</div>} />
    </Routes>
  );
}

describe('ClientsPage', () => {
  afterEach(() => vi.resetAllMocks());

  it('affiche la liste + avancement onboarding et masque « Nouveau client » pour un CM', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('cm'));
    vi.mocked(clientsService.listClientOverview).mockResolvedValue([ov({})]);

    renderWithProviders(tree());

    expect(await screen.findByText('Studio Lumen')).toBeInTheDocument();
    expect(screen.getByText('2/7')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nouveau client/i })).not.toBeInTheDocument();
  });

  it('trie par avancement onboarding', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('lead'));
    vi.mocked(clientsService.listClientOverview).mockResolvedValue([
      ov({ id: 'a', name: 'Alpha', onboardingDone: 1, onboardingTotal: 4 }),
      ov({ id: 'b', name: 'Beta', onboardingDone: 4, onboardingTotal: 4 }),
    ]);

    renderWithProviders(tree());
    await userEvent.click(await screen.findByRole('button', { name: /onboarding/i }));

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Alpha');
    expect(rows[1]).toHaveTextContent('Beta');
  });

  it('état vide quand aucun client', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('admin'));
    vi.mocked(clientsService.listClientOverview).mockResolvedValue([]);

    renderWithProviders(tree());
    expect(await screen.findByText(/aucun client pour le moment/i)).toBeInTheDocument();
  });
});
