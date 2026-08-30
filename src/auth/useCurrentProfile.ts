import { useQuery } from '@tanstack/react-query';
import { getCurrentProfile } from '@/services/auth';

export const CURRENT_PROFILE_KEY = ['current-profile'] as const;

/**
 * Profil de l'utilisateur connecté. `null` = pas de session valide (ou compte désactivé).
 * `isLoading` vrai pendant la résolution initiale (à traiter comme « on ne sait pas encore »).
 */
export function useCurrentProfile() {
  return useQuery({
    queryKey: CURRENT_PROFILE_KEY,
    queryFn: getCurrentProfile,
    staleTime: 60_000,
    retry: false,
  });
}
