import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { PortalLayout } from '@/portal/PortalLayout';
import { usePortalClient } from '@/portal/PortalClientContext';
import * as portalService from '@/services/portal';
import * as authService from '@/services/auth';
import type { Client, Profile } from '@/shared/types';

vi.mock('@/services/portal');
vi.mock('@/services/auth');

const client = (over: Partial<Client>): Client => ({
  id: 'c1',
  name: 'Studio Lumen',
  logoUrl: null,
  sector: null,
  isArchived: false,
  archivedAt: null,
  deletedAt: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const profile: Profile = {
  id: 'u1',
  fullName: 'Client Un',
  email: 'client@a.test',
  role: 'client',
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

function Child() {
  return <p>client actif : {usePortalClient().name}</p>;
}

function tree() {
  return (
    <Routes>
      <Route path="/" element={<PortalLayout />}>
        <Route index element={<Child />} />
      </Route>
    </Routes>
  );
}

describe('PortalLayout', () => {
  afterEach(() => vi.resetAllMocks());

  it('client unique : accès direct, nom affiché, pas de sélecteur', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(profile);
    vi.mocked(portalService.listMyClients).mockResolvedValue([client({})]);

    renderWithProviders(tree());

    expect(await screen.findByText('client actif : Studio Lumen')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /choisir le client/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Calendrier' })).toBeInTheDocument();
  });

  it('plusieurs clients : sélecteur proposé', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(profile);
    vi.mocked(portalService.listMyClients).mockResolvedValue([
      client({ id: 'c1', name: 'Alpha' }),
      client({ id: 'c2', name: 'Beta' }),
    ]);

    renderWithProviders(tree());

    expect(await screen.findByRole('combobox', { name: /choisir le client/i })).toBeInTheDocument();
  });

  it('aucun client rattaché : message dédié', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(profile);
    vi.mocked(portalService.listMyClients).mockResolvedValue([]);

    renderWithProviders(tree());

    expect(await screen.findByText(/aucun client rattaché/i)).toBeInTheDocument();
  });
});
