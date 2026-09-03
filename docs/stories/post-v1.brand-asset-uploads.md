# Post-v1 — Upload des logos et photos (fini les champs URL)

**Statut :** livré (migration 0047). Appliquée staging + prod (schema_version 47).

## Contexte

Les logos clients, le logo d'agence et les photos de profil se saisissaient en
**collant une URL** (`https://…`). Peu pratique et fragile (lien qui casse,
hotlink). Demande : **upload de fichier** partout.

## Ce qui a été fait

### Migration 0047 — bucket `brand-assets`

Bucket Storage **public**, 5 Mo, types image uniquement
(`jpeg/png/webp/gif/svg+xml`). Policies sur `storage.objects` :
- lecture publique ;
- écriture (`insert`) : tout compte authentifié — un logo / avatar n'est pas une
  donnée sensible, l'isolation multi-tenant ne s'y applique pas ;
- `update` / `delete` : uniquement `owner = auth.uid()`.

Chemins : `clients/<uuid>.<ext>`, `orgs/<uuid>.<ext>`, `avatars/<uuid>.<ext>`
(le 1er segment ne sert qu'au rangement).

**Aucun changement de schéma** sur les colonnes qui référencent ces images :
`clients.logo_url`, `profiles.avatar_url`, `account.agency_logo_url` continuent
de stocker **une URL** — désormais l'URL publique de l'objet uploadé.

### Front

- `src/services/brandAssets.ts` — `uploadBrandImage(file, folder)` (valide type +
  taille, upload, renvoie l'URL publique), `validateImage`, `ImageUploadError`.
- `src/components/ImageUploadField.tsx` — champ réutilisable : vignette de
  prévisualisation (`square` logo / `circle` avatar), bouton *Ajouter une image* /
  *Remplacer*, bouton *Retirer*, état de chargement, message d'erreur. **Pas de
  champ URL.**
- Câblé : `ClientForm` (logo client), `AccountSettingsPage` + `OnboardingWizard`
  (logo d'agence), `MyAccountPage` (photo de profil).

### Limites connues

- Pas de suppression de l'ancien objet au remplacement → orphelins possibles dans
  le bucket (négligeable, même comportement que `post-media`).
- Pas de recadrage / redimensionnement côté client (5 Mo suffisent largement pour
  un logo).

## Tests

`src/services/__tests__/brandAssets.test.ts` — `validateImage` (type, taille).
Upload réel vérifié au navigateur (staging, réponse 200).
