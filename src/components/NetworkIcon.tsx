import { NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { cn } from '@/lib/utils';

const ABBR: Record<Network, string> = {
  instagram: 'IG',
  linkedin: 'IN',
  facebook: 'FB',
  tiktok: 'TT',
  x: 'X',
  youtube: 'YT',
  pinterest: 'PT',
  threads: 'TH',
};

/**
 * Repère de réseau, monochrome (pas de logo couleur dans les listes denses).
 * `withLabel` ajoute le nom complet à côté.
 */
export function NetworkIcon({
  network,
  withLabel = false,
  className,
}: {
  network: Network;
  withLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="bg-surface-2 text-muted-foreground inline-flex h-5 w-6 items-center justify-center rounded border text-[10px] font-semibold"
        aria-hidden="true"
      >
        {ABBR[network]}
      </span>
      {withLabel ? <span>{NETWORK_LABELS[network]}</span> : <span className="sr-only">{NETWORK_LABELS[network]}</span>}
    </span>
  );
}
