import type { StatusTone } from '@/shared/constants/postStatus';

/**
 * Classes d'un badge de statut : pastille douce et arrondie (fond teinté + texte
 * foncé de la même teinte), sans bordure appuyée — façon Linear / Attio. La
 * couleur ne porte jamais seule le sens : le badge affiche toujours icône +
 * libellé. `solid` n'est plus un aplat vif mais une nuance un peu plus marquée.
 */
export function toneClasses(tone: StatusTone): string {
  if (tone.kind === 'neutral') {
    // « publié » (solid) = terminé : gris un peu plus dense que « brouillon ».
    return tone.fill === 'solid'
      ? 'bg-surface-3 text-foreground/75 ring-1 ring-inset ring-border'
      : 'bg-surface-2 text-muted-foreground ring-1 ring-inset ring-border';
  }
  const map = {
    info: 'bg-info-surface text-info-strong ring-1 ring-inset ring-info-border/60',
    warning: 'bg-warning-surface text-warning-strong ring-1 ring-inset ring-warning-border/60',
    success: 'bg-success-surface text-success-strong ring-1 ring-inset ring-success-border/60',
  } as const;
  return map[tone.kind];
}
