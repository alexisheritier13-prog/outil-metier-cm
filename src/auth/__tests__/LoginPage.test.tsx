import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { LoginPage } from '@/auth/LoginPage';
import * as authService from '@/services/auth';
import { AccountDisabledError, InvalidCredentialsError } from '@/services/auth';
import type { Profile } from '@/shared/types';

vi.mock('@/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof authService>();
  return { ...actual, signIn: vi.fn(), getCurrentProfile: vi.fn() };
});

const profile: Profile = {
  id: 'u1',
  fullName: 'Léa',
  email: 'lea@example.test',
  role: 'cm',
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

function Tree() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/app" element={<div>espace agence</div>} />
    </Routes>
  );
}

describe('LoginPage', () => {
  afterEach(() => vi.resetAllMocks());

  it('valide les champs requis', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);
    renderWithProviders(<Tree />);
    await userEvent.click(await screen.findByRole('button', { name: /se connecter/i }));
    expect(await screen.findByText(/email requis/i)).toBeInTheDocument();
    expect(screen.getByText(/mot de passe requis/i)).toBeInTheDocument();
    expect(authService.signIn).not.toHaveBeenCalled();
  });

  it('connecte et redirige vers /app', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);
    vi.mocked(authService.signIn).mockResolvedValue(profile);
    renderWithProviders(<Tree />);

    await userEvent.type(await screen.findByLabelText(/e-?mail/i), 'lea@example.test');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText('espace agence')).toBeInTheDocument();
  });

  it('affiche le message quand le compte est désactivé', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);
    vi.mocked(authService.signIn).mockRejectedValue(new AccountDisabledError());
    renderWithProviders(<Tree />);

    await userEvent.type(await screen.findByLabelText(/e-?mail/i), 'x@example.test');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText(/compte est désactivé/i)).toBeInTheDocument();
  });

  it('affiche le message pour des identifiants invalides', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);
    vi.mocked(authService.signIn).mockRejectedValue(new InvalidCredentialsError());
    renderWithProviders(<Tree />);

    await userEvent.type(await screen.findByLabelText(/e-?mail/i), 'x@example.test');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'bad');
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText(/incorrect/i)).toBeInTheDocument();
  });

  it('redirige si déjà connecté', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(profile);
    renderWithProviders(<Tree />);
    await waitFor(() => expect(screen.getByText('espace agence')).toBeInTheDocument());
  });
});
