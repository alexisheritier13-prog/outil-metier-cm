import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { CalendarDays, CheckCircle2, Library, Send, Sparkles } from 'lucide-react';
import { PortalPreviewMock } from './PortalPreviewMock';
import { FlowRow, LibraryGrid, MiniCalendar, Pipeline } from './introVisuals';

export interface IntroSlide {
  id: string;
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  visual: ReactNode;
}

export const INTRO_SLIDES: IntroSlide[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Bienvenue sur Cadence',
    body: (
      <>
        Un seul endroit pour planifier, faire valider et publier le contenu de tous vos clients.
        Fini les docs éparpillés et les allers-retours par mail.
      </>
    ),
    visual: <FlowRow />,
  },
  {
    id: 'planning',
    icon: CalendarDays,
    title: 'Le planning, cœur de l’outil',
    body: (
      <>
        Le calendrier éditorial rassemble tous les posts, tous clients confondus, sur le mois.
        Cliquez une case pour créer un post à cette date, glissez-le pour le replanifier.
      </>
    ),
    visual: <MiniCalendar />,
  },
  {
    id: 'workflow',
    icon: CheckCircle2,
    title: 'Un circuit de validation clair',
    body: (
      <>
        Chaque post avance étape par étape : brouillon, validation interne, validation client,
        puis planifié. Le statut est toujours visible, et vous pouvez sauter la validation
        interne ou client selon le client.
      </>
    ),
    visual: <Pipeline />,
  },
  {
    id: 'portal',
    icon: Send,
    title: 'L’espace client, séparé du vôtre',
    body: (
      <>
        Vos clients ont leur propre espace. Ils y voient le calendrier en lecture seule,
        <strong> approuvent ou demandent une modification</strong>, et commentent, sans jamais
        accéder à vos notes internes, à vos autres clients ni à vos codes d’accès. Vous créez
        leurs identifiants depuis <strong>Clients, onglet Accès</strong>.
      </>
    ),
    visual: <PortalPreviewMock />,
  },
  {
    id: 'library',
    icon: Library,
    title: 'Bibliothèque & alertes',
    body: (
      <>
        Rangez vos idées, templates, marronniers et campagnes dans la Bibliothèque. Les alertes
        signalent ce qui dérape : posts en retard, trous dans le planning, validation qui traîne.
      </>
    ),
    visual: <LibraryGrid />,
  },
  {
    id: 'done',
    icon: Sparkles,
    title: 'À vous de jouer',
    body: (
      <>
        Vous pourrez rouvrir cette présentation à tout moment depuis l’<strong>Aide</strong>.
        Pour repérer où se trouve chaque chose dans l’interface, lancez la visite guidée.
      </>
    ),
    visual: (
      <div className="bg-surface-2 flex items-center gap-3 rounded-xl border p-4">
        <span className="bg-primary text-primary-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl">
          <Sparkles className="h-5 w-5" />
        </span>
        <p className="text-muted-foreground text-sm">
          La visite surligne la barre latérale : Planning, Validation, Clients, Bibliothèque,
          Alertes.
        </p>
      </div>
    ),
  },
];
