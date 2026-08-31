import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Inbox,
  Keyboard,
  ListChecks,
  Users,
} from 'lucide-react';
import { Page, PageHeader } from '@/components/Page';
import { StatusBadge } from '@/components/StatusBadge';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { ROLE_LABELS } from '@/shared/constants/roles';

/**
 * Aide in-app (remplace le lien mailto). Prise en main, circuit de validation,
 * rôles, carte de navigation, raccourcis. Contenu figé — pas de données.
 */
export function HelpPage() {
  const { data: me } = useCurrentProfile();

  return (
    <Page>
      <PageHeader
        title="Aide"
        description="L'essentiel pour prendre Cadence en main : le circuit d'un post, qui fait quoi, et où trouver chaque chose."
      />

      <div className="max-w-[72ch] space-y-10 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-section">En deux mots</h2>
          <p>
            Cadence planifie les publications réseaux sociaux de vos clients et fait circuler
            chaque post dans un <strong>circuit de validation</strong> : le Community Manager
            prépare, un Lead valide en interne, le client approuve, puis le post est planifié
            et marqué publié. Chaque client ne voit que ses propres contenus.
          </p>
          <p className="text-muted-foreground">
            Votre rôle actuel : <strong className="text-foreground">{me ? ROLE_LABELS[me.role] : '—'}</strong>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-section">Le circuit d'un post</h2>
          <ol className="space-y-3">
            <Step badge={<StatusBadge status="draft" />}>
              Le <strong>CM</strong> crée le post (légende, réseau, date en heure de Paris,
              lien Canva) depuis <NavRef to="/app/planning">Planning</NavRef>, puis le soumet
              à la validation interne.
            </Step>
            <Step badge={<StatusBadge status="internal_review" />}>
              Un <strong>Lead</strong> relit et valide en interne, ou renvoie au rédacteur
              avec un commentaire. File dédiée :{' '}
              <NavRef to="/app/a-valider">À valider</NavRef>.
            </Step>
            <Step badge={<StatusBadge status="client_review" />}>
              Le post part chez le <strong>client</strong>, qui l'approuve ou demande une
              modification depuis son espace. Vous pouvez le relancer.
            </Step>
            <Step badge={<StatusBadge status="approved" />}>
              Post validé. Le CM le passe ensuite en <em>planifié</em> quand il est calé.
            </Step>
            <Step badge={<StatusBadge status="scheduled" />}>
              Prêt à partir. Une fois en ligne, on le marque{' '}
              <StatusBadge status="published" className="align-middle" />.
            </Step>
          </ol>
          <p className="text-muted-foreground">
            Un retour en arrière est toujours possible pour un Lead ou un Admin (avec
            commentaire quand c'est un renvoi). Tout changement est tracé dans l'onglet
            <strong className="text-foreground"> Historique</strong> du post.
          </p>
          <p className="text-muted-foreground">
            Un Admin peut activer le mode <strong className="text-foreground">« CM seul »</strong>{' '}
            (<NavRef to="/app/parametres/workflow">Paramètres → Circuit de validation</NavRef>) :
            le CM envoie alors le brouillon directement au client, sans validation interne.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-section">Qui fait quoi</h2>
          <dl className="divide-border/70 divide-y">
            <Role name="Community Manager">
              Crée et édite les posts de <em>ses</em> clients assignés, les soumet, répond aux
              retours, note la performance après publication.
            </Role>
            <Role name="Lead CM">
              Tout ce que fait un CM, sur <em>tous</em> les clients, plus : valider en interne,
              envoyer au client, réassigner, gérer la corbeille, déclencher la détection
              d'alertes.
            </Role>
            <Role name="Admin agence">
              Tout, plus la gestion des comptes (
              <NavRef to="/app/parametres">Paramètres</NavRef>), les seuils d'alertes et le
              journal des tâches planifiées.
            </Role>
            <Role name="Client">
              Accès à son espace uniquement : calendrier en lecture, posts à valider, archive
              des publiés, dépôt de briefs. Ne voit jamais les échanges internes.
            </Role>
          </dl>
        </section>

        <section className="space-y-3">
          <h2 className="text-section">Où trouver quoi</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            <MapItem icon={CalendarDays} to="/app/planning" label="Planning">
              Calendrier (mois / semaine), liste, kanban. Filtres, export .ics, actions en
              masse.
            </MapItem>
            <MapItem icon={ListChecks} to="/app/a-valider" label="À valider">
              Les posts en attente, du plus ancien au plus récent.
            </MapItem>
            <MapItem icon={Inbox} to="/app/demandes" label="Demandes clients">
              Les briefs déposés par les clients, à transformer en post.
            </MapItem>
            <MapItem icon={Users} to="/app/clients" label="Clients">
              Fiche par client : comptes, contacts, charte, onboarding, activité, export PDF.
            </MapItem>
            <MapItem icon={ListChecks} to="/app/alertes" label="Alertes">
              Retards de validation, échéances sans visuel, trous dans le calendrier…
            </MapItem>
            <MapItem icon={CalendarDays} to="/app" label="Accueil">
              Le tableau de bord : à traiter, cette semaine, clients à surveiller.
            </MapItem>
          </ul>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Bibliothèque</strong> (dans la barre latérale)
            regroupe idées, templates, marronniers et campagnes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-section flex items-center gap-2">
            <Keyboard className="h-4 w-4" aria-hidden="true" /> Raccourcis et astuces
          </h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <kbd className="bg-surface-2 rounded border px-1 text-xs">Échap</kbd> ferme le
              panneau de détail d'un post ou une fenêtre.
            </li>
            <li>
              Les filtres du planning sont dans l'URL : copiez le lien pour partager une vue
              filtrée (un client, une période, « avec note de perf »…).
            </li>
            <li>
              Sélectionnez plusieurs posts (cases à cocher en Liste ou Kanban) pour dupliquer,
              changer de statut, réassigner ou corbeille en une fois.
            </li>
            <li>
              <strong>Exporter .ics</strong> (Planning) reprend exactement le résultat filtré ;
              <strong> Exporter PDF</strong> (fiche client) produit un calendrier imprimable à
              partager.
            </li>
            <li>
              Cochez « Afficher les marronniers » sur le calendrier pour voir les dates clés du
              secteur en filigrane.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-section">Un souci ?</h2>
          <p>
            Pour une question sur un client ou un post, adressez-vous à votre Lead. Pour un
            problème de compte ou d'accès, contactez un Admin de l'agence.
          </p>
        </section>
      </div>
    </Page>
  );
}

function Step({ badge, children }: { badge: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="shrink-0">{badge}</span>
      <span>{children}</span>
    </li>
  );
}

function Role({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="font-medium">{name}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  );
}

function NavRef({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-primary font-medium hover:underline">
      {children}
    </Link>
  );
}

function MapItem({
  icon: Icon,
  to,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  to: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className="hover:border-border-strong hover:shadow-card group block h-full rounded-lg border p-3 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5"
      >
        <span className="flex items-center gap-2 font-medium">
          <Icon className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          {label}
          <ArrowRight className="ml-auto h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
        <span className="text-muted-foreground mt-1 block text-xs">{children}</span>
      </Link>
    </li>
  );
}
