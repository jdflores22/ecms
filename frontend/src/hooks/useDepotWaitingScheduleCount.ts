import { useCallback, useEffect, useState } from 'react'
import { canAccessPage } from '../config/routeAccess'
import { scheduleApi } from '../services/api'

export function useDepotWaitingScheduleCount(
  role: string | undefined,
  allowedPages: string[] | null | undefined,
  refreshKey?: string,
) {
  const [count, setCount] = useState(0)

  const enabled = Boolean(
    role && role === 'DepotPersonnel' && canAccessPage(role, 'depotSchedules', allowedPages),
  )

  const load = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    scheduleApi
      .list()
      .then(({ data }) => {
        setCount(data.filter((s) => s.status === 'WaitingSchedule').length)
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
