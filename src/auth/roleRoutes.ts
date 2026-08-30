import type { Role } from '@/shared/constants/roles';
import { isInternalRole } from '@/shared/constants/roles';

/** Page d'accueil après connexion, selon le rôle. */
export function homePathForRole(role: Role): string {
  return isInternalRole(role) ? '/app' : '/portail';
}
