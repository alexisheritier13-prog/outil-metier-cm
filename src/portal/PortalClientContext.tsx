import { createContext, useContext } from 'react';
import type { Client } from '@/shared/types';

/** Le client actif dans l'espace client (résolu par `PortalLayout`). */
export const PortalClientContext = createContext<Client | null>(null);

export function usePortalClient(): Client {
  const client = useContext(PortalClientContext);
  if (!client) {
    throw new Error('usePortalClient doit être utilisé sous <PortalLayout>');
  }
  return client;
}
