import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ClientsPage } from '@/app/clients/ClientsPage';
import * as clientsService from '@/services/clients';
import * as authService from '@/services/auth';
import type { Client, Profile } from '@/shared/types';

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

const client = (over: Partial<Client>): Client => ({
  id: 'c1',
  name: 'Studio Lumen',
  logoUrl: null,
  sector: 'design',
  isArchived: false,
  archivedAt: null,
  deletedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
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

  it('affiche la liste et masque « Nouveau client » pour un CM', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('cm'));
    vi.mocked(clientsService.listClients).mockResolvedValue([client({})]);

    renderWithProviders(tree());

    expect(await screen.findByText('Studio Lumen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nouveau client/i })).not.toBeInTheDocument();
  });

  it('montre « Nouveau client » pour un lead et filtre par recherche', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('lead'));
    vi.mocked(clientsService.listClients).mockResolvedValue([
      client({ id: 'a', name: 'Alpha' }),
      client({ id: 'b', name: 'Beta' }),
    ]);

    renderWithProviders(tree());

    expect(await screen.findByRole('button', { name: /nouveau client/i })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/rechercher un client/i), 'alph');
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('état vide quand aucun client', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('admin'));
    vi.mocked(clientsService.listClients).mockResolvedValue([]);

    renderWithProviders(tree());
    expect(await screen.findByText(/aucun client pour le moment/i)).toBeInTheDocument();
  });
});
