import { clientColor, clientInitials } from '@/lib/clientColor';
import { cn } from '@/lib/utils';
import type { Client } from '@/shared/types';

/**
 * Un bouton par client (pastille de sa couleur + compteur), au lieu d'un menu
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
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-medium transition-[opacity,box-shadow]',
              active
                ? 'border-primary/40 bg-surface shadow-xs ring-primary/30 ring-1'
                : 'border-border bg-surface opacity-70 hover:opacity-100',
            )}
          >
            <span
              className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold"
              style={{ backgroundColor: cc.color, color: 'white' }}
              aria-hidden="true"
            >
              {clientInitials(c.name)[0]}
            </span>
            {c.name}
            <span className="text-muted-foreground tabular-nums">{counts.get(c.id) ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
