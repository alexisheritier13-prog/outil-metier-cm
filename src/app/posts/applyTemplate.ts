import type { Network } from '@/shared/constants/networks';
import type { PostTemplate } from '@/shared/types';

export interface TemplatePrefill {
  network: Network | null;
  caption: string;
}

/** Champs à pré-remplir dans l'éditeur de post à partir d'un template (Story 7.2). */
export function templatePrefill(t: PostTemplate): TemplatePrefill {
  return {
    network: t.network,
    caption: t.captionTemplate,
  };
}
