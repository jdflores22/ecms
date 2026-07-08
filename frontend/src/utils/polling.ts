export function setupActivePolling(task: () => void, intervalMs: number) {
  let interval: ReturnType<typeof setInterval> | null = null

  const runIfActive = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    task()
  }

  const start = () => {
    if (interval !== null) return
    interval = setInterval(runIfActive, intervalMs)
  }

  const stop = () => {
    if (interval === null) return
    clearInterval(interval)
    interval = null
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      runIfActive()
      start()
      return
    }
    stop()
  }

  const handleOnline = () => {
    runIfActive()
    start()
  }

  const handleOffline = () => {
    stop()
  }

  if (typeof document !== 'undefined') {
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', handleVisibility)
  } else {
    start()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  return () => {
    stop()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }
}
