import {
  CircleDashed,
  Eye,
  Send,
  CheckCircle2,
  CalendarClock,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import type { PostStatus } from '@/shared/constants/postStatus';

/**
 * Icône par statut de post — partagée entre le badge et le calendrier.
 * Le sens n'est jamais porté par la couleur seule : la forme de l'icône
 * distingue chaque statut.
 */
export const POST_STATUS_ICONS: Record<PostStatus, LucideIcon> = {
  draft: CircleDashed,
  internal_review: Eye,
  client_review: Send,
  approved: CheckCircle2,
  scheduled: CalendarClock,
  published: CheckCheck,
};
