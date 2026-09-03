import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntroCarousel } from '../IntroCarousel';
import { INTRO_SLIDES } from '../introSlides';

function setup() {
  const onClose = vi.fn();
  const onStartTour = vi.fn();
  render(<IntroCarousel open onClose={onClose} onStartTour={onStartTour} />);
  return { onClose, onStartTour, user: userEvent.setup() };
}

describe('IntroCarousel', () => {
  it('affiche le premier écran et avance avec Suivant', async () => {
    const { user } = setup();
    expect(screen.getByText('Bienvenue sur Cadence')).toBeInTheDocument();
    expect(screen.getByText(`1 / ${INTRO_SLIDES.length}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Suivant/ }));
    expect(screen.getByText('Le planning, cœur de l’outil')).toBeInTheDocument();
  });

  it('Passer ferme le carrousel', async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Passer' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('le dernier écran propose la visite guidée', async () => {
    const { user, onStartTour } = setup();
    for (let i = 0; i < INTRO_SLIDES.length - 1; i += 1) {
      await user.click(screen.getByRole('button', { name: /Suivant/ }));
    }
    const tourBtn = screen.getByRole('button', { name: /Faire le tour de l’interface/ });
    await user.click(tourBtn);
    expect(onStartTour).toHaveBeenCalledOnce();
  });

  it('les pastilles de progression naviguent directement', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('tab', { name: 'Écran 4' }));
    expect(screen.getByText('L’espace client, séparé du vôtre')).toBeInTheDocument();
  });
});
