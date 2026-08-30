import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { RequireRole } from '@/auth/RequireRole';
import { INTERNAL_ROLES } from '@/shared/constants/roles';
import * as authService from '@/services/auth';
import type { Profile } from '@/shared/types';

vi.mock('@/services/auth');

const mkProfile = (over: Partial<Profile> = {}): Profile => ({
  id: 'u1',
  fullName: 'Test',
  email: 't@example.test',
  role: 'cm',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  ...over,
});

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<div>page login</div>} />
      <Route path="/portail" element={<div>accueil client</div>} />
      <Route
        path="/app"
        element={
          <RequireRole roles={INTERNAL_ROLES}>
            <div>zone interne</div>
          </RequireRole>
        }
      />
    </Routes>
  );
}

describe('RequireRole', () => {
  afterEach(() => vi.resetAllMocks());

  it('laisse passer un rôle autorisé', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(mkProfile({ role: 'lead' }));
    renderWithProviders(<Tree />, { route: '/app' });
    expect(await screen.findByText('zone interne')).toBeInTheDocument();
  });

  it('redirige vers /login sans session', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);
    renderWithProviders(<Tree />, { route: '/app' });
    expect(await screen.findByText('page login')).toBeInTheDocument();
  });

  it("redirige un client vers l'accueil de son rôle", async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(mkProfile({ role: 'client' }));
    renderWithProviders(<Tree />, { route: '/app' });
    await waitFor(() => expect(screen.getByText('accueil client')).toBeInTheDocument());
  });
});
