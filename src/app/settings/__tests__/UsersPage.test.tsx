import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { UsersPage } from '@/app/settings/UsersPage';
import * as usersService from '@/services/users';
import * as authService from '@/services/auth';
import type { Profile } from '@/shared/types';

vi.mock('@/services/users');
vi.mock('@/services/auth');

const mk = (o: Partial<Profile>): Profile => ({
  id: 'x',
  fullName: '',
  email: '',
  role: 'cm',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  ...o,
});

describe('UsersPage', () => {
  afterEach(() => vi.resetAllMocks());

  it('liste les utilisateurs et verrouille sa propre ligne', async () => {
    const me = mk({ id: 'me', email: 'me@a.test', role: 'admin', fullName: 'Moi' });
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(me);
    vi.mocked(usersService.listInternalUsers).mockResolvedValue([
      me,
      mk({ id: 'u2', email: 'lea@a.test', role: 'cm', fullName: 'Léa' }),
    ]);

    renderWithProviders(<UsersPage />);

    expect(await screen.findByText('lea@a.test')).toBeInTheDocument();
    expect(screen.getByText('me@a.test')).toBeInTheDocument();

    // La ligne "moi" : le select de rôle est désactivé.
    const myRoleSelect = screen.getByLabelText('Rôle de me@a.test');
    expect(myRoleSelect).toBeDisabled();
    const otherRoleSelect = screen.getByLabelText('Rôle de lea@a.test');
    expect(otherRoleSelect).not.toBeDisabled();
  });
});
