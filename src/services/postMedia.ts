import { getSupabase } from '@/lib/supabase';
import { toPostMedia, type PostMedia, type PostMediaKind } from '@/shared/types';

/**
 * Médias d'un post (photos / vidéos, carrousel ordonné) — Story « upload média ».
 * Bucket `post-media` public ; la table `post_media` (RLS) contrôle la visibilité
 * des chemins. Chemin : `{client_id}/{post_id}/{uuid}.{ext}`.
 */

const BUCKET = 'post-media';

export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 Mo (aligné sur le bucket)
export const ACCEPTED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

export function mediaKindOf(mime: string): PostMediaKind | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

/** URL publique d'un média (bucket public, chemin non énumérable). */
export function mediaUrl(storagePath: string): string {
  return getSupabase().storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function listPostMedia(postId: string): Promise<PostMedia[]> {
  const { data, error } = await getSupabase()
    .from('post_media')
    .select('*')
    .eq('post_id', postId)
    .order('position');
  if (error) throw error;
  return data.map(toPostMedia);
}

/** Médias de plusieurs posts, regroupés par `postId` (une requête). */
export async function listMediaForPosts(postIds: string[]): Promise<Map<string, PostMedia[]>> {
  const map = new Map<string, PostMedia[]>();
  if (postIds.length === 0) return map;
  const { data, error } = await getSupabase()
    .from('post_media')
    .select('*')
    .in('post_id', postIds)
    .order('position');
  if (error) throw error;
  for (const row of data) {
    const m = toPostMedia(row);
    const bucket = map.get(m.postId);
    if (bucket) bucket.push(m);
    else map.set(m.postId, [m]);
  }
  return map;
}

export interface ProbedFile {
  file: File;
  kind: PostMediaKind;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

/** Lit dimensions (image/vidéo) et durée (vidéo) côté navigateur, sans bloquer. */
export async function probeFile(file: File): Promise<ProbedFile> {
  const kind = mediaKindOf(file.type);
  if (!kind) throw new Error('type_non_supporte');
  const url = URL.createObjectURL(file);
  try {
    if (kind === 'image') {
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('image_illisible'));
        img.src = url;
      }).catch(() => ({ w: 0, h: 0 }));
      return { file, kind, width: dims.w || null, height: dims.h || null, durationSeconds: null };
    }
    const meta = await new Promise<{ w: number; h: number; d: number }>((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () =>
        resolve({ w: v.videoWidth, h: v.videoHeight, d: v.duration || 0 });
      v.onerror = () => resolve({ w: 0, h: 0, d: 0 });
      v.src = url;
    });
    return {
      file,
      kind,
      width: meta.w || null,
      height: meta.h || null,
      durationSeconds: meta.d || null,
    };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}

function extOf(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()! : '';
  if (fromName) return fromName.toLowerCase();
  return file.type.split('/')[1] ?? 'bin';
}

/**
 * Upload un fichier dans le bucket puis crée la ligne `post_media`. `position`
 * est fourni par l'appelant (fin de liste en général).
 */
export async function uploadPostMedia(
  clientId: string,
  postId: string,
  probed: ProbedFile,
  position: number,
): Promise<PostMedia> {
  const path = `${clientId}/${postId}/${crypto.randomUUID()}.${extOf(probed.file)}`;
  const up = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, probed.file, { contentType: probed.file.type, upsert: false });
  if (up.error) throw up.error;

  const { data, error } = await getSupabase()
    .from('post_media')
    .insert({
      post_id: postId,
      storage_path: path,
      kind: probed.kind,
      mime_type: probed.file.type,
      size_bytes: probed.file.size,
      width: probed.width,
      height: probed.height,
      duration_seconds: probed.durationSeconds,
      position,
    })
    .select('*')
    .single();
  if (error) {
    // Rollback best-effort de l'objet uploadé.
    await getSupabase().storage.from(BUCKET).remove([path]);
    throw error;
  }
  return toPostMedia(data);
}

/** Retire l'objet du bucket (Storage API) puis supprime la ligne. */
export async function deletePostMedia(id: string): Promise<void> {
  const sb = getSupabase();
  const { data: row } = await sb.from('post_media').select('storage_path').eq('id', id).maybeSingle();
  if (row?.storage_path) {
    await sb.storage.from(BUCKET).remove([row.storage_path]);
  }
  const { error } = await sb.from('post_media').delete().eq('id', id);
  if (error) throw error;
}

/** Réordonne le carrousel (RPC atomique). */
export async function reorderPostMedia(postId: string, orderedIds: string[]): Promise<void> {
  const { error } = await getSupabase().rpc('post_media_reorder', {
    p_post_id: postId,
    p_ids: orderedIds,
  });
  if (error) throw error;
}
