import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Canary } from '@/app/Canary';

describe('Canary', () => {
  it('affiche la version applicative et le mode', () => {
    render(<Canary />);
    expect(screen.getByTestId('app-version')).toHaveTextContent(__APP_VERSION__);
    expect(screen.getByTestId('app-mode')).toHaveTextContent(/test/i);
  });

  it('a un titre de niveau 1', () => {
    render(<Canary />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
