import { getSupabase } from '@/lib/supabase';

/** Journal des tâches planifiées (Story 8.4). `job_runs` : lecture Admin (RLS 0013). */

export interface JobRun {
  id: number;
  jobName: string;
  startedAt: string;
  finishedAt: string | null;
  ok: boolean | null;
  stats: Record<string, number>;
  error: string | null;
}

export async function listJobRuns(limit = 40): Promise<JobRun[]> {
  const { data, error } = await getSupabase()
    .from('job_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    jobName: r.job_name,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    ok: r.ok,
    stats: (r.stats as Record<string, number>) ?? {},
    error: r.error,
  }));
}

/** Lance la purge de la corbeille maintenant (Admin). */
export async function runPurgeTrash(): Promise<Record<string, number>> {
  const { data, error } = await getSupabase().rpc('trigger_purge_trash');
  if (error) throw error;
  return ((data as { stats?: Record<string, number> } | null)?.stats ?? {});
}
