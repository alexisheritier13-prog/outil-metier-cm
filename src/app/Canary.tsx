import { Button } from '@/components/ui/button';

/**
 * Page « canari » : confirme que l'app build, se déploie et tourne.
 * Remplacée par le vrai écran d'accueil (calendrier) à partir de l'Epic 3.
 */
export function Canary() {
  const version = __APP_VERSION__;
  const mode = import.meta.env.MODE;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Outil métier Community Management</h1>
        <p className="text-muted-foreground">
          Base technique opérationnelle. L'application sera construite story par story.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted-foreground text-right">Version</dt>
        <dd className="text-left font-mono" data-testid="app-version">
          {version}
        </dd>
        <dt className="text-muted-foreground text-right">Environnement</dt>
        <dd className="text-left font-mono" data-testid="app-mode">
          {mode}
        </dd>
      </dl>

      <Button asChild>
        <a href="https://github.com/24601/BMAD-AT-CLAUDE" target="_blank" rel="noreferrer">
          Méthode BMad
        </a>
      </Button>
    </main>
  );
}
