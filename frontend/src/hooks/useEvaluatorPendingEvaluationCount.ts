import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { evaluationApi } from '../services/api'
import { scheduleNonCritical } from '../utils/deferWork'

export function useEvaluatorPendingEvaluationCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
) {
  const [count, setCount] = useState(0)

  const enabled = Boolean(
    role && role === 'ShippingLineEvaluator' && canAccessPage(role, 'evaluations', allowedPages),
  )

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    evaluationApi
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
    const interval = setInterval(load, 30_000)
    return () => {
      cancelDeferred()
      clearInterval(interval)
    }
  }, [load, enabled])

  return count
}
