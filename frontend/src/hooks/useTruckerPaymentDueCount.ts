import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { paymentApi, scheduleApi } from '../services/api'
import { resolvePaymentStatus } from '../utils/truckerPayment'

export function useTruckerPaymentDueCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
  refreshKey?: string,
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
    Promise.all([scheduleApi.list(), paymentApi.mine()])
      .then(([schedulesRes, paymentsRes]) => {
        const payments = paymentsRes.data
        const paymentFor = (scheduleId: number) =>
          payments.find((p) => p.scheduleId === scheduleId) ?? null

        const due = schedulesRes.data
          .filter((s) => s.status === 'Scheduled' || s.status === 'Confirmed')
          .filter((s) => resolvePaymentStatus(s, paymentFor(s.id)) === 'Pending').length

        setCount(due)
      })
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
