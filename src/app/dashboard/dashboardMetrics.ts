import { getSupabase } from '@/lib/supabase';
import { listPosts } from '@/services/posts';
import { POST_STATUS_ORDER, type PostStatus } from '@/shared/constants/postStatus';
import type { Alert, AlertSeverity } from '@/shared/types';

/**
 * Étape du post dans le circuit à 5 temps (brouillon → validation interne →
 * validation client → validé → planifié). « Publié » est au-delà du circuit,
 * plafonné à l'étape 5 lui aussi.
 */
export function postStep(status: PostStatus): number {
  return Math.min(POST_STATUS_ORDER[status] + 1, 5);
}

/** Couleur de la barre de progression, par étape — même teinte que le badge de statut. */
export const STEP_BAR_COLOR: Record<PostStatus, string> = {
  draft: 'var(--border-strong)',
  internal_review: 'var(--info)',
  client_review: 'var(--warning)',
  approved: 'var(--success)',
  scheduled: 'var(--primary)',
  published: 'var(--primary)',
};

const SEV_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * La ou les alertes à mettre en avant dans le bandeau « Priorité du jour ».
 * Deux alertes de même type peuvent produire le même message (ex. deux posts
 * distincts, même modèle de phrase) : on ne garde qu'un message par texte pour
 * ne jamais répéter la même phrase deux fois dans le bandeau.
 */
export function pickPriorityAlerts(alerts: Alert[], max = 2): Alert[] {
  const sorted = [...alerts].sort(
    (a, b) =>
      SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const seen = new Set<string>();
  const out: Alert[] = [];
  for (const a of sorted) {
    if (seen.has(a.message)) continue;
    seen.add(a.message);
    out.push(a);
    if (out.length >= max) break;
  }
  return out;
}

export interface MonthlyPostCount {
  month: number; // 0-11
  scheduled: number;
  published: number;
}

/** Volume de posts par mois (planifiés vs publiés), sur l'année donnée. */
export async function fetchMonthlyPostCounts(year: number): Promise<MonthlyPostCount[]> {
  const from = new Date(Date.UTC(year, 0, 1)).toISOString();
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
  const posts = await listPosts({ from, to, statuses: ['scheduled', 'published'] });

  const counts: MonthlyPostCount[] = Array.from({ length: 12 }, (_, month) => ({
    month,
    scheduled: 0,
    published: 0,
  }));
  for (const p of posts) {
    const month = new Date(p.scheduledAt).getUTCMonth();
    const bucket = counts[month];
    if (!bucket) continue;
    if (p.status === 'scheduled') bucket.scheduled += 1;
    else if (p.status === 'published') bucket.published += 1;
  }
  return counts;
}

export interface FirstTimeApprovalRate {
  rate: number; // 0-100
  total: number;
}

/**
 * Part des posts créés dans les 30 derniers jours, aujourd'hui validés (validé,
 * planifié ou publié), qui n'ont JAMAIS été renvoyés par le client (aucune
 * transition « à valider client → brouillon/validation interne » dans leur
 * historique). `null` s'il n'y a aucun post éligible (rien à mesurer).
 */
export async function fetchFirstTimeApprovalRate(): Promise<FirstTimeApprovalRate | null> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: posts, error } = await getSupabase()
    .from('posts')
    .select('id, created_at')
    .in('status', ['approved', 'scheduled', 'published'])
    .is('deleted_at', null)
    .gte('created_at', since);
  if (error) throw error;
  const ids = (posts ?? []).map((p) => p.id as string);
  if (ids.length === 0) return null;

  const { data: rejections, error: rErr } = await getSupabase()
    .from('post_history')
    .select('post_id')
    .in('post_id', ids)
    .eq('action', 'status_change')
    .eq('old_value', 'client_review')
    .in('new_value', ['draft', 'internal_review']);
  if (rErr) throw rErr;

  const rejected = new Set((rejections ?? []).map((r) => r.post_id as string));
  const firstTime = ids.filter((id) => !rejected.has(id)).length;
  return { rate: Math.round((firstTime / ids.length) * 100), total: ids.length };
}
