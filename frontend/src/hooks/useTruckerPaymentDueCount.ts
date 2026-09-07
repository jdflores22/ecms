import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { fetchCachedPaymentDueCount } from '../utils/countApiCache'
import { scheduleNonCritical } from '../utils/deferWork'

const POLL_MS = 60_000

export function useTruckerPaymentDueCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
) {
  const [count, setCount] = useState(0)

  const enabled = Boolean(
    role && role === 'Trucker' && canAccessPage(role, 'truckerPayments', allowedPages),
  )

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    fetchCachedPaymentDueCount()
      .then((count) => setCount(count))
      .catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return undefined
    }
    const cancelDeferred = scheduleNonCritical(load)
    const interval = setInterval(load, POLL_MS)
    return () => {
      cancelDeferred()
      clearInterval(interval)
    }
  }, [load, enabled])

  return count
}
