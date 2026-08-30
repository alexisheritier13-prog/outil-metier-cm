import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ContactsTab } from '@/app/clients/tabs/ContactsTab';
import * as svc from '@/services/clientContacts';
import * as authService from '@/services/auth';
import type { ClientContact, Profile } from '@/shared/types';

vi.mock('@/services/clientContacts');
vi.mock('@/services/auth');

const prof = (role: Profile['role']): Profile => ({
  id: 'me',
  fullName: '',
  email: 'me@a.test',
  role,
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

const contact = (o: Partial<ClientContact>): ClientContact => ({
  id: 'k1',
  clientId: 'c1',
  fullName: 'Marie Client',
  email: 'marie@client.test',
  authUserId: null,
  isActive: true,
  createdAt: '',
  ...o,
});

afterEach(() => vi.resetAllMocks());

describe('ContactsTab', () => {
  it('CM : lecture seule (pas de bouton Inviter ni Ajouter)', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('cm'));
    vi.mocked(svc.listClientContacts).mockResolvedValue([contact({})]);

    renderWithProviders(<ContactsTab clientId="c1" />);

    expect(await screen.findByText('marie@client.test')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inviter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajouter un contact/i })).not.toBeInTheDocument();
    expect(screen.getByText(/sans accès/i)).toBeInTheDocument();
  });

  it('Lead : invite un contact et voit le lien', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('lead'));
    vi.mocked(svc.listClientContacts).mockResolvedValue([contact({})]);
    vi.mocked(svc.inviteClientContact).mockResolvedValue({
      contact: contact({ authUserId: 'u9' }),
      isNewAccount: true,
      actionLink: 'https://app/reset#abc',
    });

    renderWithProviders(<ContactsTab clientId="c1" />);

    await userEvent.click(await screen.findByRole('button', { name: /inviter/i }));
    expect(svc.inviteClientContact).toHaveBeenCalledWith('c1', 'Marie Client', 'marie@client.test');
    expect(await screen.findByText('https://app/reset#abc')).toBeInTheDocument();
  });

  it('Lead : état vide avec action', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('lead'));
    vi.mocked(svc.listClientContacts).mockResolvedValue([]);

    renderWithProviders(<ContactsTab clientId="c1" />);
    expect(await screen.findByText(/aucun contact de validation/i)).toBeInTheDocument();
  });
});
