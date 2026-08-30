import { Button } from '@/components/ui/button';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useSignOut } from '@/auth/useAuthActions';
import { ROLE_LABELS } from '@/shared/constants/roles';

/** Placeholder de l'espace interne. Le calendrier multi-clients arrive à l'Epic 3. */
export function AppHome() {
  const { data: profile } = useCurrentProfile();
  const signOut = useSignOut();

  return (
    <main className="min-h-dvh p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Espace agence</h1>
          {profile && (
            <p className="text-muted-foreground text-sm">
              {profile.fullName || profile.email} · {ROLE_LABELS[profile.role]}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
          Déconnexion
        </Button>
      </header>
      <p className="text-muted-foreground">
        Le calendrier multi-clients et les écrans de travail seront construits à partir de
        l'Epic 3.
      </p>
    </main>
  );
}
