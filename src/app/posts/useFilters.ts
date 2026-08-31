import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isPostStatus, type PostStatus } from '@/shared/constants/postStatus';
import { isNetwork, type Network } from '@/shared/constants/networks';
import { parisWallTimeToUtc } from '@/shared/utils/tz';
import type { PostFilters } from '@/services/posts';

function dayStartUtc(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return parisWallTimeToUtc({ year: y!, month: m!, day: day!, hour: 0, minute: 0 }).toISOString();
}
function dayEndUtc(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return parisWallTimeToUtc({ year: y!, month: m!, day: day!, hour: 23, minute: 59 }).toISOString();
}

const LS_KEY = 'planning-filters';

export interface PlanningFilters {
  clientIds: string[];
  statuses: PostStatus[];
  networks: Network[];
  from: string | null;
  to: string | null;
  q: string;
  hasPerformanceNote: boolean;
}

const EMPTY: PlanningFilters = {
  clientIds: [],
  statuses: [],
  networks: [],
  from: null,
  to: null,
  q: '',
  hasPerformanceNote: false,
};

function parse(sp: URLSearchParams): PlanningFilters {
  return {
    clientIds: sp.getAll('client'),
    statuses: sp.getAll('status').filter(isPostStatus),
    networks: sp.getAll('network').filter(isNetwork),
    from: sp.get('from'),
    to: sp.get('to'),
    q: sp.get('q') ?? '',
    hasPerformanceNote: sp.get('perf') === '1',
  };
}

function serialize(f: PlanningFilters): URLSearchParams {
  const sp = new URLSearchParams();
  f.clientIds.forEach((c) => sp.append('client', c));
  f.statuses.forEach((s) => sp.append('status', s));
  f.networks.forEach((n) => sp.append('network', n));
  if (f.from) sp.set('from', f.from);
  if (f.to) sp.set('to', f.to);
  if (f.q.trim()) sp.set('q', f.q.trim());
  if (f.hasPerformanceNote) sp.set('perf', '1');
  return sp;
}

export function isEmpty(f: PlanningFilters): boolean {
  return (
    f.clientIds.length === 0 &&
    f.statuses.length === 0 &&
    f.networks.length === 0 &&
    !f.from &&
    !f.to &&
    !f.q.trim() &&
    !f.hasPerformanceNote
  );
}

/**
 * Filtres du planning. Source de vérité = l'URL (partageable). Miroir localStorage
 * (mémorisé par utilisateur) restauré si l'URL est vierge à l'arrivée.
 */
export function useFilters() {
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => parse(sp), [sp]);

  // Restaure depuis localStorage si aucun filtre dans l'URL.
  useEffect(() => {
    if (!isEmpty(filters)) return;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as PlanningFilters;
      if (!isEmpty(parsed)) setSp(serialize(parsed), { replace: true });
    } catch {
      /* ignore */
    }
    // volontairement une seule fois au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste à chaque changement.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  const set = useCallback(
    (patch: Partial<PlanningFilters>) => {
      setSp(serialize({ ...filters, ...patch }), { replace: true });
    },
    [filters, setSp],
  );

  const reset = useCallback(() => setSp(new URLSearchParams(), { replace: true }), [setSp]);

  const toService = useMemo<PostFilters>(
    () => ({
      clientIds: filters.clientIds,
      statuses: filters.statuses,
      networks: filters.networks,
      from: filters.from ? dayStartUtc(filters.from) : null,
      to: filters.to ? dayEndUtc(filters.to) : null,
      q: filters.q,
      hasPerformanceNote: filters.hasPerformanceNote,
    }),
    [filters],
  );

  return { filters, set, reset, toService, isEmpty: isEmpty(filters) };
}

export { EMPTY as EMPTY_FILTERS };
