import { Button } from '@/components/ui/button';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useSignOut } from '@/auth/useAuthActions';

/** Placeholder de l'espace client. Calendrier + validation arrivent à l'Epic 6. */
export function PortalHome() {
  const { data: profile } = useCurrentProfile();
  const signOut = useSignOut();

  return (
    <main className="min-h-dvh p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Espace client</h1>
          {profile && <p className="text-muted-foreground text-sm">{profile.email}</p>}
        </div>
        <Button variant="outline" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
          Déconnexion
        </Button>
      </header>
      <p className="text-muted-foreground">
        Votre calendrier de publications et la validation des posts seront disponibles à
        l'Epic 6.
      </p>
    </main>
  );
}
