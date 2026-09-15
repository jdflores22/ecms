import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { COUNT_POLL_MS, fetchCachedAdminPendingPaymentCount } from '../utils/countApiCache'
import { scheduleNonCritical } from '../utils/deferWork'
import { setupActivePolling } from '../utils/polling'

export function useAdminPendingPaymentCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
) {
  const [count, setCount] = useState(0)

  const enabled = Boolean(
    role && role === 'Administrator' && canAccessPage(role, 'adminPayments', allowedPages),
  )

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    fetchCachedAdminPendingPaymentCount()
      .then((count) => setCount(count))
      .catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return undefined
    }
    const cancelDeferred = scheduleNonCritical(load)
    const stopPolling = setupActivePolling(load, COUNT_POLL_MS)
    return () => {
      cancelDeferred()
      stopPolling()
    }
  }, [load, enabled])

  return count
}
