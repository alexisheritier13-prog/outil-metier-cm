import { getSupabase } from '@/lib/supabase';
import type { Json } from '@/shared/types/database';
import {
  EMPTY_GUIDELINE,
  toEditorialGuideline,
  type EditorialGuideline,
} from '@/shared/types';

/** Charte du client, ou une charte vide si elle n'a jamais été renseignée. */
export async function getEditorialGuideline(clientId: string): Promise<EditorialGuideline> {
  const { data, error } = await getSupabase()
    .from('editorial_guidelines')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data ? toEditorialGuideline(data) : EMPTY_GUIDELINE(clientId);
}

export type EditorialGuidelineInput = Pick<
  EditorialGuideline,
  | 'tone'
  | 'wordsToAvoid'
  | 'wordsToPrefer'
  | 'goodExamples'
  | 'visualGuidelines'
  | 'brandColors'
  | 'typography'
>;

export async function saveEditorialGuideline(
  clientId: string,
  input: EditorialGuidelineInput,
): Promise<EditorialGuideline> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('editorial_guidelines')
    .upsert(
      {
        client_id: clientId,
        tone: input.tone,
        words_to_avoid: input.wordsToAvoid,
        words_to_prefer: input.wordsToPrefer,
        good_examples: input.goodExamples,
        visual_guidelines: input.visualGuidelines,
        brand_colors: input.brandColors
          .filter((c) => c.hex.trim() || c.label.trim())
          .map((c) => ({ hex: c.hex, label: c.label })) as Json,
        typography: input.typography,
        updated_by: userRes.user?.id ?? null,
      },
      { onConflict: 'client_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return toEditorialGuideline(data);
}
