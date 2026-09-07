import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { fetchCachedWithdrawalActionCount } from '../utils/countApiCache'
import { scheduleNonCritical } from '../utils/deferWork'

const POLL_MS = 60_000

export function useTruckerPendingWithdrawalCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
) {
  const [count, setCount] = useState(0)

  const enabled = Boolean(
    role
      && (role === 'Trucker' || role === 'Broker')
      && canAccessPage(role, 'truckerWithdrawals', allowedPages),
  )

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    fetchCachedWithdrawalActionCount()
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
