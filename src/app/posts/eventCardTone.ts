import type { PostStatus } from '@/shared/constants/postStatus';

/**
 * Fond + texte de la carte événement du planning, par statut — jamais la couleur
 * seule (le statut reste aussi lisible dans le libellé/l'info-bulle). Réutilise les
 * jetons sémantiques existants (info/warning/success/primary) plutôt que d'en
 * dupliquer les valeurs : ce sont déjà les couleurs demandées pour ces statuts.
 */
export const EVENT_CARD_CLASSES: Record<PostStatus, string> = {
  draft: 'bg-surface-2 text-muted-foreground',
  internal_review: 'bg-info-surface text-info-strong',
  client_review: 'bg-warning-surface text-warning-strong',
  approved: 'bg-success-surface text-success-strong',
  scheduled: 'bg-primary-surface text-primary-strong',
  // « publié » n'apparaît pas dans la maquette (déjà absent de la légende
  // existante) — même traitement neutre que le badge de statut ailleurs dans l'app.
  published: 'bg-surface-3 text-foreground/75',
};
