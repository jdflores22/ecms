import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { paymentApi } from '../services/api'
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
    paymentApi
      .pendingCount()
      .then(({ data }) => setCount(data.count))
      .catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return undefined
    }
    const cancelDeferred = scheduleNonCritical(load)
    const stopPolling = setupActivePolling(load, 30_000)
    return () => {
      cancelDeferred()
      stopPolling()
    }
  }, [load, enabled])

  return count
}
