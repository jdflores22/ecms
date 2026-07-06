import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { withdrawalApi } from '../services/api'
import { scheduleNonCritical } from '../utils/deferWork'

export function useEvaluatorAwaitingCyCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
) {
  const [count, setCount] = useState(0)

  const enabled = Boolean(
    role && role === 'ShippingLineEvaluator' && canAccessPage(role, 'evaluatorAtw', allowedPages),
  )

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    withdrawalApi
      .awaitingCyCount()
      .then(({ data }) => setCount(data.count))
      .catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return undefined
    }
    const cancelDeferred = scheduleNonCritical(load)
    const interval = setInterval(load, 30_000)
    return () => {
      cancelDeferred()
      clearInterval(interval)
    }
  }, [load, enabled])

  return count
}
