import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom ne fournit pas ces API (utilisées par Radix, @tanstack/react-virtual…).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
