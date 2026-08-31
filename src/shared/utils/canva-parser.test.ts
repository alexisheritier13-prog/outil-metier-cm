import { describe, expect, it } from 'vitest';
import { isCanvaUrl, parseCanvaImage } from '@/shared/utils/canva-parser';

describe('parseCanvaImage', () => {
  it('extrait og:image (property avant content)', () => {
    const html = `<meta property="og:image" content="https://cdn.canva.com/preview/abc.png" />`;
    expect(parseCanvaImage(html)).toEqual({
      imageUrl: 'https://cdn.canva.com/preview/abc.png',
      source: 'og',
    });
  });

  it('extrait og:image (content avant property)', () => {
    const html = `<meta content="https://cdn.canva.com/x.jpg" property="og:image">`;
    expect(parseCanvaImage(html)?.imageUrl).toBe('https://cdn.canva.com/x.jpg');
  });

  it('gère og:image:secure_url', () => {
    const html = `<meta property="og:image:secure_url" content="https://c.canva.com/s.png">`;
    expect(parseCanvaImage(html)?.imageUrl).toBe('https://c.canva.com/s.png');
  });

  it('retombe sur twitter:image', () => {
    const html = `<meta name="twitter:image" content="https://cdn.canva.com/tw.png">`;
    expect(parseCanvaImage(html)).toEqual({
      imageUrl: 'https://cdn.canva.com/tw.png',
      source: 'twitter',
    });
  });

  it('retombe sur link rel=image_src', () => {
    const html = `<link rel="image_src" href="https://cdn.canva.com/legacy.png">`;
    expect(parseCanvaImage(html)?.source).toBe('image_src');
  });

  it('décode les entités HTML dans l\'URL', () => {
    const html = `<meta property="og:image" content="https://cdn.canva.com/a.png?w=1&amp;h=2">`;
    expect(parseCanvaImage(html)?.imageUrl).toBe('https://cdn.canva.com/a.png?w=1&h=2');
  });

  it('renvoie null si aucune balise image', () => {
    expect(parseCanvaImage('<html><head><title>x</title></head></html>')).toBeNull();
  });

  it('ignore les URL non http(s)', () => {
    expect(parseCanvaImage(`<meta property="og:image" content="/relative.png">`)).toBeNull();
  });

  it('priorité og > twitter', () => {
    const html = `
      <meta name="twitter:image" content="https://cdn.canva.com/tw.png">
      <meta property="og:image" content="https://cdn.canva.com/og.png">`;
    expect(parseCanvaImage(html)?.source).toBe('og');
  });
});

describe('isCanvaUrl', () => {
  it('accepte les domaines canva.com', () => {
    expect(isCanvaUrl('https://www.canva.com/design/DAF.../view')).toBe(true);
    expect(isCanvaUrl('https://canva.com/design/x')).toBe(true);
  });
  it('refuse le reste', () => {
    expect(isCanvaUrl('https://evil.com/canva.com')).toBe(false);
    expect(isCanvaUrl('http://www.canva.com/x')).toBe(false); // pas https
    expect(isCanvaUrl('pas une url')).toBe(false);
    expect(isCanvaUrl('https://notcanva.com')).toBe(false);
  });
});
