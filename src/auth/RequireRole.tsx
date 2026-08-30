import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@/shared/constants/roles';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { homePathForRole } from '@/auth/roleRoutes';
import { FullPageSpinner } from '@/components/FullPageSpinner';

interface RequireRoleProps {
  roles: readonly Role[];
  children: ReactNode;
}

/**
 * Garde de route : exige une session valide dont le rôle est dans `roles`.
 * - pas de session → /login (en mémorisant la cible)
 * - mauvais rôle → renvoi vers l'accueil du rôle réel
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { data: profile, isLoading } = useCurrentProfile();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;

  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(profile.role)) {
    return <Navigate to={homePathForRole(profile.role)} replace />;
  }

  return <>{children}</>;
}
