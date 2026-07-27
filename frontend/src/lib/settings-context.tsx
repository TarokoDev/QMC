import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CompanyInfo } from '@/lib/mock-data'
import { getSettings, type Settings } from '@/lib/settings-service'

interface SettingsValue {
  settings: Settings | null
  loading: boolean
  setCompany: (company: CompanyInfo) => void
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

  // Settings are fetched once for the whole app, so a company edit has to be
  // written back into the context or the preview and print document keep
  // rendering the pre-upload logo until a full reload.
  const setCompany = useCallback((company: CompanyInfo) => {
    setSettings((current) => (current ? { ...current, company } : current))
  }, [])

  return <SettingsContext.Provider value={{ settings, loading, setCompany }}>{children}</SettingsContext.Provider>
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

/** Applies a company block returned by a settings write, app-wide. */
export function useSetCompany(): (company: CompanyInfo) => void {
  return useSettingsContext().setCompany
}

export function useSettingsLoading(): boolean {
  return useSettingsContext().loading
}
