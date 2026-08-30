import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { signIn, signOut } from '@/services/auth';
import { CURRENT_PROFILE_KEY } from '@/auth/useCurrentProfile';
import { homePathForRole } from '@/auth/roleRoutes';

export function useSignIn() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: (profile) => {
      qc.setQueryData(CURRENT_PROFILE_KEY, profile);
      navigate(homePathForRole(profile.role), { replace: true });
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      qc.setQueryData(CURRENT_PROFILE_KEY, null);
      await qc.clear();
      navigate('/login', { replace: true });
    },
  });
}
