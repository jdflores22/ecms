import { canAccessPage, type AppPageKey } from '../config/routeAccess'
import { usePortalSettings } from '../context/PortalSettingsContext'

/** RBAC + portal feature flags; waits for portal settings before allowing gated modules. */
export function usePortalPageAccess(
  role: string | undefined,
  pageKey: AppPageKey,
  allowedPages?: string[] | null,
): boolean {
  const { settings: portal, ready: portalReady } = usePortalSettings()
  if (!portalReady || !role) return false
  return canAccessPage(role, pageKey, allowedPages, portal)
}
