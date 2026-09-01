import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabase } from '@/lib/supabase';
import { getSessionUserId, updateMyPassword } from '@/services/auth';
import { acceptOrgInvitation, fetchOrgInvitation } from '@/services/orgInvitations';
import { CURRENT_PROFILE_KEY } from '@/auth/useCurrentProfile';

type Phase = 'checking' | 'ready' | 'done' | 'confirm-email';

export function JoinOrgPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('checking');
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const invitation = useQuery({
    queryKey: ['org-invitation', token],
    queryFn: () => fetchOrgInvitation(token),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    // `detectSessionInUrl` consomme un éventuel jeton Supabase (lien nominatif) : on laisse un tick.
    const t = setTimeout(async () => {
      const uid = await getSessionUserId();
      setHasSession(Boolean(uid));
      setPhase('ready');
    }, 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (invitation.data) {
      setOrgName((v) => v || invitation.data!.orgName);
      setFullName((v) => v || invitation.data!.fullName);
      if (invitation.data.email) setEmail(invitation.data.email);
    }
  }, [invitation.data]);

  const accept = useMutation({
    mutationFn: async () => {
      if (hasSession) {
        // Lien nominatif : la session est déjà là, on (re)pose le mot de passe.
        await updateMyPassword(password);
      } else {
        // Lien ouvert : la personne crée son compte ici.
        const { data, error } = await getSupabase().auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw new Error(mapSignUpError(error.message));
        if (!data.session) {
          // Confirmation d'e-mail activée côté Supabase → pas de session immédiate.
          setPhase('confirm-email');
          return null;
        }
      }
      return acceptOrgInvitation(token, fullName, orgName);
    },
    onSuccess: async (res) => {
      if (!res) return; // confirm-email
      await qc.invalidateQueries({ queryKey: CURRENT_PROFILE_KEY });
      setPhase('done');
      setTimeout(() => navigate('/bienvenue', { replace: true }), 900);
    },
  });

  const inv = invitation.data;
  const invalid =
    invitation.isError || (!invitation.isLoading && (!inv || inv.expired || inv.accepted));

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const emailOk = hasSession || /.+@.+\..+/.test(email.trim());
  const canSubmit =
    orgName.trim().length > 0 &&
    emailOk &&
    password.length >= 8 &&
    confirm === password &&
    !accept.isPending;

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-4">
      <div className="bg-surface shadow-panel w-full max-w-md space-y-6 rounded-3xl border p-8">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-lg text-sm font-bold">
            C
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Cadence</span>
        </div>

        {(phase === 'checking' || invitation.isLoading) && (
          <p className="text-muted-foreground text-sm">Vérification du lien…</p>
        )}

        {phase !== 'checking' && !invitation.isLoading && invalid && (
          <div className="space-y-3">
            <h1 className="text-title tracking-tight">Lien invalide ou expiré</h1>
            <p className="text-muted-foreground text-sm">
              {inv?.accepted
                ? 'Cette invitation a déjà été utilisée.'
                : 'Demande une nouvelle invitation.'}
            </p>
            <Button asChild variant="outline">
              <Link to="/login">Aller à la connexion</Link>
            </Button>
          </div>
        )}

        {phase === 'confirm-email' && (
          <div className="space-y-2">
            <h1 className="text-title tracking-tight">Confirme ton e-mail</h1>
            <p className="text-muted-foreground text-sm">
              Un e-mail de confirmation a été envoyé à {email}. Clique le lien qu'il contient,
              puis reviens sur cette page pour finaliser.
            </p>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-2">
            <h1 className="text-title tracking-tight">Bienvenue sur Cadence</h1>
            <p className="text-muted-foreground text-sm">On prépare ton espace…</p>
          </div>
        )}

        {phase === 'ready' && !invalid && inv && (
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) accept.mutate();
            }}
          >
            <div className="space-y-1.5">
              <h1 className="text-title tracking-tight">Crée ton espace</h1>
              <p className="text-muted-foreground text-sm">
                Tu seras le Directeur de cette agence.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="jo-org" className="text-sm font-medium">
                Nom de l'agence
              </label>
              <Input id="jo-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="jo-email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="jo-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={hasSession || Boolean(inv.email)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="jo-name" className="text-sm font-medium">
                Ton nom
              </label>
              <Input
                id="jo-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="jo-pw" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="jo-pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {tooShort && <p className="text-danger-strong text-xs">Au moins 8 caractères.</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="jo-confirm" className="text-sm font-medium">
                Confirmation
              </label>
              <Input
                id="jo-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {mismatch && (
                <p className="text-danger-strong text-xs">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            {accept.isError && (
              <p className="text-danger-strong text-sm" role="alert">
                {accept.error instanceof Error
                  ? accept.error.message
                  : "La création de l'espace a échoué."}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {accept.isPending ? 'Création…' : "Créer l'espace"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

function mapSignUpError(msg: string): string {
  if (/already registered|already been registered/i.test(msg)) {
    return 'Un compte existe déjà avec cet e-mail. Utilise « mot de passe oublié » sur la page de connexion, ou un autre e-mail.';
  }
  if (/password/i.test(msg)) return 'Mot de passe trop faible (8 caractères minimum).';
  return "La création du compte a échoué.";
}
