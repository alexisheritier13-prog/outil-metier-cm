import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Page, PageHeader } from '@/components/Page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { useCurrentProfile } from '@/auth/useCurrentProfile';
import { ROLE_LABELS } from '@/shared/constants/roles';

/**
 * Aide in-app : référence complète des fonctionnalités, par onglet.
 * Contenu figé — aucune donnée.
 */
export function HelpPage() {
  const { data: me } = useCurrentProfile();
  const [tab, setTab] = useState('start');

  return (
    <Page>
      <PageHeader
        title="Aide"
        description="Tout ce que fait Cadence, expliqué. Ton rôle : "
      />
      <p className="-mt-4 text-sm">
        <strong>{me ? ROLE_LABELS[me.role] : '—'}</strong>
      </p>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="start">Prise en main</TabsTrigger>
          <TabsTrigger value="posts">Posts &amp; planning</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="clients">Clients &amp; portail</TabsTrigger>
          <TabsTrigger value="library">Bibliothèque &amp; alertes</TabsTrigger>
          <TabsTrigger value="account">Compte &amp; raccourcis</TabsTrigger>
        </TabsList>

        <div className="max-w-[74ch] text-sm leading-relaxed">
          <TabsContent value="start">
            <StartTab roleLabel={me ? ROLE_LABELS[me.role] : '—'} />
          </TabsContent>
          <TabsContent value="posts">
            <PostsTab />
          </TabsContent>
          <TabsContent value="validation">
            <ValidationTab />
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

function StartTab({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="space-y-8">
      <Section title="En deux mots">
        <p>
          Cadence planifie les publications réseaux sociaux de vos clients et fait passer
          chaque post par un <strong>circuit de validation</strong> : le CM prépare, un chef
          de projet valide en interne, le client approuve, puis le post est planifié et
          marqué publié. <strong>Chaque client ne voit que ses propres contenus</strong>, et
          chaque agence est totalement isolée des autres.
        </p>
        <p className="text-muted-foreground">
          Ton rôle actuel : <strong className="text-foreground">{roleLabel}</strong>.
        </p>
      </Section>

      <Section title="Premiers pas">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Configure ton agence</strong> — l'assistant{' '}
            <NavRef to="/bienvenue">Bienvenue</NavRef> (organisation solo ou équipe, réseaux,
            nom &amp; logo). Modifiable ensuite dans{' '}
            <NavRef to="/app/parametres/compte">Paramètres → Compte</NavRef>.
          </li>
          <li>
            <strong>Crée ton premier client</strong> depuis <NavRef to="/app/clients">Clients</NavRef>{' '}
            (Chef de projet / Directeur).
          </li>
          <li>
            <strong>Ajoute son équipe et ses contacts</strong> — assigne des CM au client,
            invite le contact côté client à son espace.
          </li>
          <li>
            <strong>Programme le premier post</strong> depuis{' '}
            <NavRef to="/app/planning">Planning</NavRef>. Le guide de première connexion sur
            l'<NavRef to="/app">accueil</NavRef> suit ces étapes.
          </li>
        </ol>
      </Section>

      <Section title="Qui fait quoi">
        <dl className="divide-border/70 divide-y">
          <Role name="CM">
            Crée et édite les posts de <em>ses</em> clients assignés, les soumet, répond aux
            retours, note la performance après publication.
          </Role>
          <Role name="Chef de projet">
            Tout ce que fait un CM, sur <em>tous</em> les clients de l'agence, plus : valider
            en interne, envoyer au client, réassigner, gérer la corbeille, lancer la détection
            d'alertes, créer / archiver des clients.
          </Role>
          <Role name="Directeur">
            Tout, plus la gestion des comptes (<NavRef to="/app/parametres">Paramètres</NavRef>),
            les seuils d'alertes, le circuit de validation, le journal des tâches planifiées,
            l'e-mail / mot de passe de n'importe quel compte.
          </Role>
          <Role name="Client">
            Son espace uniquement : calendrier en lecture, posts à valider, archive des
            publiés, dépôt de briefs. Ne voit jamais les échanges internes.
          </Role>
        </dl>
      </Section>

      <Section title="Carte de navigation">
        <ul className="grid gap-2 sm:grid-cols-2">
          <MapItem to="/app" label="Accueil">
            Tableau de bord : à traiter, cette semaine, clients à surveiller, activité.
          </MapItem>
          <MapItem to="/app/planning" label="Planning">
            Calendrier / liste / kanban des posts. Le cœur de l'outil.
          </MapItem>
          <MapItem to="/app/a-valider" label="À valider">
            Les posts en attente, interne puis client, du plus ancien au plus récent.
          </MapItem>
          <MapItem to="/app/demandes" label="Demandes clients">
            Les briefs déposés par les clients, à transformer en post.
          </MapItem>
          <MapItem to="/app/clients" label="Clients">
            Une fiche par client (8 onglets). Comptes, charte, contrat, accès, activité.
          </MapItem>
          <MapItem to="/app/alertes" label="Alertes">
            Retards, échéances sans visuel, trous de calendrier, marronniers non planifiés.
          </MapItem>
        </ul>
        <p className="text-muted-foreground">
          <strong className="text-foreground">Bibliothèque</strong> (barre latérale) regroupe
          Idées, Templates, Marronniers et Campagnes. En bas : Corbeille, Paramètres, Aide,
          « Faire un retour ».
        </p>
      </Section>
    </div>
  );
}

function PostsTab() {
  return (
    <div className="space-y-8">
      <Section title="Créer un post">
        <p>
          Bouton <strong>Nouveau post</strong> dans <NavRef to="/app/planning">Planning</NavRef>{' '}
          (ou touche <Kbd>n</Kbd>). Un panneau latéral s'ouvre : client, réseau, date &amp;
          heure <strong>en heure de Paris</strong>, légende, rubrique, tags, campagne, lien de
          travail Canva (interne, jamais montré au client).
        </p>
        <p>
          <strong>Partir d'un template</strong> pré-remplit légende et tags. Les specs du
          réseau choisi (formats, longueur de légende conseillée) s'affichent en repère.
        </p>
      </Section>

      <Section title="Visuels">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Upload</strong> photo / vidéo, carrousel ordonné (glisser-déposer pour
            réordonner).
          </li>
          <li>
            <strong>Bibliothèque de visuels</strong> — bouton « Bibliothèque » dans l'éditeur :
            réutiliser un visuel déjà uploadé pour ce client, sans le recharger.
          </li>
          <li>
            <strong>Aperçu façon réseau</strong> — onglet « Aperçu » du post : rendu carte
            Instagram / LinkedIn / Facebook pour se projeter.
          </li>
        </ul>
      </Section>

      <Section title="Les trois vues du planning">
        <dl className="divide-border/70 divide-y">
          <Role name="Calendrier">
            Mois ou semaine. Glisser-déposer un post pour le redater. Case « Afficher les
            marronniers » pour voir les dates clés du secteur en filigrane.
          </Role>
          <Role name="Liste">
            Triable, virtualisée (grands volumes). Cases à cocher pour les actions en masse.
          </Role>
          <Role name="Kanban">
            Une colonne par statut, glisser-déposer d'une colonne à l'autre.
          </Role>
        </dl>
      </Section>

      <Section title="Aller plus vite">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Séries de posts</strong> — bouton « Série » : programmer tout un mois d'un
            coup depuis un template (jours de la semaine + heure + nombre ou date de fin).
          </li>
          <li>
            <strong>Dupliquer</strong> un post (décalage de date paramétrable) — reprend
            légende, tags, campagne.
          </li>
          <li>
            <strong>Actions en masse</strong> (Liste / Kanban) — sélectionner plusieurs posts
            pour dupliquer, changer de statut, réassigner ou mettre à la corbeille en une fois.
          </li>
          <li>
            <strong>Filtres</strong> — client, réseau, statut, assigné, période, « avec note
            de perf ». Les filtres sont dans l'URL : copie le lien pour partager une vue.
          </li>
          <li>
            <strong>Export .ics</strong> — reprend exactement le résultat filtré, à importer
            dans n'importe quel agenda.
          </li>
        </ul>
      </Section>

      <Section title="Rubriques et équilibre">
        <p>
          Définis des <strong>rubriques</strong> par client (onglet Charte de la fiche client)
          avec un pourcentage cible — ex. 40&nbsp;% produit / 30&nbsp;% coulisses / 30&nbsp;%
          UGC. Chaque post reçoit une rubrique, et la <strong>jauge d'équilibre du mois</strong>{' '}
          (vue d'ensemble du client) compare le réel à la cible.
        </p>
      </Section>

      <Section title="Après publication">
        <p>
          Sur un post publié, une <strong>note de performance</strong> éditable (portée,
          engagement, retours). Visibilité côté client explicite (masquée par défaut). Filtre{' '}
          <em>« avec note de perf »</em> dans le planning.
        </p>
      </Section>
    </div>
  );
}

function ValidationTab() {
  return (
    <div className="space-y-8">
      <Section title="Le circuit d'un post">
        <ol className="space-y-3">
          <Step badge={<StatusBadge status="draft" />}>
            Le <strong>CM</strong> crée le post et le soumet à la validation interne.
          </Step>
          <Step badge={<StatusBadge status="internal_review" />}>
            Un <strong>chef de projet</strong> relit : il valide, ou renvoie au rédacteur avec
            un commentaire (obligatoire). File dédiée :{' '}
            <NavRef to="/app/a-valider">À valider</NavRef>.
          </Step>
          <Step badge={<StatusBadge status="client_review" />}>
            Le post part chez le <strong>client</strong>, qui l'approuve ou demande une
            modification depuis son espace. Bouton <em>Relancer</em> pour le notifier à nouveau.
          </Step>
          <Step badge={<StatusBadge status="approved" />}>
            Post validé. Le CM le passe en <em>planifié</em> quand il est calé.
          </Step>
          <Step badge={<StatusBadge status="scheduled" />}>
            Prêt à partir. Une fois en ligne, on le marque{' '}
            <StatusBadge status="published" className="align-middle" /> (manuellement, ou
            automatiquement — voir plus bas).
          </Step>
        </ol>
        <p className="text-muted-foreground">
          Retour en arrière toujours possible pour un chef de projet ou un directeur. Tout
          changement est tracé dans l'onglet <strong className="text-foreground">Historique</strong>{' '}
          du post.
        </p>
      </Section>

      <Section title="Valider depuis un lien (sans compte)">
        <p>
          Chaque post en validation client a un <strong>lien direct</strong> (encart « Lien de
          validation directe » dans le panneau post). Le contact l'ouvre, voit l'aperçu, et
          approuve ou demande une modif <strong>sans se connecter</strong>. Le lien est
          régénéré à chaque nouveau cycle de validation.
        </p>
      </Section>

      <Section title="Adapter le circuit">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Mode « CM seul »</strong> (Directeur —{' '}
            <NavRef to="/app/parametres/workflow">Paramètres → Circuit de validation</NavRef>) :
            pour un freelance / studio solo, le brouillon part directement au client, sans
            validation interne.
          </li>
          <li>
            <strong>Client sans validation</strong> (case dans la fiche client) : l'étape
            « à valider client » est sautée, un rôle interne passe le post directement en
            validé. Combiné au mode « CM seul », un brouillon peut aller droit en validé.
          </li>
        </ul>
      </Section>

      <Section title="Auto-publication">
        <p>
          Optionnel (<NavRef to="/app/parametres/compte">Paramètres → Compte</NavRef>) : quand
          c'est activé, un job passe automatiquement les posts <em>planifiés</em> échus en{' '}
          <em>publié</em>, toutes les 10 minutes. Le passage manuel reste possible.
        </p>
      </Section>
    </div>
  );
}

function ClientsTab() {
  return (
    <div className="space-y-8">
      <Section title="La fiche client">
        <p>
          <NavRef to="/app/clients">Clients</NavRef> → une fiche par client, à 8 onglets :
        </p>
        <dl className="divide-border/70 divide-y">
          <Role name="Vue d'ensemble">
            Synthèse tirée des autres onglets + jauge d'équilibre du mois. Chaque encart ouvre
            son onglet.
          </Role>
          <Role name="Contrat">
            Les grandes lignes de la prestation : périmètre, rythme, réseaux, début, conditions.
          </Role>
          <Role name="Comptes sociaux">
            Les comptes du client par réseau (identifiants publics).
          </Role>
          <Role name="Contacts">
            Les personnes côté client qui valident. Bouton <em>Inviter</em> pour créer leur
            accès à l'espace client. Un directeur peut gérer leur e-mail / mot de passe.
          </Role>
          <Role name="Accès">
            Tous les codes de connexion (mots de passe des comptes sociaux, outils…), masqués
            par défaut, révélables et copiables. <strong>Interne uniquement</strong>, jamais
            exposé au portail.
          </Role>
          <Role name="Charte">
            Charte éditoriale (ton, mots à éviter / privilégier, direction artistique) +
            charte graphique (couleurs de marque avec pastilles, typographies) + rubriques de
            contenu et leurs cibles.
          </Role>
          <Role name="Onboarding">
            Checklist de démarrage, pré-remplie depuis un modèle, réordonnable.
          </Role>
          <Role name="Activité">
            Le journal des actions sur ce client (filtres type + période).
          </Role>
        </dl>
        <p className="text-muted-foreground">
          <strong className="text-foreground">Export PDF</strong> — un calendrier imprimable
          du client, à partager.
        </p>
      </Section>

      <Section title="L'espace client (portail)">
        <p>Le contact du client se connecte et accède à :</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Calendrier</strong> — ses posts en lecture (mois / liste), aperçu façon
            réseau.
          </li>
          <li>
            <strong>À valider</strong> — les posts en attente de son approbation. Il approuve
            ou demande une modification avec un commentaire.
          </li>
          <li>
            <strong>Publiés</strong> — l'archive, avec recherche plein texte et filtres.
          </li>
          <li>
            <strong>Briefs</strong> — il dépose des demandes de contenu qui arrivent côté
            agence dans <NavRef to="/app/demandes">Demandes clients</NavRef>, transformables en
            post en un clic.
          </li>
        </ul>
        <p className="text-muted-foreground">
          Le client ne voit jamais les commentaires internes, le lien Canva, la note de perf
          (sauf si rendue visible), ni les autres clients.
        </p>
      </Section>

      <Section title="Corbeille">
        <p>
          Supprimer un post ou un client = <strong>corbeille</strong> (soft delete), pas de
          perte immédiate. Un chef de projet / directeur restaure ou purge.{' '}
          <NavRef to="/app/corbeille">Corbeille</NavRef>. Purge automatique après 60 jours.
        </p>
      </Section>
    </div>
  );
}

function LibraryTab() {
  return (
    <div className="space-y-8">
      <Section title="Bibliothèque">
        <dl className="divide-border/70 divide-y">
          <Role name="Idées">
            Idées de posts non datées. Sans client = visible de toute l'agence ; avec client =
            suit l'accès. Transformable en brouillon.
          </Role>
          <Role name="Templates">
            Modèles réutilisables (légende, réseau, tags). Globaux ou rattachés à un client.
            Utilisés à la création d'un post et par les séries.
          </Role>
          <Role name="Marronniers">
            Dates clés récurrentes (~70 pré-remplies) : globales, par secteur, ou propres à un
            client. Alerte quand un marronnier approche sans post prévu. Transformable en
            brouillon pré-daté.
          </Role>
          <Role name="Campagnes">
            Entité légère pour regrouper des posts (nom, dates, description). Vue avec le
            nombre de posts.
          </Role>
        </dl>
      </Section>

      <Section title="Alertes">
        <p>
          <NavRef to="/app/alertes">Alertes</NavRef> — détection automatique (chaque nuit +
          en journée) de 7 situations :
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>validation en attente depuis trop longtemps</li>
          <li>date de publication proche mais post non validé</li>
          <li>moins de N posts planifiés sur la fenêtre à venir (trou de calendrier)</li>
          <li>pas de visuel / lien alors que la date approche</li>
          <li>marronnier à venir sans post prévu</li>
          <li>client sans aucun post planifié sur 2 semaines</li>
          <li>post planifié aujourd'hui → rappel de publication</li>
        </ul>
        <p className="text-muted-foreground">
          Les seuils sont réglables par un directeur (
          <NavRef to="/app/parametres/alertes">Paramètres → Alertes</NavRef>). Bouton
          « Lancer maintenant » pour forcer la détection.
        </p>
      </Section>

      <Section title="Tâches planifiées">
        <p>
          <NavRef to="/app/parametres/jobs">Paramètres → Tâches planifiées</NavRef> (Directeur) :
          le journal des jobs automatiques (détection d'alertes, purge de la corbeille,
          auto-publication, envoi d'e-mails). Un échec notifie les directeurs.
        </p>
      </Section>

      <Section title="Notifications et e-mails">
        <p>
          <strong>Cloche</strong> en haut de la barre latérale (et de l'espace client) : posts
          soumis / validés / renvoyés / approuvés / refusés, commentaires, échéances. Marquer
          lu à la volée.
        </p>
        <p className="text-muted-foreground">
          Si l'agence a branché l'envoi d'e-mails, chaque notification part aussi par e-mail
          (avec un lien direct vers l'élément concerné).
        </p>
      </Section>
    </div>
  );
}

function AccountTab() {
  return (
    <div className="space-y-8">
      <Section title="Ton compte">
        <p>
          <NavRef to="/app/mon-compte">Mon compte</NavRef> (bloc utilisateur en bas de la
          barre) : nom, photo de profil, changer ton mot de passe.
        </p>
      </Section>

      <Section title="Gérer l'équipe (Directeur)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <NavRef to="/app/parametres/utilisateurs">Paramètres → Utilisateurs</NavRef> —
            créer un compte interne (CM / chef de projet / directeur), l'activer, l'assigner à
            des clients. Un lien de définition de mot de passe est fourni (ou envoyé par
            e-mail si configuré).
          </li>
          <li>
            Changer l'<strong>e-mail ou le mot de passe</strong> de n'importe quel compte de
            l'agence, ou générer un lien à transmettre.
          </li>
        </ul>
      </Section>

      <Section title="Réglages de l'agence (Directeur)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <NavRef to="/app/parametres/compte">Compte</NavRef> — organisation (solo /
            équipe), validation client par défaut, réseaux proposés, nom &amp; logo de
            l'agence (affichés dans l'espace client), auto-publication.
          </li>
          <li>
            <NavRef to="/app/parametres/workflow">Circuit de validation</NavRef> — mode
            « CM seul ».
          </li>
          <li>
            <NavRef to="/app/parametres/alertes">Alertes</NavRef> — seuils de détection.
          </li>
        </ul>
      </Section>

      <Section title="Plusieurs agences">
        <p>
          Chaque agence a son espace <strong>totalement cloisonné</strong> : clients, posts,
          équipe, réglages. Personne ne voit les données d'une autre agence. Une nouvelle
          agence rejoint Cadence <strong>sur invitation</strong> (lien à usage unique).
        </p>
      </Section>

      <Section title="Faire un retour">
        <p>
          Bouton <strong>« Faire un retour »</strong> en bas de la barre latérale (et dans
          l'espace client) : signaler un bug, proposer une idée. La page où tu étais est jointe
          automatiquement.
        </p>
      </Section>

      <Section title="Raccourcis et astuces">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <Kbd>⌘</Kbd>/<Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> ou <Kbd>/</Kbd> — recherche globale
            (clients, posts, idées).
          </li>
          <li>
            <Kbd>n</Kbd> — nouveau post.
          </li>
          <li>
            <Kbd>Échap</Kbd> — ferme le panneau de détail ou une fenêtre.
          </li>
          <li>
            Les filtres du planning vivent dans l'URL — partage le lien pour partager la vue.
          </li>
          <li>
            <strong>Export .ics</strong> (planning) et <strong>Export PDF</strong> (fiche
            client) reprennent le contexte courant.
          </li>
        </ul>
      </Section>
    </div>
  );
}

/* ─────────────────────────────  Primitives  ───────────────────────────── */

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-section">{title}</h2>
      {children}
    </section>
  );
}

function Step({ badge, children }: { badge: ReactNode; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="shrink-0">{badge}</span>
      <span>{children}</span>
    </li>
  );
}

function Role({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="font-medium">{name}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  );
}

function NavRef({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-primary font-medium hover:underline">
      {children}
    </Link>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="bg-surface-2 rounded border px-1 text-xs">{children}</kbd>;
}

function MapItem({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="hover:border-border-strong hover:shadow-card block h-full rounded-lg border p-3 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5"
      >
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground mt-1 block text-xs">{children}</span>
      </Link>
    </li>
  );
}
