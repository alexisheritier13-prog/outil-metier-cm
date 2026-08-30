import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { OnboardingTab } from '@/app/clients/tabs/OnboardingTab';
import * as svc from '@/services/onboarding';
import type { OnboardingItem } from '@/shared/types';

vi.mock('@/services/onboarding');

const item = (o: Partial<OnboardingItem>): OnboardingItem => ({
  id: 'i1',
  clientId: 'c1',
  label: 'Étape 1',
  position: 0,
  isDone: false,
  doneAt: null,
  doneBy: null,
  ...o,
});

afterEach(() => vi.resetAllMocks());

describe('OnboardingTab', () => {
  it('affiche l\'avancement et coche une étape', async () => {
    vi.mocked(svc.listOnboardingItems).mockResolvedValue([
      item({ id: 'a', label: 'Accès sociaux', isDone: true }),
      item({ id: 'b', label: 'Valider la charte', position: 1 }),
    ]);
    vi.mocked(svc.setOnboardingItemDone).mockResolvedValue();

    renderWithProviders(<OnboardingTab clientId="c1" />);

    expect(await screen.findByText('1/2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Valider la charte' }));
    expect(svc.setOnboardingItemDone).toHaveBeenCalledWith('b', true);
  });

  it('ajoute une étape', async () => {
    vi.mocked(svc.listOnboardingItems).mockResolvedValue([item({})]);
    vi.mocked(svc.addOnboardingItem).mockResolvedValue(item({ id: 'n', label: 'Nouvelle' }));

    renderWithProviders(<OnboardingTab clientId="c1" />);
    await userEvent.type(await screen.findByLabelText(/nouvelle étape/i), 'Brief initial');
    await userEvent.click(screen.getByRole('button', { name: /^ajouter$/i }));
    expect(svc.addOnboardingItem).toHaveBeenCalledWith('c1', 'Brief initial', 1);
  });
});
