import type { StatusTone } from '@/shared/constants/postStatus';

/** Classes Tailwind d'un badge selon le ton sémantique (fond teinté / aplat / neutre). */
export function toneClasses(tone: StatusTone): string {
  if (tone.kind === 'neutral') {
    return tone.fill === 'solid'
      ? 'bg-foreground text-background border-transparent'
      : 'bg-surface-2 text-muted-foreground border-border';
  }
  const soft = {
    info: 'bg-info-surface text-info-strong border-info-border',
    warning: 'bg-warning-surface text-warning-strong border-warning-border',
    success: 'bg-success-surface text-success-strong border-success-border',
  } as const;
  const solid = {
    info: 'bg-info text-info-foreground border-transparent',
    warning: 'bg-warning text-warning-foreground border-transparent',
    success: 'bg-success text-success-foreground border-transparent',
  } as const;
  return tone.fill === 'solid' ? solid[tone.kind] : soft[tone.kind];
}
