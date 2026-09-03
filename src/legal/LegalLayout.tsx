import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Coquille des pages légales (CGU, confidentialité). Publiques, lisibles sans
 * connexion. Prose bornée, titres hiérarchisés, retour à la connexion.
 */
export function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-[72ch] items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/login" className="flex items-center gap-2.5">
            <span className="bg-primary text-primary-foreground grid h-7 w-7 place-items-center rounded-lg text-sm font-bold">
              C
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Cadence</span>
          </Link>
          <Link
            to="/login"
            className="text-muted-foreground hover:text-foreground text-sm hover:underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[72ch] px-5 py-10 sm:px-6">
        <h1 className="text-title mb-1 tracking-tight">{title}</h1>
        <p className="text-muted-foreground mb-8 text-sm">Dernière mise à jour : {updatedAt}</p>

        <div className="legal-prose space-y-5 text-sm leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a:hover]:underline [&_h2]:text-section [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:scroll-mt-6 [&_h2:first-child]:mt-0 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:text-pretty [&_strong]:font-medium [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>

        <p className="text-muted-foreground mt-12 border-t pt-6 text-xs">
          <Link to="/cgu" className="hover:underline">
            Conditions générales d'utilisation
          </Link>
          {' · '}
          <Link to="/confidentialite" className="hover:underline">
            Politique de confidentialité
          </Link>
        </p>
      </main>
    </div>
  );
}
