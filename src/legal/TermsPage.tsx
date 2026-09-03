import { LegalLayout } from './LegalLayout';

/**
 * Conditions générales d'utilisation. Modèle à faire relire par un juriste avant
 * ouverture large.
 */
export function TermsPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" updatedAt="3 septembre 2026">
      <p>
        Les présentes conditions générales d'utilisation (les « CGU ») régissent l'accès et
        l'utilisation de l'application <strong>Cadence</strong> (le « Service »), éditée par{' '}
        <strong>Alexis Heritier, entrepreneur individuel</strong>, immatriculé sous le numéro{' '}
        <strong>SIRET 914 882 303 00029</strong> (SIREN 914 882 303), dont le siège est situé{' '}
        <strong>1280 avenue Pierre Augier, 84120 Pertuis, France</strong> (l'« Éditeur »).
      </p>
      <p>
        Contact :{' '}
        <a href="mailto:alexis.heritier13@gmail.com">alexis.heritier13@gmail.com</a>. Directeur
        de la publication : <strong>Alexis Heritier</strong>. Hébergement : voir l'article 9.
      </p>

      <h2>1. Objet</h2>
      <p>
        Cadence est un outil de gestion de Community Management pour agences et indépendants :
        planification multi-clients de publications sur les réseaux sociaux, circuit de
        validation interne puis client, organisation du contenu et alertes. Le Service ne
        publie pas directement sur les réseaux sociaux.
      </p>

      <h2>2. Acceptation</h2>
      <p>
        L'utilisation du Service suppose l'acceptation sans réserve des présentes CGU. Cette
        acceptation intervient lors de la création d'un compte ou de la première connexion. Si
        vous n'acceptez pas ces CGU, vous ne devez pas utiliser le Service.
      </p>
      <p>
        La personne qui crée une organisation (le « Directeur ») accepte les CGU au nom de son
        organisation et garantit disposer du pouvoir de l'engager.
      </p>

      <h2>3. Accès au Service et comptes</h2>
      <ul>
        <li>
          L'inscription se fait <strong>sur invitation</strong>. Un compte est nominatif et
          personnel ; il ne doit pas être partagé.
        </li>
        <li>
          L'utilisateur est responsable de la confidentialité de ses identifiants et de toute
          activité réalisée depuis son compte. Toute utilisation suspecte doit être signalée
          sans délai à l'Éditeur.
        </li>
        <li>
          Chaque organisation est cloisonnée : ses données ne sont pas accessibles aux autres
          organisations.
        </li>
      </ul>

      <h2>4. Phase bêta</h2>
      <p>
        Le Service est actuellement proposé en <strong>version bêta</strong>. Il est fourni
        « en l'état », peut évoluer, être interrompu ou présenter des dysfonctionnements. Aucun
        engagement de niveau de service (disponibilité, délai de correction) n'est pris pendant
        cette phase. L'Éditeur pourra modifier ou mettre fin à la bêta, en informant les
        utilisateurs dans un délai raisonnable.
      </p>

      <h2>5. Utilisation conforme</h2>
      <p>L'utilisateur s'engage à ne pas :</p>
      <ul>
        <li>
          publier ou stocker via le Service un contenu illicite, diffamatoire, portant
          atteinte aux droits de tiers (droit d'auteur, droit à l'image, marques) ou à l'ordre
          public ;
        </li>
        <li>
          tenter d'accéder à des données d'une autre organisation, de contourner les mesures
          de sécurité, ou de perturber le fonctionnement du Service ;
        </li>
        <li>
          utiliser le Service pour de l'envoi massif non sollicité, du scraping automatisé ou
          toute activité contraire aux conditions des plateformes tierces concernées.
        </li>
      </ul>
      <p>
        L'Éditeur peut suspendre l'accès d'un compte ou d'une organisation en cas de
        manquement grave ou de risque pour le Service ou les autres utilisateurs.
      </p>

      <h2>6. Contenus des utilisateurs</h2>
      <p>
        Les contenus créés ou importés par l'utilisateur (légendes, visuels, briefs, notes,
        coordonnées de contacts, etc.) restent la propriété de son organisation ou des ayants
        droit concernés. L'utilisateur garantit détenir les droits nécessaires sur ces
        contenus.
      </p>
      <p>
        L'utilisateur concède à l'Éditeur une licence limitée à l'hébergement, au traitement
        et à l'affichage de ces contenus dans le seul but de fournir le Service. L'Éditeur ne
        revendique aucun droit de propriété sur ces contenus et ne les exploite pas à d'autres
        fins.
      </p>

      <h2>7. Propriété intellectuelle du Service</h2>
      <p>
        Le Service, sa marque, son interface, son code et sa documentation sont la propriété
        exclusive de l'Éditeur. Les présentes CGU ne confèrent qu'un droit d'usage personnel,
        non exclusif et non cessible, pour la durée de l'abonnement.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans la{' '}
        <a href="/confidentialite">politique de confidentialité</a>, qui fait partie
        intégrante des présentes CGU. Chaque organisation est responsable de traitement pour
        les données de ses propres clients et contacts qu'elle importe dans le Service ;
        l'Éditeur agit alors en qualité de sous-traitant.
      </p>

      <h2>9. Hébergement et prestataires</h2>
      <p>Le Service s'appuie sur les prestataires suivants :</p>
      <ul>
        <li>
          <strong>Supabase</strong> (base de données, authentification, stockage), données
          hébergées dans l'Union européenne (région <strong>eu-west-1, Irlande</strong>) ;
        </li>
        <li>
          <strong>Vercel</strong> (hébergement et distribution de l'application) ;
        </li>
        <li>
          <strong>Resend</strong> (envoi d'e-mails transactionnels).
        </li>
      </ul>

      <h2>10. Disponibilité et maintenance</h2>
      <p>
        L'Éditeur s'efforce d'assurer un accès continu au Service mais ne garantit pas une
        disponibilité ininterrompue. Des interruptions peuvent survenir pour maintenance, mise
        à jour ou cause indépendante de la volonté de l'Éditeur (notamment défaillance d'un
        prestataire).
      </p>

      <h2>11. Responsabilité</h2>
      <p>
        Le Service est un outil d'organisation : l'utilisateur reste seul responsable des
        contenus qu'il publie sur les réseaux sociaux, des dates retenues et des validations
        obtenues. L'Éditeur ne saurait être tenu responsable des dommages indirects (perte de
        chiffre d'affaires, de clientèle, d'image). Dans les limites permises par la loi, la
        responsabilité de l'Éditeur, tous préjudices confondus, est plafonnée aux sommes
        effectivement versées par l'organisation au titre des douze mois précédant le fait
        générateur, ou, pendant la bêta gratuite, à un montant symbolique.
      </p>

      <h2>12. Durée et résiliation</h2>
      <ul>
        <li>
          Les CGU s'appliquent tant que l'utilisateur dispose d'un compte actif.
        </li>
        <li>
          L'utilisateur peut demander la suppression de son compte à tout moment à l'adresse
          de contact. Un Directeur peut demander la fermeture de son organisation.
        </li>
        <li>
          L'Éditeur peut résilier l'accès en cas de manquement non corrigé sous 8 jours après
          mise en demeure, ou immédiatement en cas de manquement grave.
        </li>
        <li>
          À la fermeture d'une organisation, ses données sont supprimées ou anonymisées dans
          les conditions prévues par la politique de confidentialité.
        </li>
      </ul>

      <h2>13. Modification des CGU</h2>
      <p>
        L'Éditeur peut modifier les CGU. Les utilisateurs sont informés par e-mail ou via le
        Service au moins 15 jours avant l'entrée en vigueur des modifications substantielles.
        La poursuite de l'utilisation vaut acceptation.
      </p>

      <h2>14. Droit applicable et litiges</h2>
      <p>
        Les présentes CGU sont soumises au droit français. En cas de litige, les parties
        rechercheront une solution amiable ; à défaut, compétence est attribuée aux tribunaux
        compétents d'<strong>Avignon</strong>, sous réserve des règles impératives applicables
        aux consommateurs le cas échéant.
      </p>

      <h2>15. Contact</h2>
      <p>
        Toute question relative aux présentes CGU peut être adressée à{' '}
        <a href="mailto:alexis.heritier13@gmail.com">alexis.heritier13@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
