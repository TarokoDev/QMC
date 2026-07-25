import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — see frontend/.env.example')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Reads the access token straight from the Supabase client rather than a cached
 * variable. `getSession()` serves an in-memory session without a network call and
 * only goes remote when the JWT actually needs refreshing, so this is cheap.
 *
 * It used to be a module-level string assigned by an `onAuthStateChange` listener.
 * That listener fires asynchronously after Supabase rehydrates (and possibly
 * refreshes) the stored session, so any request issued during that window — most
 * often the folder/category preload on app mount — went out with no Authorization
 * header at all and came back 401. Awaiting the session removes the race entirely.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
