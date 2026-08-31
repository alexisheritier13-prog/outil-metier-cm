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
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Cadence</h1>
          <p className="text-muted-foreground text-sm">Connectez-vous pour continuer</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => signIn.mutate(values))}
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-destructive text-sm" role="alert">
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
              aria-invalid={errors.password ? true : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-sm" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {signIn.isError && (
            <p className="text-destructive text-sm" role="alert">
              {signIn.error instanceof Error
                ? signIn.error.message
                : 'La connexion a échoué.'}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={signIn.isPending}>
            {signIn.isPending ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </main>
  );
}
