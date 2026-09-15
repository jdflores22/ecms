import { dashboardApi } from '../services/api'
import { createCachedFetcher } from './listApiCache'

const DASHBOARD_TTL_MS = 60_000

const dashboardCaches = new Map<string, ReturnType<typeof createCachedFetcher<unknown>>>()

export function fetchCachedDashboard(role: string, force = false): Promise<unknown> {
  let cache = dashboardCaches.get(role)
  if (!cache) {
    cache = createCachedFetcher(() => dashboardApi.get(role).then(({ data }) => data), DASHBOARD_TTL_MS)
    dashboardCaches.set(role, cache)
  }
  return cache.fetch(force)
}

export function clearDashboardCache(role?: string) {
  if (role) {
    dashboardCaches.get(role)?.clear()
    return
  }
  dashboardCaches.forEach((cache) => cache.clear())
}
