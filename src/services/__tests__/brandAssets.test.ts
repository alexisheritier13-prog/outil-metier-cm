import { describe, expect, it } from 'vitest';
import {
  ImageUploadError,
  MAX_IMAGE_BYTES,
  validateImage,
} from '../brandAssets';

function fakeFile(type: string, size: number): File {
  const f = new File(['x'], 'logo', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('validateImage', () => {
  it('accepte une image PNG raisonnable', () => {
    expect(() => validateImage(fakeFile('image/png', 200_000))).not.toThrow();
  });

  it('refuse un type non image', () => {
    expect(() => validateImage(fakeFile('application/pdf', 1000))).toThrow(ImageUploadError);
  });

  it('refuse une image trop lourde', () => {
    expect(() => validateImage(fakeFile('image/jpeg', MAX_IMAGE_BYTES + 1))).toThrow(
      /5 Mo/,
    );
  });
});
