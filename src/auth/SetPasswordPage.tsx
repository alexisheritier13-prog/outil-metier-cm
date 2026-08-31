import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentProfile, getSessionUserId, updateMyPassword } from '@/services/auth';
import { homePathForRole } from '@/auth/roleRoutes';

type State = 'checking' | 'ready' | 'no-session' | 'done';

export function SetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    // `detectSessionInUrl` consomme le jeton du lien : on laisse un tick puis on vérifie.
    const t = setTimeout(async () => {
      const uid = await getSessionUserId();
      setState(uid ? 'ready' : 'no-session');
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      await updateMyPassword(password);
      return getCurrentProfile();
    },
    onSuccess: (profile) => {
      setState('done');
      setTimeout(() => navigate(profile ? homePathForRole(profile.role) : '/login', { replace: true }), 900);
    },
  });

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 8 && confirm === password && !save.isPending;

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-4">
      <div className="bg-surface shadow-panel w-full max-w-sm space-y-6 rounded-3xl border p-8">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-lg text-sm font-bold">
            C
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Cadence</span>
        </div>

        {state === 'checking' && <p className="text-muted-foreground text-sm">Vérification du lien…</p>}

        {state === 'no-session' && (
          <div className="space-y-3">
            <h1 className="text-title tracking-tight">Lien invalide ou expiré</h1>
            <p className="text-muted-foreground text-sm">
              Demandez un nouveau lien à votre agence, ou utilisez « mot de passe oublié » sur la
              page de connexion.
            </p>
            <Button asChild variant="outline">
              <Link to="/login">Retour à la connexion</Link>
            </Button>
          </div>
        )}

        {state === 'done' && (
          <div className="space-y-2">
            <h1 className="text-title tracking-tight">Mot de passe enregistré</h1>
            <p className="text-muted-foreground text-sm">Redirection…</p>
          </div>
        )}

        {state === 'ready' && (
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) save.mutate();
            }}
          >
            <div className="space-y-1.5">
              <h1 className="text-title tracking-tight">Choisissez un mot de passe</h1>
              <p className="text-muted-foreground text-sm">8 caractères minimum.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sp-pw" className="text-sm font-medium">
                Nouveau mot de passe
              </label>
              <Input
                id="sp-pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {tooShort && <p className="text-danger-strong text-xs">Au moins 8 caractères.</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sp-confirm" className="text-sm font-medium">
                Confirmation
              </label>
              <Input
                id="sp-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {mismatch && (
                <p className="text-danger-strong text-xs">Les mots de passe ne correspondent pas.</p>
              )}
            </div>
            {save.isError && (
              <p className="text-danger-strong text-sm" role="alert">
                L'enregistrement a échoué. Réessayez.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
