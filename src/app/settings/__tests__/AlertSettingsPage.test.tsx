import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { AlertSettingsPage } from '@/app/settings/AlertSettingsPage';
import * as settingsService from '@/services/alertSettings';
import { DEFAULT_THRESHOLDS } from '@/services/alertSettings';
import * as authService from '@/services/auth';
import type { Profile } from '@/shared/types';

vi.mock('@/services/alertSettings', async (orig) => ({
  ...(await orig<typeof import('@/services/alertSettings')>()),
  getAlertThresholds: vi.fn(),
  saveAlertThresholds: vi.fn(),
}));
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

describe('AlertSettingsPage', () => {
  afterEach(() => vi.resetAllMocks());

  it('affiche les seuils courants et enregistre', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('admin'));
    vi.mocked(settingsService.getAlertThresholds).mockResolvedValue(DEFAULT_THRESHOLDS);
    vi.mocked(settingsService.saveAlertThresholds).mockResolvedValue();

    renderWithProviders(<AlertSettingsPage />);

    const field = await screen.findByLabelText(/validation en retard/i);
    expect(field).toHaveValue(3);
    await userEvent.clear(field);
    await userEvent.type(field, '5');
    await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(settingsService.saveAlertThresholds).toHaveBeenCalledWith(
      expect.objectContaining({ validation_overdue_days: 5 }),
    );
  });

  it('bloque l’enregistrement hors bornes', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('admin'));
    vi.mocked(settingsService.getAlertThresholds).mockResolvedValue(DEFAULT_THRESHOLDS);

    renderWithProviders(<AlertSettingsPage />);
    const field = await screen.findByLabelText(/validation en retard/i);
    await userEvent.clear(field);
    await userEvent.type(field, '99');

    expect(await screen.findByText(/entre 1 et 30/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  it('rien pour un non-admin', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('lead'));
    vi.mocked(settingsService.getAlertThresholds).mockResolvedValue(DEFAULT_THRESHOLDS);
    const { container } = renderWithProviders(<AlertSettingsPage />);
    expect(container).toBeEmptyDOMElement();
  });
});
