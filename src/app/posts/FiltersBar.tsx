import { BarChart3, Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { POST_STATUSES, POST_STATUS_LABELS } from '@/shared/constants/postStatus';
import { NETWORKS, NETWORK_LABELS } from '@/shared/constants/networks';
import type { Client } from '@/shared/types';
import type { PlanningFilters } from './useFilters';

interface Props {
  clients: Client[];
  filters: PlanningFilters;
  onChange: (patch: Partial<PlanningFilters>) => void;
  onReset: () => void;
  isEmpty: boolean;
}

export function FiltersBar({ clients, filters, onChange, onReset, isEmpty }: Props) {
  return (
    <div className="bg-background sticky top-0 z-sticky mb-4 flex flex-wrap items-center gap-2 border-b pb-3 pt-1">
      <MultiSelect
        label="Client"
        options={clients.map((c) => ({ value: c.id, label: c.name }))}
        selected={filters.clientIds}
        onChange={(clientIds) => onChange({ clientIds })}
      />
      <MultiSelect
        label="Statut"
        options={POST_STATUSES.map((s) => ({ value: s, label: POST_STATUS_LABELS[s] }))}
        selected={filters.statuses}
        onChange={(statuses) => onChange({ statuses: statuses as PlanningFilters['statuses'] })}
      />
      <MultiSelect
        label="Réseau"
        options={NETWORKS.map((n) => ({ value: n, label: NETWORK_LABELS[n] }))}
        selected={filters.networks}
        onChange={(networks) => onChange({ networks: networks as PlanningFilters['networks'] })}
      />

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
        <Button variant="outline" size="sm" className="gap-1">
          {label}
          {selected.length > 0 && (
            <span className="bg-foreground text-background rounded px-1 text-[10px]">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
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
