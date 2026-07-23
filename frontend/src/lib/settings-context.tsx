import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettings, type Settings } from '@/lib/settings-service'

interface SettingsValue {
  settings: Settings | null
  loading: boolean
}

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const loadedSettings = await getSettings()
      if (cancelled) return
      setSettings(loadedSettings)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return <SettingsContext.Provider value={{ settings, loading }}>{children}</SettingsContext.Provider>
}

function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}

/** Throws while loading — only call from within a subtree gated on `!loading`. */
export function useSettings(): Settings {
  const { settings, loading } = useSettingsContext()
  if (loading || !settings) throw new Error('useSettings called before settings finished loading')
  return settings
}

export function useSettingsLoading(): boolean {
  return useSettingsContext().loading
}
