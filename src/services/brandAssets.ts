import { getSupabase } from '@/lib/supabase';

/**
 * Upload des images de marque (logos clients, logo d'agence, photos de profil)
 * dans le bucket public `brand-assets`. Renvoie l'URL publique — les colonnes
 * `clients.logo_url` / `profiles.avatar_url` / `account.agency_logo_url`
 * continuent de stocker une URL.
 */

const BUCKET = 'brand-assets';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo (aligné sur le bucket)
export const ACCEPTED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];
export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_MIME.join(',');

/** Erreur porteuse d'un message déjà lisible pour l'utilisateur. */
export class ImageUploadError extends Error {}

function extOf(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()! : '';
  if (fromName) return fromName.toLowerCase();
  return (file.type.split('/')[1] ?? 'bin').replace('+xml', '');
}

export function validateImage(file: File): void {
  if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
    throw new ImageUploadError('Format non pris en charge (JPG, PNG, WebP, GIF ou SVG).');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError('Image trop lourde (5 Mo maximum).');
  }
}

/**
 * @param folder  `clients` | `orgs` | `avatars` — sert seulement au rangement.
 * @returns URL publique de l'objet.
 */
export async function uploadBrandImage(
  file: File,
  folder: 'clients' | 'orgs' | 'avatars',
): Promise<string> {
  validateImage(file);
  const path = `${folder}/${crypto.randomUUID()}.${extOf(file)}`;
  const sb = getSupabase();
  const up = await sb.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new ImageUploadError("L'envoi a échoué. Réessayez.");
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
