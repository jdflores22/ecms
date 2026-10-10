import axios from 'axios'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { portalApi, type PortalSettings } from '../services/api'
import { useAppSelector } from '../store/hooks'

const defaultSettings: PortalSettings = {
  icsCroEdoQrEnabled: true,
  soaEnabled: true,
  withdrawalsEnabled: true,
  updatedAt: '',
}

type PortalSettingsContextValue = {
  settings: PortalSettings
  loading: boolean
  /** False until portal settings are fetched (or user is logged out). */
  ready: boolean
  refresh: () => Promise<void>
}

const PortalSettingsContext = createContext<PortalSettingsContextValue>({
  settings: defaultSettings,
  loading: true,
  ready: false,
  refresh: async () => {},
})

export function PortalSettingsProvider({ children }: { children: ReactNode }) {
  const token = useAppSelector((s) => s.auth.accessToken)
  const [settings, setSettings] = useState<PortalSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!token) {
      setSettings(defaultSettings)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await portalApi.getSettings()
      setSettings(data)
    } catch (err) {
      if (!axios.isAxiosError(err) || err.response?.status !== 401) {
        setSettings(defaultSettings)
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  const ready = !token || !loading

  const value = useMemo(() => ({ settings, loading, ready, refresh }), [settings, loading, ready, refresh])

  return <PortalSettingsContext.Provider value={value}>{children}</PortalSettingsContext.Provider>
}

export function usePortalSettings() {
  return useContext(PortalSettingsContext)
}
