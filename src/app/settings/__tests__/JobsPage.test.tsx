import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { JobsPage } from '@/app/settings/JobsPage';
import * as jobsService from '@/services/jobs';
import * as alertsService from '@/services/alerts';
import * as authService from '@/services/auth';
import type { Profile } from '@/shared/types';

vi.mock('@/services/jobs');
vi.mock('@/services/alerts');
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

describe('JobsPage', () => {
  afterEach(() => vi.resetAllMocks());

  it('affiche les exécutions et leur résultat', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('admin'));
    vi.mocked(jobsService.listJobRuns).mockResolvedValue([
      {
        id: 1,
        jobName: 'generate_alerts',
        startedAt: '2026-08-31T02:15:00Z',
        finishedAt: '2026-08-31T02:15:01Z',
        ok: true,
        stats: { created: 4, dismissed: 1 },
        error: null,
      },
      {
        id: 2,
        jobName: 'purge_trash',
        startedAt: '2026-08-31T03:30:00Z',
        finishedAt: '2026-08-31T03:30:00Z',
        ok: false,
        stats: {},
        error: 'connexion perdue',
      },
    ]);

    renderWithProviders(<JobsPage />);

    expect(await screen.findByText('Détection des alertes')).toBeInTheDocument();
    expect(screen.getByText(/created : 4 · dismissed : 1/)).toBeInTheDocument();
    expect(screen.getByText('connexion perdue')).toBeInTheDocument();
  });

  it('bouton « Lancer la détection »', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('admin'));
    vi.mocked(jobsService.listJobRuns).mockResolvedValue([]);
    vi.mocked(alertsService.runGenerateAlerts).mockResolvedValue({ created: 0, dismissed: 0 });

    renderWithProviders(<JobsPage />);
    await userEvent.click(await screen.findByRole('button', { name: /lancer la détection/i }));
    expect(alertsService.runGenerateAlerts).toHaveBeenCalled();
  });

  it('rien pour un non-admin', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(prof('lead'));
    vi.mocked(jobsService.listJobRuns).mockResolvedValue([]);
    const { container } = renderWithProviders(<JobsPage />);
    expect(container).toBeEmptyDOMElement();
  });
});
