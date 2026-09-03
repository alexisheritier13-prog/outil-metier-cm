import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Page, PageHeader } from '@/components/Page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { ROLE_LABELS } from '@/shared/constants/roles';

/**
 * Aide in-app : référence des fonctionnalités, un sujet par ligne dépliable.
 * Contenu figé, aucune donnée. On déplie ce qu'on cherche, le reste reste calme.
 */
export function HelpPage() {
  const { data: me } = useCurrentProfile();
  const [tab, setTab] = useState('start');

  return (
    <Page>
      <PageHeader
        title="Aide"
        description="Comment Cadence fonctionne, par sujet. Déplie ce dont tu as besoin."
        aside={
          me ? (
            <span className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs">
              {ROLE_LABELS[me.role]}
            </span>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList>
          <TabsTrigger value="start">Prise en main</TabsTrigger>
          <TabsTrigger value="post">Le post</TabsTrigger>
          <TabsTrigger value="clients">Clients &amp; portail</TabsTrigger>
          <TabsTrigger value="library">Bibliothèque &amp; alertes</TabsTrigger>
          <TabsTrigger value="account">Compte &amp; équipe</TabsTrigger>
        </TabsList>

        <div className="max-w-[72ch]">
          <TabsContent value="start">
            <StartTab />
          </TabsContent>
          <TabsContent value="post">
            <PostTab />
          </TabsContent>
          <TabsContent value="clients">
            <ClientsTab />
          </TabsContent>
          <TabsContent value="library">
            <LibraryTab />
          </TabsContent>
          <TabsContent value="account">
            <AccountTab />
          </TabsContent>
        </div>
      </Tabs>
    </Page>
  );
}

/* ─────────────────────────────  Onglets  ───────────────────────────── */

function StartTab() {
  return (
    <div className="space-y-6">
      <nav aria-label="Où trouver quoi" className="surface-card divide-border/70 divide-y p-1.5">
        {NAV_MAP.map(([to, label, desc]) => (
          <Link
            key={to}
            to={to}
            className="focus-visible:ring-primary/30 hover:bg-surface-2 -my-px flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <span className="font-medium">{label}</span>
            <span className="text-muted-foreground text-xs">{desc}</span>
          </Link>
        ))}
      </nav>

      <Accordion>
        <Topic title="En deux mots" defaultOpen>
          <p>
            Cadence planifie les publications réseaux sociaux de vos clients et fait passer
            chaque post par un <strong>circuit de validation</strong> : le CM prépare, un chef
            de projet valide en interne, le client approuve, le post est planifié puis marqué
            publié.
          </p>
          <p>
            Chaque client ne voit que ses propres contenus. Chaque agence est isolée des
            autres.
          </p>
        </Topic>

        <Topic title="Premiers pas" teaser="configurer l'agence, créer un client, poser le 1er post">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              <strong>Configure l'agence</strong> : assistant{' '}
              <Ref to="/bienvenue">Bienvenue</Ref> (solo ou équipe, réseaux, nom et logo).
              Modifiable dans <Ref to="/app/parametres/compte">Paramètres, Compte</Ref>.
            </li>
            <li>
              <strong>Crée un client</strong> depuis <Ref to="/app/clients">Clients</Ref> (chef
              de projet ou directeur).
            </li>
            <li>
              <strong>Ajoute l'équipe et les contacts</strong> : assigne des CM au client,
              invite son contact à l'espace client.
            </li>
            <li>
              <strong>Programme le premier post</strong> depuis{' '}
              <Ref to="/app/planning">Planning</Ref>. Le guide sur l'
              <Ref to="/app">accueil</Ref> suit ces étapes.
            </li>
          </ol>
        </Topic>

        <Topic title="Qui fait quoi" teaser="CM, chef de projet, directeur, client">
          <Defs
            items={[
              ['CM', 'Crée et édite les posts de ses clients assignés, les soumet, répond aux retours, note la performance.'],
              ['Chef de projet', 'Tout ce que fait un CM, sur tous les clients, plus : valider en interne, envoyer au client, réassigner, gérer la corbeille, lancer les alertes, créer ou archiver des clients.'],
              ['Directeur', 'Tout, plus les comptes, les seuils d’alertes, le circuit de validation, le journal des tâches, l’e-mail et le mot de passe de n’importe quel compte.'],
              ['Client', 'Son espace seulement : calendrier en lecture, posts à valider, publiés, dépôt de briefs. Jamais les échanges internes.'],
            ]}
          />
        </Topic>
      </Accordion>
    </div>
  );
}

function PostTab() {
  return (
    <Accordion>
      <Topic title="Le circuit de validation" defaultOpen teaser="brouillon → interne → client → planifié → publié">
        <ol className="space-y-2.5">
          <Stage badge={<StatusBadge status="draft" />}>
            Le <strong>CM</strong> crée le post et le soumet à la validation interne.
          </Stage>
          <Stage badge={<StatusBadge status="internal_review" />}>
            Un <strong>chef de projet</strong> relit : il valide, ou renvoie au rédacteur avec
            un commentaire obligatoire. File dédiée :{' '}
            <Ref to="/app/a-valider">À valider</Ref>.
          </Stage>
          <Stage badge={<StatusBadge status="client_review" />}>
            Le <strong>client</strong> approuve ou demande une modification depuis son espace.
            Bouton <em>Relancer</em> pour le notifier à nouveau.
          </Stage>
          <Stage badge={<StatusBadge status="approved" />}>
            Post validé. Le CM le passe en <em>planifié</em> quand il est calé.
          </Stage>
          <Stage badge={<StatusBadge status="scheduled" />}>
            Prêt à partir. Une fois en ligne, on le marque{' '}
            <StatusBadge status="published" className="align-middle" />, à la main ou
            automatiquement.
          </Stage>
        </ol>
        <p>
          Le retour en arrière reste possible pour un chef de projet ou un directeur. Tout
          changement est tracé dans l'onglet <strong>Historique</strong> du post.
        </p>
      </Topic>

      <Topic title="Créer un post" teaser="panneau latéral, touche n">
        <p>
          Bouton <strong>Nouveau post</strong> dans <Ref to="/app/planning">Planning</Ref>, ou
          touche <Kbd>n</Kbd>. Un panneau latéral s'ouvre : client, réseau, date et heure{' '}
          <strong>en heure de Paris</strong>, légende, rubrique, tags, campagne, lien de
          travail Canva (interne, jamais montré au client).
        </p>
        <p>
          <strong>Partir d'un template</strong> pré-remplit légende et tags. Les specs du
          réseau choisi s'affichent en repère.
        </p>
      </Topic>

      <Topic title="Visuels" teaser="upload, bibliothèque, aperçu réseau">
        <Defs
          items={[
            ['Upload', 'Photo ou vidéo, carrousel ordonné (glisser-déposer pour réordonner).'],
            ['Bibliothèque', 'Bouton dans l’éditeur : réutiliser un visuel déjà chargé pour ce client, sans le recharger.'],
            ['Aperçu', 'Onglet du post : rendu carte Instagram, LinkedIn ou Facebook pour se projeter.'],
          ]}
        />
      </Topic>

      <Topic title="Les trois vues du planning" teaser="calendrier, liste, kanban">
        <Defs
          items={[
            ['Calendrier', 'Mois ou semaine. Glisser-déposer un post pour le redater. Case pour afficher les marronniers du secteur en filigrane.'],
            ['Liste', 'Triable, virtualisée pour les gros volumes. Cases à cocher pour les actions en masse.'],
            ['Kanban', 'Une colonne par statut, glisser-déposer d’une colonne à l’autre.'],
          ]}
        />
      </Topic>

      <Topic title="Aller plus vite" teaser="séries, duplication, actions en masse, filtres">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Séries</strong> : bouton « Série », programmer tout un mois depuis un
            template (jours de la semaine, heure, nombre ou date de fin).
          </li>
          <li>
            <strong>Dupliquer</strong> un post avec décalage de date : reprend légende, tags,
            campagne.
          </li>
          <li>
            <strong>Actions en masse</strong> (Liste, Kanban) : dupliquer, changer de statut,
            réassigner ou corbeille pour plusieurs posts d'un coup.
          </li>
          <li>
            <strong>Filtres</strong> (client, réseau, statut, assigné, période) : ils vivent
            dans l'URL, copie le lien pour partager une vue.
          </li>
          <li>
            <strong>Export .ics</strong> : reprend le résultat filtré, à importer dans un
            agenda.
          </li>
        </ul>
      </Topic>

      <Topic title="Rubriques et équilibre" teaser="40 % produit / 30 % coulisses…">
        <p>
          Définis des <strong>rubriques</strong> par client (onglet Charte de la fiche) avec
          un pourcentage cible. Chaque post reçoit une rubrique, et la{' '}
          <strong>jauge d'équilibre du mois</strong> (vue d'ensemble du client) compare le
          réel à la cible.
        </p>
      </Topic>

      <Topic title="Valider depuis un lien" teaser="le client approuve sans compte">
        <p>
          Chaque post en validation client a un <strong>lien direct</strong> (encart dans le
          panneau post). Le contact l'ouvre, voit l'aperçu, approuve ou demande une
          correction. Sans se connecter. Le lien est régénéré à chaque nouveau cycle.
        </p>
      </Topic>

      <Topic title="Adapter le circuit" teaser="mode CM seul, client sans validation">
        <Defs
          items={[
            ['Mode « CM seul »', 'Directeur, Paramètres, Circuit de validation. Pour un freelance : le brouillon part directement au client, sans validation interne.'],
            ['Client sans validation', 'Case dans la fiche client. L’étape « à valider client » est sautée. Combiné au mode « CM seul », un brouillon peut aller droit en validé.'],
          ]}
        />
      </Topic>

      <Topic title="Auto-publication" teaser="optionnel">
        <p>
          <Ref to="/app/parametres/compte">Paramètres, Compte</Ref> : quand c'est activé, un
          job passe les posts <em>planifiés</em> échus en <em>publié</em> toutes les 10
          minutes. Le passage manuel reste possible.
        </p>
      </Topic>

      <Topic title="Après publication" teaser="note de performance">
        <p>
          Sur un post publié, une <strong>note de performance</strong> éditable (portée,
          engagement, retours). Sa visibilité côté client est explicite, masquée par défaut.
          Filtre <em>« avec note de perf »</em> dans le planning.
        </p>
      </Topic>
    </Accordion>
  );
}

function ClientsTab() {
  return (
    <Accordion>
      <Topic title="La fiche client" defaultOpen teaser="8 onglets par client">
        <Defs
          items={[
            ['Vue d’ensemble', 'Synthèse des autres onglets et jauge d’équilibre du mois. Chaque encart ouvre son onglet.'],
            ['Contrat', 'Les grandes lignes de la prestation : périmètre, rythme, réseaux, début, conditions.'],
            ['Comptes sociaux', 'Les comptes du client par réseau.'],
            ['Contacts', 'Les personnes qui valident côté client. Bouton Inviter pour créer leur accès. Un directeur gère leur e-mail et mot de passe.'],
            ['Accès', 'Tous les codes de connexion (comptes sociaux, outils), masqués par défaut, révélables et copiables. Interne uniquement, jamais au portail.'],
            ['Charte', 'Charte éditoriale (ton, mots à éviter ou privilégier, direction artistique), charte graphique (couleurs, typos), rubriques de contenu et cibles.'],
            ['Onboarding', 'Checklist de démarrage, pré-remplie depuis un modèle, réordonnable.'],
            ['Activité', 'Le journal des actions sur ce client (filtres type et période).'],
          ]}
        />
        <p>
          <strong>Export PDF</strong> : un calendrier imprimable du client, à partager.
        </p>
      </Topic>

      <Topic title="L'espace client" teaser="ce que voit le contact">
        <Defs
          items={[
            ['Calendrier', 'Ses posts en lecture (mois ou liste), aperçu façon réseau.'],
            ['À valider', 'Les posts en attente de son approbation. Il approuve ou demande une modification avec un commentaire.'],
            ['Publiés', 'L’archive, avec recherche plein texte et filtres.'],
            ['Briefs', 'Il dépose des demandes de contenu qui arrivent dans Demandes clients, transformables en post en un clic.'],
          ]}
        />
        <p>
          Le client ne voit jamais les commentaires internes, le lien Canva, la note de perf
          (sauf si rendue visible), ni les autres clients.
        </p>
      </Topic>

      <Topic title="Corbeille" teaser="soft delete, purge à 60 jours">
        <p>
          Supprimer un post ou un client, c'est la <strong>corbeille</strong>, pas une perte
          immédiate. Un chef de projet ou un directeur restaure ou purge depuis{' '}
          <Ref to="/app/corbeille">Corbeille</Ref>. Purge automatique après 60 jours.
        </p>
      </Topic>
    </Accordion>
  );
}

function LibraryTab() {
  return (
    <Accordion>
      <Topic title="Bibliothèque" defaultOpen teaser="idées, templates, marronniers, campagnes">
        <Defs
          items={[
            ['Idées', 'Idées de posts non datées. Sans client : visible de toute l’agence. Avec client : suit l’accès. Transformable en brouillon.'],
            ['Templates', 'Modèles réutilisables (légende, réseau, tags). Globaux ou rattachés à un client. Utilisés à la création et par les séries.'],
            ['Marronniers', 'Dates clés récurrentes (~70 pré-remplies) : globales, par secteur, ou propres à un client. Alerte à l’approche sans post prévu. Transformable en brouillon pré-daté.'],
            ['Campagnes', 'Regrouper des posts (nom, dates, description). Vue avec le nombre de posts.'],
          ]}
        />
      </Topic>

      <Topic title="Alertes" teaser="7 situations détectées automatiquement">
        <p>
          <Ref to="/app/alertes">Alertes</Ref> : détection chaque nuit et en journée de :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>validation en attente depuis trop longtemps</li>
          <li>date de publication proche mais post non validé</li>
          <li>trou de calendrier (moins de N posts planifiés sur la fenêtre)</li>
          <li>pas de visuel ni de lien alors que la date approche</li>
          <li>marronnier à venir sans post prévu</li>
          <li>client sans aucun post planifié sur 2 semaines</li>
          <li>post planifié aujourd'hui : rappel de publication</li>
        </ul>
        <p>
          Seuils réglables par un directeur (
          <Ref to="/app/parametres/alertes">Paramètres, Alertes</Ref>). Bouton « Lancer
          maintenant » pour forcer la détection.
        </p>
      </Topic>

      <Topic title="Tâches planifiées" teaser="Directeur">
        <p>
          <Ref to="/app/parametres/jobs">Paramètres, Tâches planifiées</Ref> : le journal des
          jobs automatiques (alertes, purge de la corbeille, auto-publication, e-mails). Un
          échec notifie les directeurs.
        </p>
      </Topic>

      <Topic title="Notifications et e-mails" teaser="cloche en haut de la barre">
        <p>
          La <strong>cloche</strong> en haut de la barre latérale (et de l'espace client) :
          posts soumis, validés, renvoyés, approuvés, refusés, commentaires, échéances.
          Marquer lu à la volée.
        </p>
        <p>
          Si l'agence a branché l'envoi d'e-mails, chaque notification part aussi par e-mail,
          avec un lien direct vers l'élément concerné.
        </p>
      </Topic>
    </Accordion>
  );
}

function AccountTab() {
  return (
    <Accordion>
      <Topic title="Ton compte" defaultOpen teaser="nom, photo, mot de passe">
        <p>
          <Ref to="/app/mon-compte">Mon compte</Ref> (bloc utilisateur en bas de la barre) :
          nom, photo de profil, changement de mot de passe.
        </p>
      </Topic>

      <Topic title="Gérer l'équipe" teaser="Directeur">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <Ref to="/app/parametres/utilisateurs">Paramètres, Utilisateurs</Ref> : créer un
            compte interne (CM, chef de projet, directeur), l'activer, l'assigner à des
            clients. Un lien de mot de passe est fourni, ou envoyé par e-mail si configuré.
          </li>
          <li>
            Changer l'<strong>e-mail ou le mot de passe</strong> de n'importe quel compte de
            l'agence, ou générer un lien à transmettre.
          </li>
        </ul>
      </Topic>

      <Topic title="Réglages de l'agence" teaser="Directeur">
        <Defs
          items={[
            ['Compte', 'Organisation (solo ou équipe), validation client par défaut, réseaux proposés, nom et logo de l’agence (affichés au portail), auto-publication.'],
            ['Circuit de validation', 'Mode « CM seul ».'],
            ['Alertes', 'Seuils de détection.'],
          ]}
        />
      </Topic>

      <Topic title="Plusieurs agences" teaser="cloisonnement, invitation">
        <p>
          Chaque agence a son espace <strong>totalement cloisonné</strong> : clients, posts,
          équipe, réglages. Personne ne voit les données d'une autre agence. Une nouvelle
          agence rejoint Cadence <strong>sur invitation</strong> (lien à usage unique).
        </p>
      </Topic>

      <Topic title="Faire un retour" teaser="bug ou idée">
        <p>
          Bouton <strong>« Faire un retour »</strong> en bas de la barre latérale (et dans
          l'espace client) : signaler un bug, proposer une idée. La page où tu étais est
          jointe automatiquement.
        </p>
      </Topic>

      <Topic title="Raccourcis" teaser="⌘K, n, Échap">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <Kbd>⌘</Kbd>/<Kbd>Ctrl</Kbd> <Kbd>K</Kbd> ou <Kbd>/</Kbd> : recherche globale
            (clients, posts, idées).
          </li>
          <li>
            <Kbd>n</Kbd> : nouveau post.
          </li>
          <li>
            <Kbd>Échap</Kbd> : ferme le panneau de détail ou une fenêtre.
          </li>
          <li>Les filtres du planning vivent dans l'URL : partage le lien, partage la vue.</li>
        </ul>
      </Topic>
    </Accordion>
  );
}

/* ─────────────────────────────  Données  ───────────────────────────── */

const NAV_MAP: [string, string, string][] = [
  ['/app', 'Accueil', 'à traiter, cette semaine, activité'],
  ['/app/planning', 'Planning', 'calendrier, liste, kanban des posts'],
  ['/app/a-valider', 'À valider', 'posts en attente, interne puis client'],
  ['/app/demandes', 'Demandes clients', 'briefs déposés par les clients'],
  ['/app/clients', 'Clients', 'une fiche à 8 onglets par client'],
  ['/app/alertes', 'Alertes', 'retards, trous de calendrier, marronniers'],
];

/* ─────────────────────────────  Primitives  ───────────────────────────── */

function Accordion({ children }: { children: ReactNode }) {
  return (
    <div className="surface-card [&>details]:border-border/70 [&>details:not(:last-child)]:border-b px-4">
      {children}
    </div>
  );
}

function Topic({
  title,
  teaser,
  defaultOpen = false,
  children,
}: {
  title: string;
  teaser?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="focus-visible:ring-primary/30 -mx-1.5 flex cursor-pointer list-none items-baseline gap-2 rounded-lg px-1.5 py-3 focus-visible:outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none"
          aria-hidden
        />
        <span className="text-sm font-medium">{title}</span>
        {teaser && (
          <span className="text-muted-foreground hidden text-xs sm:inline sm:group-open:hidden">
            {teaser}
          </span>
        )}
      </summary>
      <div className="text-muted-foreground space-y-3 pb-4 pl-6 text-sm leading-relaxed text-pretty [&_a:hover]:underline [&_a]:font-medium [&_a]:text-primary [&_em]:not-italic [&_em]:text-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </details>
  );
}

/** Liste terme + description : la seule forme d'énumération de la page. */
function Defs({ items }: { items: [string, string][] }) {
  return (
    <dl className="divide-border/60 divide-y">
      {items.map(([term, desc]) => (
        <div key={term} className="grid gap-0.5 py-2 sm:grid-cols-[9rem_1fr] sm:gap-3">
          <dt className="text-foreground font-medium">{term}</dt>
          <dd>{desc}</dd>
        </div>
      ))}
    </dl>
  );
}

function Stage({ badge, children }: { badge: ReactNode; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="shrink-0">{badge}</span>
      <span>{children}</span>
    </li>
  );
}

function Ref({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-primary font-medium hover:underline">
      {children}
    </Link>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="bg-surface-2 border-border text-foreground rounded border px-1 text-xs">
      {children}
    </kbd>
  );
}
