import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { GuidelinesTab } from '@/app/clients/tabs/GuidelinesTab';
import * as svc from '@/services/editorialGuidelines';
import { EMPTY_GUIDELINE } from '@/shared/types';

vi.mock('@/services/editorialGuidelines');

afterEach(() => vi.resetAllMocks());

describe('GuidelinesTab', () => {
  it('pré-remplit et enregistre la charte', async () => {
    vi.mocked(svc.getEditorialGuideline).mockResolvedValue({
      ...EMPTY_GUIDELINE('c1'),
      tone: 'Direct.',
    });
    vi.mocked(svc.saveEditorialGuideline).mockResolvedValue({
      ...EMPTY_GUIDELINE('c1'),
      tone: 'Direct et chaleureux.',
    });

    renderWithProviders(<GuidelinesTab clientId="c1" />);

    const tone = await screen.findByLabelText(/ton de voix/i);
    await waitFor(() => expect(tone).toHaveValue('Direct.'));

    await userEvent.type(tone, ' et chaleureux.');
    await userEvent.click(screen.getByRole('button', { name: /enregistrer la charte/i }));

    expect(svc.saveEditorialGuideline).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ tone: 'Direct. et chaleureux.' }),
    );
    expect(await screen.findByText(/enregistré\./i)).toBeInTheDocument();
  });
});
