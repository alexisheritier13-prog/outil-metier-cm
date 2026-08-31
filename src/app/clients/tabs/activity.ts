import type { ClientActivityEntry } from '@/shared/types';

/** Catégorie synthétique d'une entrée du journal d'activité client (Story 5.5). */
export type ActivityCategory =
  | 'create'
  | 'submitted'
  | 'internal_approved'
  | 'returned'
  | 'client_approved'
  | 'client_rejected'
  | 'scheduled'
  | 'published'
  | 'trash'
  | 'restore'
  | 'update'
  | 'note'
  | 'other';

export function activityCategory(e: Pick<ClientActivityEntry, 'action' | 'oldValue' | 'newValue'>):
  ActivityCategory {
  switch (e.action) {
    case 'create':
      return 'create';
    case 'trash':
      return 'trash';
    case 'restore':
      return 'restore';
    case 'update':
      return 'update';
    case 'comment':
      return 'note';
    case 'status_change':
      switch (e.newValue) {
        case 'internal_review':
          return 'submitted';
        case 'client_review':
          return 'internal_approved';
        case 'approved':
          return 'client_approved';
        case 'scheduled':
          return 'scheduled';
        case 'published':
          return 'published';
        case 'draft':
          return e.oldValue === 'client_review' ? 'client_rejected' : 'returned';
        default:
          return 'other';
      }
    default:
      return 'other';
  }
}

const FIELD_LABELS: Record<string, string> = {
  caption: 'la légende',
  scheduled_at: 'la date',
  network: 'le réseau',
  canva_url: 'le lien Canva',
  campaign_id: 'la campagne',
  author_id: 'le rédacteur',
  performance_note: 'la note de performance',
};

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  create: 'Post créé',
  submitted: 'Soumis à la validation interne',
  internal_approved: 'Validé en interne (envoyé au client)',
  returned: 'Renvoyé au rédacteur',
  client_approved: 'Approuvé par le client',
  client_rejected: 'Modification demandée par le client',
  scheduled: 'Planifié',
  published: 'Publié',
  trash: 'Mis à la corbeille',
  restore: 'Restauré',
  update: 'Post modifié',
  note: 'Note ajoutée',
  other: 'Changement de statut',
};

export function activityLabel(e: ClientActivityEntry): string {
  const cat = activityCategory(e);
  if (cat === 'update' && e.field) return `Modification de ${FIELD_LABELS[e.field] ?? e.field}`;
  return CATEGORY_LABELS[cat];
}

/** Options du filtre « type d'action » (regroupe quelques catégories proches). */
export const ACTIVITY_FILTERS: { value: string; label: string; match: ActivityCategory[] }[] = [
  { value: 'validation', label: 'Validations', match: ['submitted', 'internal_approved', 'client_approved'] },
  { value: 'refus', label: 'Refus / renvois', match: ['returned', 'client_rejected'] },
  { value: 'publication', label: 'Planification / publication', match: ['scheduled', 'published'] },
  { value: 'corbeille', label: 'Corbeille / restauration', match: ['trash', 'restore'] },
  { value: 'edition', label: 'Créations / modifications', match: ['create', 'update'] },
  { value: 'note', label: 'Notes', match: ['note'] },
];
