import { clientColor } from '@/lib/clientColor';
import { cn } from '@/lib/utils';
import type { Client } from '@/shared/types';

/**
 * Un bouton par client (puce de sa couleur + compteur), au lieu d'un menu
 * déroulant — même filtre multi-sélection que l'ancien composant (`clientIds`),
 * juste rendu autrement. Actif = anneau bleu, inactif = discret.
 */
export function ClientFilterChips({
  clients,
  counts,
  selected,
  onChange,
}: {
  clients: Client[];
  /** Nombre de posts par client, indépendant de la sélection en cours. */
  counts: Map<string, number>;
  selected: string[];
  onChange: (clientIds: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {clients.map((c) => {
        const active = selected.length === 0 || selected.includes(c.id);
        const cc = clientColor(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            aria-pressed={selected.includes(c.id)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-surface px-2.5 text-sm font-semibold transition-[opacity,box-shadow]',
              active ? 'text-foreground' : 'text-muted-foreground opacity-70 hover:opacity-100',
            )}
            style={active ? { boxShadow: 'inset 0 0 0 1.5px oklch(0.55 0.2 264 / 0.35)' } : undefined}
          >
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
              style={{ backgroundColor: cc.color }}
              aria-hidden="true"
            />
            {c.name}
            <span className="bg-surface-2 rounded-full px-1.5 py-px text-[11px] font-extrabold tabular-nums">
              {counts.get(c.id) ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
