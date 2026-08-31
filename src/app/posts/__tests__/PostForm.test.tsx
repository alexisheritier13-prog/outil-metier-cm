import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { PostForm } from '@/app/posts/PostForm';
import type { Client } from '@/shared/types';
import type { PostInput } from '@/services/posts';

vi.mock('@/services/campaigns', () => ({ listCampaignsForClient: vi.fn().mockResolvedValue([]) }));
afterEach(() => vi.clearAllMocks());
const render = renderWithProviders;

const clients: Client[] = [
  {
    id: 'c1',
    name: 'Studio Lumen',
    logoUrl: null,
    sector: null,
    isArchived: false,
    archivedAt: null,
    deletedAt: null,
    createdAt: '',
    updatedAt: '',
  },
];

describe('PostForm', () => {
  it('valide les champs requis', async () => {
    const onSubmit = vi.fn();
    render(
      <PostForm clients={clients} submitLabel="Créer" pending={false} onSubmit={onSubmit} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /créer/i }));
    expect(await screen.findByText(/date et heure requises/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("convertit l'heure de Paris saisie en UTC (été → UTC+2)", async () => {
    const onSubmit = vi.fn<(i: PostInput) => void>();
    render(
      <PostForm clients={clients} submitLabel="Créer" pending={false} onSubmit={onSubmit} />,
    );

    const dt = screen.getByLabelText(/date et heure/i);
    // 1er juillet 2026, 10:00 à Paris → 08:00 UTC
    await userEvent.type(dt, '2026-07-01T10:00');
    await userEvent.type(screen.getByLabelText(/légende/i), 'Bonjour');
    await userEvent.click(screen.getByRole('button', { name: /créer/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'c1',
        network: 'instagram',
        scheduledAt: '2026-07-01T08:00:00.000Z',
        caption: 'Bonjour',
        canvaUrl: null,
      }),
    );
  });

  it('« Partir d\'un template » pré-remplit réseau, légende et tags', async () => {
    const onSubmit = vi.fn<(i: PostInput) => void>();
    render(
      <PostForm
        clients={clients}
        submitLabel="Créer"
        pending={false}
        onSubmit={onSubmit}
        templates={[
          {
            id: 't1',
            name: 'Citation lundi',
            description: '',
            network: 'linkedin',
            captionTemplate: 'Citation de la semaine',
            defaultTags: ['citation'],
            clientId: null,
            createdBy: 'u1',
            createdAt: '',
            updatedAt: '',
          },
        ]}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText(/partir d'un template/i), 't1');
    expect(screen.getByLabelText(/légende/i)).toHaveValue('Citation de la semaine');
    expect(screen.getByLabelText(/^réseau$/i)).toHaveValue('linkedin');
    expect(screen.getByLabelText(/^tags$/i)).toHaveValue('citation');
  });

  it('pré-remplit en édition et reconvertit UTC → heure de Paris', async () => {
    const onSubmit = vi.fn();
    render(
      <PostForm
        clients={clients}
        submitLabel="Enregistrer"
        pending={false}
        onSubmit={onSubmit}
        defaults={{
          clientId: 'c1',
          network: 'linkedin',
          scheduledAt: '2026-01-15T08:30:00.000Z', // hiver → 09:30 Paris
          caption: 'Déjà écrit',
          canvaUrl: null,
        }}
      />,
    );

    expect(screen.getByLabelText(/date et heure/i)).toHaveValue('2026-01-15T09:30');
    expect(screen.getByLabelText(/légende/i)).toHaveValue('Déjà écrit');
  });
});
