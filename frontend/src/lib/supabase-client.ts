import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — see frontend/.env.example')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Kept in memory (not re-fetched per request) so api-client.ts can attach it
// synchronously to every request without an extra async round-trip.
let accessToken: string | null = null

supabase.auth.onAuthStateChange((_event, session) => {
  accessToken = session?.access_token ?? null
})

export function getAccessToken(): string | null {
  return accessToken
}
