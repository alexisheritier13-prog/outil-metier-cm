import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { SocialAccountsTab } from '@/app/clients/tabs/SocialAccountsTab';
import * as svc from '@/services/socialAccounts';
import type { NetworkRef, SocialAccount } from '@/shared/types';

vi.mock('@/services/socialAccounts');

const networks: NetworkRef[] = [
  { code: 'instagram', label: 'Instagram', specs: 'Post 1080×1080.', position: 1 },
  { code: 'linkedin', label: 'LinkedIn', specs: 'Image 1200×627.', position: 2 },
];

afterEach(() => vi.resetAllMocks());

describe('SocialAccountsTab', () => {
  it('état vide puis ouverture du formulaire d\'ajout', async () => {
    vi.mocked(svc.listNetworks).mockResolvedValue(networks);
    vi.mocked(svc.listSocialAccounts).mockResolvedValue([]);

    renderWithProviders(<SocialAccountsTab clientId="c1" />);

    expect(await screen.findByText(/aucun compte social/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ajouter un compte/i }));
    expect(screen.getByLabelText(/identifiant/i)).toBeInTheDocument();
    // specs indicatives affichées
    expect(screen.getByText(/1080×1080/)).toBeInTheDocument();
  });

  it('liste les comptes existants', async () => {
    const accounts: SocialAccount[] = [
      { id: 'a', clientId: 'c1', network: 'instagram', handle: '@studio', createdAt: '' },
    ];
    vi.mocked(svc.listNetworks).mockResolvedValue(networks);
    vi.mocked(svc.listSocialAccounts).mockResolvedValue(accounts);

    renderWithProviders(<SocialAccountsTab clientId="c1" />);
    expect(await screen.findByText('@studio')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
  });

  it('ajoute un compte', async () => {
    vi.mocked(svc.listNetworks).mockResolvedValue(networks);
    vi.mocked(svc.listSocialAccounts).mockResolvedValue([]);
    vi.mocked(svc.addSocialAccount).mockResolvedValue({
      id: 'n',
      clientId: 'c1',
      network: 'linkedin',
      handle: '@lumen',
      createdAt: '',
    });

    renderWithProviders(<SocialAccountsTab clientId="c1" />);
    await userEvent.click(await screen.findByRole('button', { name: /ajouter un compte/i }));
    await userEvent.selectOptions(screen.getByLabelText(/réseau/i), 'linkedin');
    await userEvent.type(screen.getByLabelText(/identifiant/i), '@lumen');
    await userEvent.click(screen.getByRole('button', { name: /^ajouter$/i }));

    expect(svc.addSocialAccount).toHaveBeenCalledWith('c1', 'linkedin', '@lumen');
  });
});
