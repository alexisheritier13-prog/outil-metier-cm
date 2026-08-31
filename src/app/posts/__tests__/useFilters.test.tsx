import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useFilters } from '@/app/posts/useFilters';

function wrapper(initial = '/') {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
}

afterEach(() => localStorage.clear());

describe('useFilters', () => {
  it('lit les filtres depuis l\'URL', () => {
    const { result } = renderHook(() => useFilters(), {
      wrapper: wrapper('/?client=c1&client=c2&status=draft&q=promo'),
    });
    expect(result.current.filters.clientIds).toEqual(['c1', 'c2']);
    expect(result.current.filters.statuses).toEqual(['draft']);
    expect(result.current.filters.q).toBe('promo');
    expect(result.current.isEmpty).toBe(false);
  });

  it('ignore les statuts invalides', () => {
    const { result } = renderHook(() => useFilters(), {
      wrapper: wrapper('/?status=draft&status=bogus'),
    });
    expect(result.current.filters.statuses).toEqual(['draft']);
  });

  it('set met à jour l\'URL et persiste ; reset vide tout', () => {
    const { result } = renderHook(() => useFilters(), { wrapper: wrapper('/') });

    act(() => result.current.set({ networks: ['instagram'], q: 'noël' }));
    expect(result.current.filters.networks).toEqual(['instagram']);
    expect(JSON.parse(localStorage.getItem('planning-filters')!).q).toBe('noël');

    act(() => result.current.reset());
    expect(result.current.isEmpty).toBe(true);
  });

  it('restaure depuis localStorage si l\'URL est vierge', () => {
    localStorage.setItem(
      'planning-filters',
      JSON.stringify({ clientIds: ['c9'], statuses: [], networks: [], from: null, to: null, q: '' }),
    );
    const { result } = renderHook(() => useFilters(), { wrapper: wrapper('/') });
    expect(result.current.filters.clientIds).toEqual(['c9']);
  });

  it('gère le filtre « avec note de performance » (perf=1)', () => {
    const { result } = renderHook(() => useFilters(), { wrapper: wrapper('/?perf=1') });
    expect(result.current.filters.hasPerformanceNote).toBe(true);
    expect(result.current.toService.hasPerformanceNote).toBe(true);
    expect(result.current.isEmpty).toBe(false);

    act(() => result.current.set({ hasPerformanceNote: false }));
    expect(result.current.isEmpty).toBe(true);
  });

  it('toService convertit les dates en ISO', () => {
    const { result } = renderHook(() => useFilters(), {
      wrapper: wrapper('/?from=2026-07-01&to=2026-07-31'),
    });
    // 1er juillet 00:00 Paris (été, UTC+2) → 30 juin 22:00 UTC
    expect(result.current.toService.from).toBe('2026-06-30T22:00:00.000Z');
    // 31 juillet 23:59 Paris → 21:59 UTC
    expect(result.current.toService.to).toBe('2026-07-31T21:59:00.000Z');
  });
});
