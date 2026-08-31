import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { AlertsPage } from '@/app/alerts/AlertsPage';
import * as alertsService from '@/services/alerts';
import * as clientsService from '@/services/clients';
import * as authService from '@/services/auth';
import type { Alert, Profile } from '@/shared/types';

vi.mock('@/services/alerts');
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

const alert = (over: Partial<Alert>): Alert => ({
  id: 'a1',
  type: 'validation_overdue',
  severity: 'warning',
  clientId: 'c1',
  postId: 'p1',
  targetRole: null,
  targetUserId: null,
  message: 'En attente de validation depuis plus de 3 jours.',
  status: 'new',
  createdAt: '',
  ...over,
});

function setup(role: Profile['role'], alerts: Alert[]) {
  vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof(role));
  vi.mocked(clientsService.listClients).mockResolvedValue([{ id: 'c1', name: 'Studio Lumen' } as never]);
  vi.mocked(alertsService.listAlerts).mockResolvedValue(alerts);
}

describe('AlertsPage', () => {
  afterEach(() => vi.resetAllMocks());

  it('liste les alertes et permet de marquer vue / ignorer', async () => {
    setup('cm', [alert({})]);
    vi.mocked(alertsService.setAlertStatus).mockResolvedValue();
    renderWithProviders(<AlertsPage />);

    expect(await screen.findByText(/en attente de validation/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ignorer/i }));
    expect(alertsService.setAlertStatus).toHaveBeenCalledWith('a1', 'dismissed');
  });

  it('un CM ne voit pas le bouton « Lancer la détection »', async () => {
    setup('cm', []);
    renderWithProviders(<AlertsPage />);
    await screen.findByText(/aucune alerte/i);
    expect(screen.queryByRole('button', { name: /lancer la détection/i })).not.toBeInTheDocument();
  });

  it('un Lead peut lancer la détection', async () => {
    setup('lead', []);
    vi.mocked(alertsService.runGenerateAlerts).mockResolvedValue({ created: 2, dismissed: 1 });
    renderWithProviders(<AlertsPage />);

    await userEvent.click(await screen.findByRole('button', { name: /lancer la détection/i }));
    expect(alertsService.runGenerateAlerts).toHaveBeenCalled();
  });
});
