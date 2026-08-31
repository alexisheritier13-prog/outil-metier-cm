import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { useSignIn } from '@/auth/useAuthActions';
import { homePathForRole } from '@/auth/roleRoutes';

const schema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { data: profile, isLoading } = useCurrentProfile();
  const signIn = useSignIn();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (isLoading) return <FullPageSpinner />;
  if (profile) return <Navigate to={homePathForRole(profile.role)} replace />;

  return (
    <main className="bg-surface-2 grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ── Formulaire ── */}
      <div className="bg-background flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="animate-in fade-in slide-in-from-bottom-2 mx-auto w-full max-w-sm space-y-8 duration-500 ease-out">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary text-primary-foreground shadow-card grid h-8 w-8 place-items-center rounded-lg text-sm font-bold">
              C
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Cadence</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-title tracking-tight">Connexion</h1>
            <p className="text-muted-foreground text-sm">
              Accédez à l'espace de votre agence ou à votre espace client.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => signIn.mutate(values))}
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@agence.fr"
                className="h-10"
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-danger-strong text-sm" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="h-10"
                aria-invalid={errors.password ? true : undefined}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-danger-strong text-sm" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {signIn.isError && (
              <p
                className="border-danger-border bg-danger-surface text-danger-strong rounded-md border px-3 py-2 text-sm"
                role="alert"
              >
                {signIn.error instanceof Error ? signIn.error.message : 'La connexion a échoué.'}
              </p>
            )}

            <Button type="submit" className="h-10 w-full" disabled={signIn.isPending}>
              {signIn.isPending ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <p className="text-muted-foreground border-t pt-6 text-xs">
            Un souci d'accès ? Contactez un directeur ou un chef de projet de votre agence.
          </p>
        </div>
      </div>

      {/* ── Panneau de marque (desktop) ── */}
      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-16"
      >
        <div className="bg-primary/[0.07] pointer-events-none absolute -right-48 -top-48 h-[32rem] w-[32rem] rounded-full blur-3xl" />
        <div className="bg-primary/[0.05] pointer-events-none absolute -bottom-48 -left-24 h-96 w-96 rounded-full blur-3xl" />

        <div className="relative max-w-md space-y-10">
          <div className="space-y-3">
            <h2 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-pretty">
              Le rythme de vos publications, sous contrôle.
            </h2>
            <p className="text-muted-foreground max-w-sm text-sm text-pretty">
              Un seul calendrier pour tous vos clients, du brouillon à la validation client
              jusqu'à la publication.
            </p>
          </div>

          {/* aperçu stylisé : semaines de planning dans un cadre flottant */}
          <div className="relative ml-4 mt-2 max-w-sm">
            <div className="border-border/50 absolute -inset-4 rounded-[1.5rem] border" />
            <div className="border-border/25 absolute -inset-8 rounded-[2rem] border" />
            <div className="bg-background shadow-panel relative space-y-2.5 rounded-xl border p-4">
              <div className="flex items-center gap-1.5 pb-1">
                <span className="bg-border h-2 w-2 rounded-full" />
                <span className="bg-border h-2 w-2 rounded-full" />
                <span className="bg-border h-2 w-2 rounded-full" />
                <span className="text-muted-foreground ml-2 text-[11px] font-medium">
                  Planning · cette semaine
                </span>
              </div>
              <CadenceRows />
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

const TONE = {
  soft: 'var(--primary-border)',
  mid: 'var(--primary)',
  strong: 'var(--primary-strong)',
} as const;

/** Motif décoratif : rangées de jours avec des « posts » planifiés en indigo. */
function CadenceRows() {
  const rows: {
    day: string;
    chips: { left: string; width: string; tone: keyof typeof TONE }[];
  }[] = [
    { day: 'Lun', chips: [{ left: '5%', width: '30%', tone: 'soft' }] },
    {
      day: 'Mar',
      chips: [
        { left: '10%', width: '26%', tone: 'mid' },
        { left: '52%', width: '34%', tone: 'soft' },
      ],
    },
    { day: 'Mer', chips: [{ left: '22%', width: '42%', tone: 'strong' }] },
    { day: 'Jeu', chips: [] },
    {
      day: 'Ven',
      chips: [
        { left: '6%', width: '22%', tone: 'soft' },
        { left: '38%', width: '30%', tone: 'mid' },
      ],
    },
    { day: 'Sam', chips: [{ left: '55%', width: '32%', tone: 'soft' }] },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.day} className="flex items-center gap-2.5">
          <span className="text-muted-foreground w-7 shrink-0 text-[10px] font-medium">
            {r.day}
          </span>
          <div className="bg-surface-2 relative h-6 flex-1 overflow-hidden rounded-md border">
            {r.chips.map((c, i) => (
              <span
                key={i}
                className="absolute inset-y-[3px] rounded-[3px]"
                style={{ left: c.left, width: c.width, backgroundColor: TONE[c.tone] }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
