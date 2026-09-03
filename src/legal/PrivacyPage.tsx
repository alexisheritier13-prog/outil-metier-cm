import { LegalLayout } from './LegalLayout';

/**
 * Politique de confidentialité (RGPD). Modèle à faire relire par un juriste / DPO
 * avant ouverture large. Les mentions entre crochets [ ] sont à compléter.
 */
export function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" updatedAt="[À COMPLÉTER : date]">
      <p>
        La présente politique décrit comment l'application <strong>Cadence</strong> (le
        « Service ») traite les données à caractère personnel, conformément au Règlement
        général sur la protection des données (RGPD) et à la loi Informatique et Libertés.
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>
        Pour les données liées au fonctionnement du Service (comptes, journaux, communications
        avec le support), le responsable de traitement est{' '}
        <strong>[À COMPLÉTER : raison sociale ou nom de l'éditeur]</strong>,{' '}
        <strong>[À COMPLÉTER : adresse]</strong>, contact{' '}
        <a href="mailto:[À COMPLÉTER : email]">[À COMPLÉTER : email]</a> (l'« Éditeur »).
      </p>
      <p>
        Pour les données que chaque organisation importe dans le Service au sujet de ses
        propres clients et contacts (noms, adresses e-mail des contacts de validation,
        contenus, identifiants d'accès), <strong>l'organisation</strong> est responsable de
        traitement et l'Éditeur agit en tant que <strong>sous-traitant</strong>, sur
        instruction de l'organisation.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>
          <strong>Compte</strong> : nom, adresse e-mail, rôle, organisation de rattachement,
          photo de profil (facultative), mot de passe (stocké sous forme chiffrée / hachée par
          le fournisseur d'authentification, jamais en clair).
        </li>
        <li>
          <strong>Contenus créés dans le Service</strong> : posts et légendes, visuels
          importés, briefs, commentaires, notes de performance, fiches clients, contacts de
          validation, codes de connexion saisis (chiffrés au repos, visibles uniquement de
          l'équipe interne de l'organisation).
        </li>
        <li>
          <strong>Données techniques</strong> : journaux d'accès et d'erreurs (adresse IP,
          date, action), nécessaires à la sécurité et au bon fonctionnement.
        </li>
        <li>
          <strong>Cookies / stockage local</strong> : un identifiant de session
          d'authentification et quelques préférences d'affichage (vue, filtres). Aucun cookie
          publicitaire ni traceur tiers.
        </li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>
          <strong>Fournir le Service</strong> (authentification, affichage et sauvegarde des
          contenus, circuit de validation) : exécution du contrat / des CGU.
        </li>
        <li>
          <strong>Notifications in-app et e-mails transactionnels</strong> (post à valider,
          commentaire, échéance, lien d'accès) : exécution du contrat et intérêt légitime à
          faire fonctionner le circuit de validation.
        </li>
        <li>
          <strong>Support et communication</strong> avec les utilisateurs : intérêt légitime.
        </li>
        <li>
          <strong>Sécurité, prévention des abus, amélioration du Service</strong> : intérêt
          légitime.
        </li>
      </ul>
      <p>
        Aucune donnée n'est utilisée à des fins de prospection commerciale de tiers ni de
        profilage publicitaire.
      </p>

      <h2>4. Destinataires et sous-traitants</h2>
      <p>
        Les données sont accessibles aux membres autorisés de votre organisation (selon leur
        rôle) et au personnel de l'Éditeur strictement pour l'exploitation et le support. Les
        sous-traitants techniques sont :
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — base de données, authentification, stockage de fichiers.
          Données hébergées dans l'Union européenne (région{' '}
          <strong>[À COMPLÉTER : région, ex. Irlande / eu-west-1]</strong>), infrastructure
          Amazon Web Services.
        </li>
        <li>
          <strong>Vercel</strong> — hébergement et distribution de l'application web.
        </li>
        <li>
          <strong>Resend</strong> — envoi des e-mails transactionnels (adresse e-mail du
          destinataire et contenu de la notification).
        </li>
      </ul>
      <p>
        Certains de ces prestataires sont susceptibles d'être établis hors de l'Union
        européenne. Les transferts éventuels sont encadrés par les clauses contractuelles
        types de la Commission européenne et des mesures de sécurité complémentaires.
      </p>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li>
          <strong>Compte et contenus</strong> : conservés tant que l'organisation utilise le
          Service, puis supprimés ou anonymisés dans un délai de{' '}
          <strong>[À COMPLÉTER : ex. 30 jours]</strong> après la fermeture de l'organisation
          ou la demande de suppression.
        </li>
        <li>
          <strong>Corbeille</strong> : les posts et clients supprimés sont purgés
          automatiquement après 60 jours.
        </li>
        <li>
          <strong>Journaux techniques</strong> : conservés{' '}
          <strong>[À COMPLÉTER : ex. 12 mois]</strong> à des fins de sécurité.
        </li>
        <li>
          <strong>Échanges avec le support</strong> :{' '}
          <strong>[À COMPLÉTER : ex. 3 ans]</strong> après le dernier contact.
        </li>
      </ul>

      <h2>6. Vos droits</h2>
      <p>
        Vous disposez des droits d'accès, de rectification, d'effacement, de limitation,
        d'opposition et de portabilité sur vos données personnelles. Certains droits peuvent
        s'exercer directement dans le Service (modification du profil, du mot de passe,
        suppression de contenus).
      </p>
      <p>
        Pour les autres demandes, écrivez à{' '}
        <a href="mailto:[À COMPLÉTER : email]">[À COMPLÉTER : email]</a>. Si vos données ont
        été fournies par votre organisation (vous êtes un contact client), adressez-vous
        d'abord à celle-ci, responsable de traitement.
      </p>
      <p>
        Vous pouvez introduire une réclamation auprès de la <strong>CNIL</strong> (
        <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
          www.cnil.fr
        </a>
        ).
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Les échanges sont chiffrés en transit (HTTPS). L'isolation entre organisations est
        assurée au niveau de la base de données par des règles de sécurité (Row Level
        Security). Les mots de passe sont hachés par le fournisseur d'authentification. Les
        codes de connexion saisis dans les fiches clients sont réservés à l'équipe interne de
        l'organisation et ne sont jamais exposés aux contacts clients.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Le Service n'utilise que des cookies et du stockage local strictement nécessaires :
        maintien de la session connectée et mémorisation de préférences d'affichage. Aucun
        consentement préalable n'est requis pour ces éléments ; aucun traceur tiers n'est
        déposé.
      </p>

      <h2>9. Modifications</h2>
      <p>
        Cette politique peut être mise à jour. En cas de modification substantielle, les
        utilisateurs sont informés par e-mail ou via le Service.
      </p>

      <h2>10. Contact</h2>
      <p>
        Pour toute question relative à la protection de vos données :{' '}
        <a href="mailto:[À COMPLÉTER : email]">[À COMPLÉTER : email]</a>.
      </p>
    </LegalLayout>
  );
}
