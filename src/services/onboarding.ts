import { getSupabase } from '@/lib/supabase';
import { toOnboardingItem, type OnboardingItem } from '@/shared/types';

export async function listOnboardingItems(clientId: string): Promise<OnboardingItem[]> {
  const { data, error } = await getSupabase()
    .from('onboarding_items')
    .select('*')
    .eq('client_id', clientId)
    .order('position');
  if (error) throw error;
  return data.map(toOnboardingItem);
}

export async function setOnboardingItemDone(id: string, isDone: boolean): Promise<void> {
  const { data: userRes } = await getSupabase().auth.getUser();
  const { error } = await getSupabase()
    .from('onboarding_items')
    .update({
      is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
      done_by: isDone ? (userRes.user?.id ?? null) : null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function addOnboardingItem(
  clientId: string,
  label: string,
  position: number,
): Promise<OnboardingItem> {
  const { data, error } = await getSupabase()
    .from('onboarding_items')
    .insert({ client_id: clientId, label: label.trim(), position })
    .select('*')
    .single();
  if (error) throw error;
  return toOnboardingItem(data);
}

export async function removeOnboardingItem(id: string): Promise<void> {
  const { error } = await getSupabase().from('onboarding_items').delete().eq('id', id);
  if (error) throw error;
}

/** Réécrit les positions selon l'ordre fourni (liste d'ids). */
export async function reorderOnboardingItems(orderedIds: string[]): Promise<void> {
  const supabase = getSupabase();
  await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from('onboarding_items').update({ position }).eq('id', id),
    ),
  );
}
