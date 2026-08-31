import { useQuery } from '@tanstack/react-query';
import { getAccountSettings, resolveActiveNetworks } from '@/services/accountSettings';
import type { Network } from '@/shared/constants/networks';

export const ACCOUNT_KEY = ['account-settings'] as const;

export function useAccountSettings() {
  return useQuery({
    queryKey: ACCOUNT_KEY,
    queryFn: getAccountSettings,
    staleTime: 5 * 60_000,
  });
}

/** Réseaux proposés dans l'app (préréglage de compte ; tous par défaut). */
export function useActiveNetworks(): Network[] {
  const { data } = useAccountSettings();
  return resolveActiveNetworks(data?.activeNetworks ?? null);
}
