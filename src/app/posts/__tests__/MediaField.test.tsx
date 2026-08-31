import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { MediaField } from '@/app/posts/MediaField';

const img = (name: string) => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });

function setup(files: File[] = []) {
  const onStagedChange = vi.fn();
  const { container } = renderWithProviders(
    <MediaField clientId="c1" stagedFiles={files} onStagedChange={onStagedChange} />,
  );
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  return { onStagedChange, input };
}

describe('MediaField (mode création / staged)', () => {
  it('ajoute les fichiers sélectionnés à la liste en attente', async () => {
    const { onStagedChange, input } = setup([]);
    await userEvent.upload(input, [img('a.png'), img('b.png')]);
    expect(onStagedChange).toHaveBeenCalledTimes(1);
    expect(onStagedChange.mock.calls[0]![0].map((f: File) => f.name)).toEqual(['a.png', 'b.png']);
  });

  it('rejette un format non supporté et n’ajoute rien', async () => {
    const { onStagedChange, input } = setup([]);
    const txt = new File(['hi'], 'notes.txt', { type: 'text/plain' });
    await userEvent.upload(input, txt, { applyAccept: false });
    expect(await screen.findByText(/format non pris en charge/i)).toBeInTheDocument();
    expect(onStagedChange).not.toHaveBeenCalled();
  });

  it('réordonne et retire un visuel en attente', async () => {
    const files = [img('a.png'), img('b.png')];
    const { onStagedChange } = setup(files);

    await userEvent.click(screen.getAllByLabelText('Déplacer après')[0]!);
    expect(onStagedChange).toHaveBeenLastCalledWith([files[1], files[0]]);

    await userEvent.click(screen.getAllByLabelText('Retirer ce visuel')[0]!);
    expect(onStagedChange).toHaveBeenLastCalledWith([files[1]]);
  });
});
