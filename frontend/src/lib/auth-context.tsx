import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'

interface AuthValue {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  changePassword: (newPassword: string) => Promise<{ error: string | null }>
  updateProfile: (profile: { displayName: string; phoneNumber: string }) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }

  // Stored in user_metadata (not the reserved top-level `phone` field, which
  // would trigger Supabase's phone-auth OTP verification flow instead).
  async function updateProfile({ displayName, phoneNumber }: { displayName: string; phoneNumber: string }) {
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName, phone_number: phoneNumber },
    })
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut, changePassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export interface CurrentUser {
  name: string
  initials: string
  email: string
  phoneNumber: string
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

/** Derived from the Supabase session — no backend user profile involved. */
export function useCurrentUser(): CurrentUser {
  const { session } = useAuth()
  if (!session) throw new Error('useCurrentUser called without a session')

  const email = session.user.email ?? ''
  const name = (session.user.user_metadata?.display_name as string | undefined) ?? email
  const phoneNumber = (session.user.user_metadata?.phone_number as string | undefined) ?? ''
  return { name, initials: initialsFor(name), email, phoneNumber }
}
