import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Contrôle segmenté (bascule de vue) — piste creusée, option active en relief. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly Option<T>[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="bg-surface-2 ring-border/70 inline-flex gap-1 rounded-xl p-1 ring-1 ring-inset"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97]',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
