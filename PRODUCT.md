# Product

## Register

product

## Users

- **Community Manager** — persona principal, usage quotidien intensif. Jongle entre 5–15
  clients, produit 15–30 posts/mois/client. Travaille sur grand écran plusieurs heures
  d'affilée. Veut voir la charge d'un coup d'œil, créer un post en moins de 30 s, ne rien
  oublier (visuel manquant, deadline, marronnier). Tolère la densité, déteste les clics
  inutiles et les rechargements de page.
- **Lead CM** — supervise 3–5 CM. Vit dans la file « À valider » et la liste clients.
  Repère les clients à risque, valide vite, garde la traçabilité.
- **Admin agence** — usage ponctuel : comptes, seuils d'alertes, journal des jobs.
- **Contact client** — usage épisodique (1–2×/semaine), souvent pressé, parfois sur
  mobile. Ne connaît pas l'outil. Veut voir ce qui est proposé et approuver / demander une
  correction en deux clics.

## Product Purpose

Outil métier de Community Management pour une petite agence : planification multi-clients
de posts réseaux sociaux, workflow de validation interne puis client, organisation du
contenu (idées, templates, marronniers), alertes proactives. Remplace un montage Notion.
Succès = l'agence pilote toute sa production depuis un seul calendrier, sans rien oublier,
et le client valide sans friction. Isolation stricte des données entre clients (RLS) =
exigence n°1.

## Brand Personality

Sobre, professionnel, neutre. L'outil disparaît derrière le travail du CM. Vocabulaire
constant d'un écran à l'autre. L'espace agence est dense et outillé ; l'espace client est
minimal et rassurant — mêmes tokens et composants, densité différente.

## Anti-references

- Le template « hero-metric » (gros chiffre, petit label, stats de soutien, accent
  dégradé) — pas de dashboard de vanité.
- Glassmorphism, dégradés décoratifs, eyebrow tracké au-dessus de chaque section.
- Bordure latérale colorée comme accent d'état (`border-left` épais).
- Réinventer des affordances standard (scrollbars custom, modales exotiques).
- Références positives : Linear, Notion, Height, Stripe Dashboard.

## Design Principles

1. **Calendrier d'abord.** L'accueil interne est le calendrier multi-clients ; détail,
   validation et organisation se font en panneau latéral sans quitter le contexte.
2. **La densité au service de la tâche.** On assume tableaux longs et panneaux riches
   quand le CM en a besoin ; on ne dilue pas « pour aérer ».
3. **Le statut se lit sans effort.** Texte + pictogramme + couleur, jamais la couleur
   seule. Vocabulaire de statut identique partout.
4. **Feedback immédiat.** Toute action a une réponse visible en moins de 250 ms
   (optimiste avec rollback pour le drag & drop et les changements de statut).
5. **Deux produits, un système.** Agence dense, client minimal — tokens, composants et
   vocabulaire partagés.

## Accessibility & Inclusion

WCAG 2.1 AA sur les parcours critiques (connexion, navigation calendrier, édition /
validation d'un post, commentaire, approbation client). Contraste texte de corps ≥ 4.5:1,
grands textes ≥ 3:1, composants ≥ 3:1. Focus visible partout. L'information n'est jamais
portée par la seule couleur. Cibles tactiles ≥ 44×44 px dans l'espace client. Zoom 200 %
sans scroll horizontal du corps. `prefers-reduced-motion` respecté.
