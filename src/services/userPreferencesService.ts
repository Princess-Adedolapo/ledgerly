import { supabase, type UserPreferences } from '../lib/supabase';

export async function getUserPreferences(): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as UserPreferences | null;
}

export async function ensureUserPreferences(): Promise<UserPreferences> {
  const existing = await getUserPreferences();
  if (existing) return existing;

  const { data, error } = await supabase
    .from('user_preferences')
    .insert({})
    .select('*')
    .single();
  if (error) throw error;
  return data as UserPreferences;
}

async function getOrCreatePreferences(): Promise<UserPreferences> {
  const existing = await getUserPreferences();
  if (existing) return existing;
  return ensureUserPreferences();
}

export async function updateUserPreferences(
  patch: Partial<Pick<UserPreferences, 'display_name' | 'currency_code' | 'currency_display_mode' | 'historical_currency_mode' | 'theme'>>
): Promise<UserPreferences> {
  const existing = await getOrCreatePreferences();

  const { data, error } = await supabase
    .from('user_preferences')
    .update(patch)
    .eq('id', existing.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as UserPreferences;
}

export function subscribeToUserPreferences(callback: () => void) {
  return supabase
    .channel('user_preferences_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences' }, callback)
    .subscribe();
}
