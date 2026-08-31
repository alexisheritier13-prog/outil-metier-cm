import { getSupabase } from '@/lib/supabase';
import { toPostTemplate, type PostTemplate } from '@/shared/types';
import type { Network } from '@/shared/constants/networks';

/**
 * Templates de posts (Story 7.2). `clientId = null` → global (visible de tous les
 * internes) ; sinon rattaché à un client. Suppression définitive (FR44).
 */

export async function listPostTemplates(): Promise<PostTemplate[]> {
  const { data, error } = await getSupabase()
    .from('post_templates')
    .select('*')
    .order('name');
  if (error) throw error;
  return data.map(toPostTemplate);
}

/** Templates applicables à un client : les globaux + ceux du client. */
export async function listApplicableTemplates(clientId: string): Promise<PostTemplate[]> {
  const all = await listPostTemplates();
  return all.filter((t) => t.clientId === null || t.clientId === clientId);
}

export interface PostTemplateInput {
  name: string;
  description: string;
  network: Network | null;
  captionTemplate: string;
  defaultTags: string[];
  clientId: string | null;
}

export async function createPostTemplate(input: PostTemplateInput): Promise<PostTemplate> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('post_templates')
    .insert({
      name: input.name.trim(),
      description: input.description.trim(),
      network: input.network,
      caption_template: input.captionTemplate,
      default_tags: input.defaultTags,
      client_id: input.clientId,
      created_by: userRes.user?.id ?? '',
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPostTemplate(data);
}

export async function updatePostTemplate(
  id: string,
  input: PostTemplateInput,
): Promise<PostTemplate> {
  const { data, error } = await getSupabase()
    .from('post_templates')
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      network: input.network,
      caption_template: input.captionTemplate,
      default_tags: input.defaultTags,
      client_id: input.clientId,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toPostTemplate(data);
}

export async function deletePostTemplate(id: string): Promise<void> {
  const { error } = await getSupabase().from('post_templates').delete().eq('id', id);
  if (error) throw error;
}
