import { BarChart3, Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusLegend } from '@/components/StatusLegend';
import { cn } from '@/lib/utils';
import { POST_STATUSES, POST_STATUS_LABELS } from '@/shared/constants/postStatus';
import { NETWORK_LABELS } from '@/shared/constants/networks';
import { useActiveNetworks } from '@/app/account/useAccount';
import type { Client } from '@/shared/types';
import { ClientFilterChips } from './ClientFilterChips';
import type { PlanningFilters } from './useFilters';

interface Props {
  clients: Client[];
  clientCounts: Map<string, number>;
  filters: PlanningFilters;
  onChange: (patch: Partial<PlanningFilters>) => void;
  onReset: () => void;
  isEmpty: boolean;
}

export function FiltersBar({ clients, clientCounts, filters, onChange, onReset, isEmpty }: Props) {
  const activeNetworks = useActiveNetworks();
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {clients.length > 0 && (
          <>
            <ClientFilterChips
              clients={clients}
              counts={clientCounts}
              selected={filters.clientIds}
              onChange={(clientIds) => onChange({ clientIds })}
            />
            <span className="bg-border h-[22px] w-px shrink-0" aria-hidden="true" />
          </>
        )}
        <MultiSelect
          label="Statut"
          options={POST_STATUSES.map((s) => ({ value: s, label: POST_STATUS_LABELS[s] }))}
          selected={filters.statuses}
          onChange={(statuses) => onChange({ statuses: statuses as PlanningFilters['statuses'] })}
        />
        <MultiSelect
          label="Réseau"
          options={activeNetworks.map((n) => ({ value: n, label: NETWORK_LABELS[n] }))}
          selected={filters.networks}
          onChange={(networks) => onChange({ networks: networks as PlanningFilters['networks'] })}
        />
        <StatusLegend className="ml-auto hidden lg:block" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          <input
            type="date"
            aria-label="Du"
            className="field"
            value={filters.from ?? ''}
            onChange={(e) => onChange({ from: e.target.value || null })}
          />
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
          <input
            type="date"
            aria-label="Au"
            className="field"
            value={filters.to ?? ''}
            onChange={(e) => onChange({ to: e.target.value || null })}
          />
        </div>

        <Input
          placeholder="Rechercher dans les légendes…"
          className="h-9 w-full max-w-xs sm:w-auto"
          aria-label="Rechercher dans les légendes"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
        />

        <Button
          variant={filters.hasPerformanceNote ? 'default' : 'outline'}
          size="sm"
          aria-pressed={filters.hasPerformanceNote}
          onClick={() => onChange({ hasPerformanceNote: !filters.hasPerformanceNote })}
        >
          <BarChart3 className="h-4 w-4" /> Avec note de perf
        </Button>

        {!isEmpty && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4" /> Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="bg-surface flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold"
        >
          {label}
          {selected.length > 0 && (
            <span className="bg-surface-2 rounded-full px-1.5 py-px text-[11px] font-extrabold tabular-nums">
              {selected.length}
            </span>
          )}
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-72 overflow-y-auto">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
          >
            <Check
              className={cn('h-3.5 w-3.5', selected.includes(o.value) ? 'opacity-100' : 'opacity-0')}
            />
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
