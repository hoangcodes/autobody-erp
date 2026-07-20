import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Supabase client, or null if env vars aren't configured. The backend runs
 * with DEV_AUTH_BYPASS, so the whole app must work with this being null —
 * every call site guards for it rather than assuming a session exists.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}
