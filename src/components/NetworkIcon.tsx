import { NETWORK_LABELS, type Network } from '@/shared/constants/networks';
import { NETWORK_BRAND } from './networkBrand';
import { cn } from '@/lib/utils';

/**
 * Logo officiel du réseau (couleur de marque). `withLabel` ajoute le nom ;
 * `monochrome` rend le glyphe en `currentColor` (contextes où la couleur porte
 * déjà une autre information, ex. teinte de statut sur un événement calendrier).
 */
export function NetworkIcon({
  network,
  withLabel = false,
  monochrome = false,
  className,
}: {
  network: Network;
  withLabel?: boolean;
  monochrome?: boolean;
  className?: string;
}) {
  const brand = NETWORK_BRAND[network];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <svg
        viewBox="0 0 24 24"
        className="h-[15px] w-[15px] shrink-0"
        fill={monochrome ? 'currentColor' : brand.hex}
        aria-hidden="true"
      >
        <path d={brand.path} />
      </svg>
      {withLabel ? (
        <span>{NETWORK_LABELS[network]}</span>
      ) : (
        <span className="sr-only">{NETWORK_LABELS[network]}</span>
      )}
    </span>
  );
}
