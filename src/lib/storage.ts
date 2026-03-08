import { supabase } from './supabase'

export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from('birthdayboard').getPublicUrl(path)
  return data.publicUrl
}
