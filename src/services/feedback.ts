import { getSupabase } from '@/lib/supabase';

export type FeedbackKind = 'bug' | 'idea' | 'other';
export type FeedbackStatus = 'new' | 'seen' | 'done';

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: 'Bug / ça marche pas',
  idea: 'Idée / amélioration',
  other: 'Autre',
};

/** Envoie un retour. `path` = où était la personne (auto). */
export async function submitFeedback(
  kind: FeedbackKind,
  message: string,
  path: string,
): Promise<void> {
  const { error } = await getSupabase().rpc('submit_feedback', {
    p_kind: kind,
    p_message: message,
    p_path: path,
  });
  if (error) throw error;
}

export interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  message: string;
  path: string;
  status: FeedbackStatus;
  adminNote: string;
  authorEmail: string;
  orgName: string | null;
  createdAt: string;
}

export async function listFeedback(): Promise<FeedbackItem[]> {
  const { data, error } = await getSupabase().rpc('platform_list_feedback');
  if (error) throw error;
  return ((data as FeedbackItem[] | null) ?? []).map((f) => ({
    id: f.id,
    kind: f.kind,
    message: f.message,
    path: f.path,
    status: f.status,
    adminNote: f.adminNote ?? '',
    authorEmail: f.authorEmail ?? '',
    orgName: f.orgName ?? null,
    createdAt: f.createdAt,
  }));
}

export async function setFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  const { error } = await getSupabase().rpc('set_feedback_status', {
    p_id: id,
    p_status: status,
  });
  if (error) throw error;
}
