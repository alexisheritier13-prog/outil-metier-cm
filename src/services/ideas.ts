import { getSupabase } from '@/lib/supabase';
import { toIdea, toPost, type Idea, type Post } from '@/shared/types';
import type { Network } from '@/shared/constants/networks';
import { createTag } from '@/services/tags';

/**
 * Banque d'idées (Story 7.1). Suppression définitive (pas de corbeille). La RLS
 * (`ideas_select` / `can_see_idea`) filtre : idée sans client → tout interne actif ;
 * idée avec client → accès client.
 */

export interface IdeaFilters {
  clientId?: string | null;
  tagId?: string;
  q?: string;
}

export async function listIdeas(filters: IdeaFilters = {}): Promise<Idea[]> {
  let q = getSupabase().from('ideas').select('*').order('created_at', { ascending: false });
  if (filters.clientId === null) q = q.is('client_id', null);
  else if (filters.clientId) q = q.eq('client_id', filters.clientId);
  if (filters.q?.trim()) q = q.ilike('title', `%${filters.q.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  let ideas = data.map(toIdea);
  if (filters.tagId) {
    const linked = await getSupabase()
      .from('idea_tags')
      .select('idea_id')
      .eq('tag_id', filters.tagId);
    const ids = new Set((linked.data ?? []).map((r) => r.idea_id));
    ideas = ideas.filter((i) => ids.has(i.id));
  }
  return ideas;
}

export async function getIdeaTagIds(ideaId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('idea_tags')
    .select('tag_id')
    .eq('idea_id', ideaId);
  if (error) throw error;
  return data.map((r) => r.tag_id);
}

export interface IdeaInput {
  title: string;
  description: string;
  clientId: string | null;
  tags?: string[];
}

async function applyIdeaTags(ideaId: string, names: string[] | undefined): Promise<void> {
  if (names === undefined) return;
  const ids = await Promise.all(
    names.filter((n) => n.trim()).map((n) => createTag(n).then((t) => t.id)),
  );
  const supabase = getSupabase();
  await supabase.from('idea_tags').delete().eq('idea_id', ideaId);
  if (ids.length) {
    await supabase
      .from('idea_tags')
      .insert([...new Set(ids)].map((tag_id) => ({ idea_id: ideaId, tag_id })));
  }
}

export async function createIdea(input: IdeaInput): Promise<Idea> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('ideas')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      client_id: input.clientId,
      created_by: userRes.user?.id ?? '',
    })
    .select('*')
    .single();
  if (error) throw error;
  await applyIdeaTags(data.id, input.tags);
  return toIdea(data);
}

export async function updateIdea(id: string, input: IdeaInput): Promise<Idea> {
  const { data, error } = await getSupabase()
    .from('ideas')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      client_id: input.clientId,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  await applyIdeaTags(id, input.tags);
  return toIdea(data);
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await getSupabase().from('ideas').delete().eq('id', id);
  if (error) throw error;
}

/** Transforme une idée en post brouillon (RPC). Un client est requis. */
export async function ideaToPost(
  ideaId: string,
  opts: { clientId?: string; network?: Network } = {},
): Promise<Post> {
  const { data, error } = await getSupabase().rpc('idea_to_post', {
    p_idea_id: ideaId,
    p_client_id: opts.clientId ?? undefined,
    p_network: opts.network ?? undefined,
  });
  if (error) throw new Error(mapError(error));
  return toPost(data as never);
}

function mapError(error: { message?: string }): string {
  const m = error.message ?? '';
  if (/client est requis/i.test(m)) return 'Choisissez un client pour créer le post.';
  if (/accès refusé/i.test(m)) return 'Accès refusé.';
  return 'La transformation a échoué.';
}
