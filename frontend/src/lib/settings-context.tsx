import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, type CurrentUser } from '@/lib/user-service'
import { getSettings, type Settings } from '@/lib/settings-service'

interface SettingsValue {
  settings: Settings | null
  currentUser: CurrentUser | null
  loading: boolean
}

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [loadedSettings, loadedUser] = await Promise.all([getSettings(), getCurrentUser()])
      if (cancelled) return
      setSettings(loadedSettings)
      setCurrentUser(loadedUser)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, currentUser, loading }}>{children}</SettingsContext.Provider>
  )
}

function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings/useCurrentUser must be used within a SettingsProvider')
  return ctx
}

/** Throws while loading — only call from within a subtree gated on `!loading`. */
export function useSettings(): Settings {
  const { settings, loading } = useSettingsContext()
  if (loading || !settings) throw new Error('useSettings called before settings finished loading')
  return settings
}

/** Throws while loading — only call from within a subtree gated on `!loading`. */
export function useCurrentUser(): CurrentUser {
  const { currentUser, loading } = useSettingsContext()
  if (loading || !currentUser) throw new Error('useCurrentUser called before settings finished loading')
  return currentUser
}

export function useSettingsLoading(): boolean {
  return useSettingsContext().loading
}
