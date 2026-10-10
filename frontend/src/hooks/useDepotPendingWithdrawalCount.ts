import { useCallback, useEffect, useState } from 'react'
import { COUNT_POLL_MS, fetchCachedDepotWithdrawalReviewCount } from '../utils/countApiCache'
import { usePortalPageAccess } from './usePortalPageAccess'
import { scheduleNonCritical } from '../utils/deferWork'

export function useDepotPendingWithdrawalCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
) {
  const [count, setCount] = useState(0)
  const withdrawalsAllowed = usePortalPageAccess(role, 'depotWithdrawals', allowedPages)

  const enabled = Boolean(role && role === 'DepotPersonnel' && withdrawalsAllowed)

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    fetchCachedDepotWithdrawalReviewCount()
      .then((count) => setCount(count))
      .catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return undefined
    }
    const cancelDeferred = scheduleNonCritical(load)
    const interval = setInterval(load, COUNT_POLL_MS)
    return () => {
      cancelDeferred()
      clearInterval(interval)
    }
  }, [load, enabled])

  return count
}
