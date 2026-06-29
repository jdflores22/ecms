import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { withdrawalApi } from '../services/api'

export function useDepotPendingWithdrawalCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
  refreshKey?: string,
) {
  const [count, setCount] = useState(0)

  const enabled = Boolean(
    role && role === 'DepotPersonnel' && canAccessPage(role, 'depotWithdrawals', allowedPages),
  )

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    withdrawalApi
      .pendingReviewCount()
      .then(({ data }) => setCount(data.count))
      .catch(() => {})
  }, [enabled])

  useEffect(() => {
    load()
    if (!enabled) return undefined
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load, enabled, refreshKey])

  return count
}
