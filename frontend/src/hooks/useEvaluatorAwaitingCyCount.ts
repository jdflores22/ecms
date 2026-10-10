import { useCallback, useEffect, useState } from 'react'
import { usePortalPageAccess } from './usePortalPageAccess'
import { COUNT_POLL_MS, fetchCachedAwaitingCyCount } from '../utils/countApiCache'
import { scheduleNonCritical } from '../utils/deferWork'

export function useEvaluatorAwaitingCyCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
) {
  const [count, setCount] = useState(0)
  const withdrawalsAllowed = usePortalPageAccess(role, 'evaluatorAtw', allowedPages)

  const enabled = Boolean(role && role === 'ShippingLineEvaluator' && withdrawalsAllowed)

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    fetchCachedAwaitingCyCount()
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
